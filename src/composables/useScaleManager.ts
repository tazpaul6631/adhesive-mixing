import { ref } from 'vue';
import { registerPlugin, WebPlugin } from '@capacitor/core';

// 1. CHUYỂN ĐỊNH NGHĨA PLUGIN VÀO ĐÂY ĐỂ ĐẢM BẢO CHỈ ĐĂNG KÝ 1 LẦN
class SerialScaleWeb extends WebPlugin {
  private port: any = null;
  private reader: any = null;
  async connect() {
    this.port = await (navigator as any).serial.requestPort();
    await this.port.open({ baudRate: 9600 });
    this.readLoop();
    return { value: 'connected' };
  }
  async readLoop() {
    while (this.port?.readable) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          this.notifyListeners('onScaleData', { data: new TextDecoder().decode(value) });
        }
      } catch (e) {
        this.notifyListeners('onScaleError', { error: e });
      } finally {
        if (this.reader) this.reader.releaseLock();
      }
    }
  }
  async disconnect() {
    if (this.reader) {
      await this.reader.cancel().catch(() => { });
    }
    if (this.port) {
      await this.port.close().catch(() => { });
    }
  }
}

const SerialScale = registerPlugin<any>('SerialScale', {
  web: () => new SerialScaleWeb(),
});

// 2. STATE GLOBAL: Khai báo NGOÀI function để giữ trạng thái duy nhất trên toàn app
const globalWeight = ref('0.000');
const isGlobalConnected = ref(false);
const isGlobalStable = ref(false);

let dataListener: any = null;
let watchdog: any = null;
let autoConnectInterval: any = null;
let dataBuffer = '';

export function useScaleManager() {

  // Hàm ép buộc ngắt kết nối phần cứng khi cân bị tắt
  const forceDisconnect = async () => {
    isGlobalConnected.value = false;
    isGlobalStable.value = false;
    try {
      if (dataListener) {
        await dataListener.remove();
        dataListener = null;
      }
      await SerialScale.disconnect(); // Ép hệ điều hành nhả Port
    } catch (e) {
      console.error("Lỗi ngắt kết nối:", e);
    }
  };

  const connectToScale = async () => {
    if (isGlobalConnected.value) return;

    try {
      // Dọn dẹp listener cũ trước khi tạo mới
      if (dataListener) await forceDisconnect();

      dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
        if (!isGlobalConnected.value) isGlobalConnected.value = true;

        // WATCHDOG: Nếu sau 2s không có dữ liệu -> Cân đã bị tắt -> Ép ngắt kết nối
        clearTimeout(watchdog);
        watchdog = setTimeout(() => {
          forceDisconnect();
        }, 2000);

        // --- GIỮ NGUYÊN 100% LOGIC BÓC TÁCH CHUỖI CỦA BẠN ---
        let raw = result.data;
        let cleanRaw = "";
        if (raw.length > 15) {
          for (let i = 0; i < raw.length; i += 3) cleanRaw += raw[i];
        } else {
          cleanRaw = raw;
        }

        dataBuffer += cleanRaw;

        if (dataBuffer.includes('\n') || dataBuffer.includes('\r')) {
          const line = dataBuffer.trim();
          const upperLine = line.toUpperCase();

          isGlobalStable.value = upperLine.includes("ST") || !upperLine.includes("US");

          const matches = line.match(/[-+]?\d*\.?\d+/);
          if (matches) {
            let rawValue = parseFloat(matches[0]);
            const lowerLine = line.toLowerCase();
            if (!lowerLine.includes('kg') && lowerLine.includes('g')) {
              rawValue = rawValue / 1000;
            }

            const val = rawValue.toFixed(3);
            if (globalWeight.value !== val) {
              globalWeight.value = val;
            }
          }
          dataBuffer = '';
        }
      });

      await SerialScale.connect();
      isGlobalConnected.value = true;
    } catch (e: any) {
      await forceDisconnect();
    }
  };

  const startAutoConnect = () => {
    connectToScale();
    if (!autoConnectInterval) {
      autoConnectInterval = setInterval(() => {
        // Chỉ cố gắng kết nối lại nếu đang bị mất kết nối
        if (!isGlobalConnected.value) connectToScale();
      }, 3000);
    }
  };

  const stopAutoConnect = () => {
    clearInterval(autoConnectInterval);
    autoConnectInterval = null;
    clearTimeout(watchdog);
    forceDisconnect();
  };

  return {
    globalWeight,
    isGlobalConnected,
    isGlobalStable,
    startAutoConnect,
    stopAutoConnect
  };
}