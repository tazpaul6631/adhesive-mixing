<template>
    <div class="printer-container">
        <div v-if="status === 'disconnected'" class="error-banner warning-banner">
            CHƯA KẾT NỐI MÁY IN B300
        </div>
        <div v-else-if="status === 'connecting'" class="error-banner connecting-banner">
            ĐANG KẾT NỐI: {{ selectedMac }}...
        </div>
        <div v-else-if="status === 'connected'" class="error-banner success-banner">
            ĐÃ KẾT NỐI MÁY IN: {{ selectedMac }}
        </div>

        <div class="control-area">
            <div class="printer-selector mb-10" v-if="status === 'disconnected'">
                <ion-button expand="block" color="light" @click="scanPairedDevices">
                    1. TÌM MÁY IN ĐÃ GHÉP NỐI
                </ion-button>

                <select v-model="selectedMac" class="native-select" @change="saveAndConnect">
                    <option value="" disabled>2. Chọn máy in B300</option>
                    <option v-for="device in pairedDevices" :key="device.address" :value="device.address">
                        {{ device.name || 'Unknown' }} ({{ device.address }})
                    </option>
                </select>
            </div>

            <ion-button v-if="status === 'disconnected' && selectedMac" expand="block" color="warning" @click="connect"
                class="mb-10">
                KẾT NỐI LẠI VỚI MÁY ĐÃ CHỌN
            </ion-button>

            <ion-button expand="block" color="success" class="confirm-btn mb-10"
                :disabled="status !== 'connected' || isPrinting" @click="printLabel">
                <ion-icon slot="start" :icon="printOutline"></ion-icon>
                {{ isPrinting ? 'ĐANG IN...' : 'IN TEM BLUETOOTH' }}
            </ion-button>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { IonButton } from '@ionic/vue';
import { Preferences } from '@capacitor/preferences';
import format from '@/mixins/format';
import { printOutline } from 'ionicons/icons';

const props = defineProps<{
    templateType: 'chemical' | 'model'; // Khai báo các loại tem bạn có
    printData: Record<string, any>;     // Object chứa data truyền vào
    disabledPrint?: boolean;
}>();

const emit = defineEmits(['log']);

// --- State ---
const pairedDevices = ref<any[]>([]);
const selectedMac = ref<string>('');
const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const isPrinting = ref(false);

const addLog = (msg: string) => emit('log', msg);

// --- Logic kết nối ---
const scanPairedDevices = () => {
    const bt = (window as any).bluetoothSerial;
    const permissions = (window as any).cordova?.plugins?.permissions;

    if (!bt) return addLog("Plugin Bluetooth chưa load.");
    if (!permissions) return addLog("Plugin Permissions chưa load.");

    // Danh sách quyền cho Android 12+
    const list = [
        permissions.BLUETOOTH_CONNECT,
        permissions.BLUETOOTH_SCAN
    ];

    permissions.requestPermissions(list, (res: any) => {
        if (res.hasPermission) {
            bt.list((devices: any[]) => {
                pairedDevices.value = devices;
                addLog(`Tìm thấy ${devices.length} thiết bị đã ghép đôi.`);
            }, (err: any) => addLog("Lỗi quét: " + err));
        } else {
            addLog("Bạn chưa cấp quyền Bluetooth cho ứng dụng.");
        }
    }, () => addLog("Lỗi khi yêu cầu quyền."));
};

const connect = () => {
    const bt = (window as any).bluetoothSerial;
    if (!bt || !selectedMac.value) return;

    status.value = 'connecting';
    bt.connect(selectedMac.value, () => {
        status.value = 'connected';
        addLog("MÁY IN ĐÃ SẴN SÀNG.");
    }, (err: any) => {
        status.value = 'disconnected';
        addLog("Kết nối thất bại. Kiểm tra máy in!");
    });
};

const saveAndConnect = async () => {
    if (!selectedMac.value) return;
    await Preferences.set({ key: 'SAVED_PRINTER_MAC', value: selectedMac.value });
    connect();
};

