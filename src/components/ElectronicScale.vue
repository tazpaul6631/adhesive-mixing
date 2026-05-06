<template>
  <div class="col-12 sm:col-7 lg:col-4 lg:mb-0">
    <label class="text-800 font-medium mb-2 block">
      Trọng lượng cân thực tế
      <span v-if="isConnected" class="text-green-500 font-normal text-sm ml-2">
        <i class="pi pi-check-circle"></i> Đã kết nối với cân
      </span>
      <span v-else class="text-red-500 font-normal text-sm ml-2 fade-blink">
        <i class="pi pi-spin pi-spinner"></i> Đang tìm kết nối...
      </span>
    </label>

    <div class="flex align-items-center">
      <div class="p-inputgroup">
        <InputText v-model="mixingProcess.weight" readonly class="text-right font-bold text-primary bg-white"
          :class="{ 'border-green-500': isStable && isConnected }" />
        <span class="p-inputgroup-addon font-bold px-1">Kg</span>
      </div>
      <div class="ml-1 flex flex-column justify-content-center min-w-max border-left-1 border-300 pl-3">
        <div class="text-red-500 font-bold text-xs">-5 g</div>
        <div class="text-green-600 font-bold text-xs">+5 g</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { registerPlugin, WebPlugin, Capacitor } from '@capacitor/core';

// --- KẾT NỐI VỚI COMPONENT CHA ---
const emit = defineEmits(['update:weight', 'connection-status']);

// --- STATE ---
const mixingProcess = ref({
  weight: '0.000'
});
const isConnected = ref(false);
const isStable = ref(false);

// Các biến lưu trữ nội bộ cho logic cân
let dataBuffer = '';
let dataListener: any = null;
let watchdog: any = null;
let autoConnectInterval: any = null;

// --- PLUGIN CONFIG ---
const SerialScale = registerPlugin<any>('SerialScale', {
  web: () => new SerialScaleWeb(),
});

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
    while (this.port.readable) {
      this.reader = this.port.readable.getReader();
      try {
        while (true) {
          const { value, done } = await this.reader.read();
          if (done) break;
          this.notifyListeners('onScaleData', { data: new TextDecoder().decode(value) });
        }
      } catch (e) { this.notifyListeners('onScaleError', { error: e }); }
      finally { this.reader.releaseLock(); }
    }
  }
  async disconnect() {
    if (this.reader) await this.reader.cancel();
    if (this.port) await this.port.close();
  }
}

// --- CORE LOGIC ---
const setDisconnected = () => {
  if (isConnected.value) {
    isConnected.value = false;
    emit('connection-status', false); // Báo ra cha là mất kết nối
  }
  isStable.value = false;
  mixingProcess.value.weight = '0.000';
  emit('update:weight', '0.000');
};

const connectToScale = async () => {
  // Nếu đang kết nối rồi thì không làm gì cả để tránh gọi API liên tục
  if (isConnected.value) return;

  try {
    if (dataListener) await dataListener.remove();

    dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
      // 1. Kick watchdog & Cập nhật trạng thái kết nối
      if (!isConnected.value) {
        isConnected.value = true;
        emit('connection-status', true); // Emit báo cha biết đã kết nối
      }
      clearTimeout(watchdog);
      watchdog = setTimeout(() => setDisconnected(), 2000); // Mất data 2s -> ngắt

      let raw = result.data;

      // 2. Lọc chuỗi dữ liệu rác
      let cleanRaw = "";
      if (raw.length > 15) {
        for (let i = 0; i < raw.length; i += 3) cleanRaw += raw[i];
      } else { cleanRaw = raw; }

      dataBuffer += cleanRaw;

      // 3. Phân tích chuỗi khi nhận đủ dòng
      if (dataBuffer.includes('\n') || dataBuffer.includes('\r')) {
        const line = dataBuffer.trim();

        // Kiểm tra tính ổn định (ST/US)
        const newStable = line.startsWith("ST");
        if (isStable.value !== newStable) isStable.value = newStable;

        // Trích xuất số
        const matches = line.match(/[-+]?\d*\.?\d+/);
        if (matches) {
          let rawValue = parseFloat(matches[0]);
          const lowerLine = line.toLowerCase();

          // Xử lý đơn vị
          if (!lowerLine.includes('kg') && lowerLine.includes('g')) {
            rawValue = rawValue / 1000;
          }

          const val = rawValue.toFixed(3);

          // Chỉ cập nhật và emit nếu số thực sự thay đổi
          if (mixingProcess.value.weight !== val) {
            mixingProcess.value.weight = val;
            emit('update:weight', val); // Trả dữ liệu cân ra page cha
          }
        }
        dataBuffer = '';
      }
    });

    await SerialScale.connect();
    isConnected.value = true;
    emit('connection-status', true);

  } catch (e: any) {
    setDisconnected();
  }
};

// Hàm bắt đầu vòng lặp tự động kết nối
const startAutoConnect = () => {
  connectToScale();
  // Cứ mỗi 3 giây kiểm tra lại, nếu rớt kết nối thì gọi lại hàm connect
  autoConnectInterval = setInterval(() => {
    if (!isConnected.value) {
      connectToScale();
    }
  }, 3000);
};

onMounted(() => {
  // Tự động quét và kết nối ngay khi component render
  if (Capacitor.getPlatform() === 'android') {
    setTimeout(() => startAutoConnect(), 500);
  } else {
    // Vẫn chạy tự động kết nối trên web (cho mục đích giả lập/test)
    setTimeout(() => startAutoConnect(), 500);
  }
});

onUnmounted(async () => {
  clearTimeout(watchdog);
  clearInterval(autoConnectInterval);
  if (dataListener) await dataListener.remove();
  try { await SerialScale.disconnect(); } catch (e) { }
});
</script>

<style scoped>
.fade-blink {
  animation: fadeBlink 1.5s infinite;
}

@keyframes fadeBlink {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

/* Thêm màu viền xanh khi số đã đứng yên (stable) */
.border-green-500 {
  border-color: #22c55e !important;
  transition: border-color 0.3s ease;
}
</style>