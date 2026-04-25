<template>
  <ion-page>
    <ion-content>
      <ion-header class="header-container">
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-back-button default-href="/app-menu"></ion-back-button>
          </ion-buttons>
          <ion-title>Tablet</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="main-container">

        <div v-if="!isConnected" class="error-banner">
          MẤT KẾT NỐI VỚI CÂN - KIỂM TRA DÂY CÁP
        </div>

        <div class="weight-card">

          <div class="weight-display">
            <span class="value">{{ currentWeight }}</span>
            <span class="unit">kg</span>
          </div>
        </div>

        <div class="control-area">
          <ion-button v-if="!isConnected" expand="block" color="danger" @click="connectToScale">
            THỬ KẾT NỐI LẠI NGAY
          </ion-button>
        </div>

        <div class="mini-logs">
          <div v-for="(log, i) in logs" :key="i" class="log-item">{{ log }}</div>
        </div>

        <Print :weight="currentWeight" :disabled-print="!isStable" @log="addLog" />
      </div>
    </ion-content>
  </ion-page>
</template>
<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import {
  IonPage, IonContent, IonButton, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle
} from '@ionic/vue';
import { registerPlugin, WebPlugin, Capacitor } from '@capacitor/core';
import Print from './Print.vue';

// --- PLUGIN CONFIG ---
const SerialScale = registerPlugin<any>('SerialScale', {
  web: () => new SerialScaleWeb(),
});

// --- STATE ---
const currentWeight = ref<string>('0.000');
const isConnected = ref(false);
const isStable = ref(false);
const logs = ref<string[]>([]);
let dataBuffer = '';
let dataListener: any = null;
let watchdog: any = null;

// --- WEB SERIAL FALLBACK ---
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

// --- UTILS ---
const addLog = (msg: string) => {
  logs.value.unshift(`[${new Date().toLocaleTimeString()}] ${msg}`);
  if (logs.value.length > 20) logs.value.pop();
};

// Hàm reset trạng thái khi mất kết nối
const setDisconnected = () => {
  isConnected.value = false;
  isStable.value = false;
  currentWeight.value = '0.000';
};

// --- CORE LOGIC ---
const connectToScale = async () => {
  try {
    // Xóa listener cũ nếu có
    if (dataListener) await dataListener.remove();

    dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
      // 1. Kick cái watchdog: Có data là còn sống
      isConnected.value = true;
      clearTimeout(watchdog);
      watchdog = setTimeout(() => setDisconnected(), 2000); // 2 giây ko có data = mất kết nối

      let raw = result.data;

      // 2. Khử nhiễu "nói lắp" thông minh (Chỉ lấy ký tự đầu trong cụm 3)
      let cleanRaw = "";
      if (raw.length > 15) {
        for (let i = 0; i < raw.length; i += 3) cleanRaw += raw[i];
      } else { cleanRaw = raw; }

      dataBuffer += cleanRaw;

      // 3. Xử lý khi đủ dòng
      if (dataBuffer.includes('\n') || dataBuffer.includes('\r')) {
        const line = dataBuffer.trim();

        // Kiểm tra ST (Stable) / US (Unstable)
        // Chèn thêm một chút delay nhỏ để tránh isStable chớp quá nhanh
        const newStable = line.startsWith("ST");
        if (isStable.value !== newStable) isStable.value = newStable;

        const matches = line.match(/[-+]?\d*\.?\d+/);
        if (matches) {
          const val = parseFloat(matches[0]).toFixed(3);
          // Chỉ cập nhật nếu số thực sự thay đổi để tránh UI Re-render thừa
          if (currentWeight.value !== val) currentWeight.value = val;
        }
        dataBuffer = '';
      }
    });

    await SerialScale.connect();
    addLog("Đã kết nối thiết bị.");
  } catch (e: any) {
    addLog("Lỗi: " + e.message);
    setDisconnected();
  }
};

onMounted(() => {
  if (Capacitor.getPlatform() === 'android') {
    setTimeout(() => connectToScale(), 1000);
  }
});

onUnmounted(async () => {
  clearTimeout(watchdog);
  if (dataListener) await dataListener.remove();
  try { await SerialScale.disconnect(); } catch (e) { }
});
</script>

<style scoped>
.gray-bg {
  --background: #f0f2f5;
}

.main-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
  height: 100%;
  padding: 20px 10px;
}

.error-banner {
  background: #eb445a;
  color: white;
  padding: 10px;
  text-align: center;
  border-radius: 8px;
  font-weight: bold;
  animation: pulse 2s infinite;
}

.weight-card {
  background: #ffffff;
  border-radius: 24px;
  padding: 40px 20px;
  text-align: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.05);
  border: 4px solid transparent;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

/* Hiệu ứng khi số đứng yên: Viền xanh rực rỡ */
.is-stable {
  border-color: #2dd36f;
  background: #f6fff9;
}

.label-box {
  font-weight: bold;
  color: #888;
  font-size: 0.9rem;
  margin-bottom: 10px;
}

.is-stable .label-box {
  color: #28a745;
}

.weight-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
}

.value {
  font-size: 7rem;
  font-weight: 800;
  color: #333;
  font-family: 'Courier New', monospace;
  /* Font số điện tử */
}

.is-stable .value {
  color: #2dd36f;
}

.unit {
  font-size: 2rem;
  color: #999;
  margin-left: 15px;
  font-weight: bold;
}

.confirm-btn {
  height: 70px;
  font-size: 1.4rem;
  font-weight: bold;
  --border-radius: 16px;
}

.mini-logs {
  background: #fff;
  padding: 10px;
  border-radius: 12px;
  flex: 1;
  overflow-y: auto;
  font-size: 0.7rem;
  color: #999;
  border: 1px solid #eee;
}

.log-item {
  border-bottom: 1px solid #f9f9f9;
  padding: 3px 0;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}
</style>