// --- Logic In ---
const printLabel = () => {
    const bt = (window as any).bluetoothSerial;
    if (!bt || status.value !== 'connected') return addLog("Máy in chưa sẵn sàng!");

    isPrinting.value = true;
    const formattedDate = format.formatDate(new Date().toISOString());
    let tspl = '';

    // --- TEMPLATE 1: TEM HÓA CHẤT ---
    if (props.templateType === 'chemical') {
        const { xuong, chuyen, tenHoaChat, thanhPhan, hieuLuc } = props.printData;
        const qrData = `${xuong}|${chuyen}|${tenHoaChat}|${thanhPhan}`;

        tspl = `
SIZE 80 mm, 50 mm
GAP 0 mm, 0 mm
DIRECTION 1
CODEPAGE UTF-8
CLS
BOX 16,16,624,384,4
TEXT 40,40,"ARIAL.TTF",0,12,12,"廠區 Xưởng: ${xuong || ''}"
TEXT 40,90,"ARIAL.TTF",0,12,12,"線別 Chuyền: ${chuyen || ''}"
TEXT 40,140,"ARIAL.TTF",0,12,12,"化學品名稱 Tên hóa chất: ${tenHoaChat || ''}"
TEXT 40,190,"ARIAL.TTF",0,12,12,"成分 Thành phần: ${thanhPhan || ''}"
TEXT 40,240,"ARIAL.TTF",0,12,12,"有效時間 Thời gian hiệu lực: ${hieuLuc || ''}"
TEXT 40,340,"ARIAL.TTF",0,10,10,"Ngày in: ${formattedDate}"
QRCODE 450,40,H,5,A,0,"${qrData}"
PRINT 1,1
`;
    }
    // --- TEMPLATE 2: TEM HÌNH THỂ (Mẫu thứ 2 của bạn) ---
    else if (props.templateType === 'model') {
        const { hinhThe, hieuLucTu, hieuLucDen } = props.printData;
        const qrData = `${hinhThe}|${hieuLucTu}|${hieuLucDen}`;

        tspl = `
SIZE 80 mm, 50 mm
GAP 0 mm, 0 mm
DIRECTION 1
CODEPAGE UTF-8
CLS
BOX 16,16,624,384,4
TEXT 40,50,"ARIAL.TTF",0,14,14,"型體名稱 Hình thể: ${hinhThe || ''}"
TEXT 40,120,"ARIAL.TTF",0,14,14,"效期開始 Hiệu lực từ: ${hieuLucTu || ''}"
TEXT 40,190,"ARIAL.TTF",0,14,14,"效期結束 Hiệu lực đến: ${hieuLucDen || ''}"
QRCODE 450,50,H,6,A,0,"${qrData}"
PRINT 1,1
`;
    }

    // Gửi lệnh in
    if (!tspl) {
        addLog("Lỗi: Không tìm thấy mẫu tem phù hợp!");
        isPrinting.value = false;
        return;
    }

    const dataArray = new TextEncoder().encode(tspl);
    bt.write(dataArray.buffer, () => {
        addLog(`Đã in thành công mẫu: ${props.templateType}`);
        isPrinting.value = false;
    }, (err: any) => {
        addLog("Lỗi in: " + JSON.stringify(err));
        isPrinting.value = false;
        status.value = 'disconnected';
    });
};

onMounted(async () => {
    const { value } = await Preferences.get({ key: 'SAVED_PRINTER_MAC' });
    if (value) {
        selectedMac.value = value;
        // Delay một chút để plugin kịp load
        setTimeout(connect, 1000);
    }
});

onUnmounted(() => {
    const bt = (window as any).bluetoothSerial;
    if (bt) bt.disconnect();
});
</script>

<style scoped>
.error-banner {
    padding: 10px;
    text-align: center;
    border-radius: 8px;
    margin-bottom: 10px;
    font-weight: bold;
    color: white;
}

.warning-banner {
    background: #ffc409;
    color: black;
}

.connecting-banner {
    background: #3880ff;
}

.success-banner {
    background: #2dd36f;
}

.native-select {
    width: 100%;
    padding: 12px;
    border-radius: 8px;
    margin-top: 5px;
    background: white;
    border: 1px solid #ddd;
    color: #333;
}

.mb-10 {
    margin-bottom: 10px;
}
</style>