<template>
    <div class="scale-status-container">
        <div :class="['status-badge', isConnected ? 'online' : 'offline']">
            {{ isConnected ? '● CÂN ĐÃ KẾT NỐI' : '○ MẤT KẾT NỐI CÂN' }}
        </div>

        <ion-button v-if="!isConnected" size="small" color="warning" @click="connect">
            THỬ KẾT NỐI LẠI
        </ion-button>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IonButton } from '@ionic/vue';

const props = defineProps<{
    baudRate?: number;
}>();

const emit = defineEmits(['update:weight', 'update:stable', 'log']);

const isConnected = ref(false);
let dataBuffer = '';
let watchdog: any = null;

// --- CẤU HÌNH CHO CÂN TBED ---
// Thông thường TBED mặc định là 9600, N, 8, 1
const BAUD_RATE = props.baudRate || 9600;

const addLog = (msg: string) => emit('log', msg);

const connect = () => {
    const serial = (window as any).serial;
    if (!serial) {
        addLog("Plugin Serial chưa sẵn sàng.");
        return;
    }

    serial.requestPermission((res: any) => {
        addLog("Đang xin quyền truy cập USB...");

        serial.open({
            baudRate: BAUD_RATE,
            dataBits: 8,
            stopBits: 1,
            parity: 0,
            dtr: true,
            rts: true
        }, () => {
            isConnected.value = true;
            addLog("Đã mở cổng Serial thành công.");

            // Bắt đầu đọc dữ liệu
            serial.registerReadCallback((data: ArrayBuffer) => {
                isConnected.value = true;
                clearTimeout(watchdog);
                watchdog = setTimeout(() => isConnected.value = false, 2000);

                const view = new Uint8Array(data);
                const str = new TextDecoder().decode(view);
                parseData(str);
            }, (err: any) => addLog("Lỗi đọc: " + err));

        }, (err: any) => addLog("Lỗi mở cổng: " + err));
    }, (err: any) => addLog("Người dùng từ chối quyền USB."));
};

const parseData = (rawStr: string) => {
    dataBuffer += rawStr;

    // Dòng TBED thường gửi chuỗi kết thúc bằng \r\n
    if (dataBuffer.includes('\n')) {
        const lines = dataBuffer.split('\n');
        const lastCompleteLine = lines[lines.length - 2]; // Lấy dòng vừa hoàn thành
        dataBuffer = lines[lines.length - 1]; // Giữ lại phần dở dang

        if (lastCompleteLine) {
            processLine(lastCompleteLine.trim());
        }
    }
};

const processLine = (line: string) => {
    /* Định dạng dòng TBED thường có dạng: "ST,GS,  0.000kg" hoặc "US,GS,  0.125kg"
      ST = Stable (Ổn định), US = Unstable (Đang nhảy số)
    */
    const isStable = line.includes('ST');
    emit('update:stable', isStable);

    // Tìm số trong chuỗi (ví dụ: lấy 0.000)
    const matches = line.match(/[-+]?\d*\.?\d+/);
    if (matches) {
        emit('update:weight', matches[0]);
    }
};

onMounted(() => {
    // Delay 1s để cordova load xong
    setTimeout(connect, 1000);
});

onUnmounted(() => {
    const serial = (window as any).serial;
    if (serial) serial.close();
    clearTimeout(watchdog);
});
</script>

<style scoped>
.scale-status-container {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 10px;
    background: #f4f4f4;
    border-radius: 8px;
}

.status-badge {
    font-weight: bold;
    font-size: 0.8rem;
}

.online {
    color: #2dd36f;
}

.offline {
    color: #eb445a;
}
</style>