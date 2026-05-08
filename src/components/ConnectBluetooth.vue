<template>
  <div class="flex align-items-center gap-2">
    <!-- Khu vực nút Kết nối -->
    <Button v-if="status === 'disconnected'" label="Bật & Kết nối B300" icon="pi pi-bluetooth" severity="primary"
      @click="turnOnAndScan" />
    <Button v-else-if="status === 'connecting'" label="Đang kết nối..." icon="pi pi-spin pi-spinner" severity="warning"
      disabled />
    <Button v-else-if="status === 'connected'" :label="'Đã kết nối máy in'" icon="pi pi-check-circle" severity="success"
      @click="disconnect" />

    <!-- Select chọn máy in (Chỉ hiện khi chưa kết nối và đã quét thấy thiết bị) -->
    <select v-if="status === 'disconnected' && pairedDevices.length > 0" v-model="selectedMac" @change="saveAndConnect"
      class="p-dropdown p-component p-inputtext ml-2" style="max-width: 150px;">
      <option value="" disabled>Chọn máy in</option>
      <option v-for="device in pairedDevices" :key="device.address" :value="device.address">
        {{ device.name || 'Unknown' }}
      </option>
    </select>

    <!-- Nút In -->
    <Button :label="isPrinting ? 'Đang in...' : 'In Mã QR'" icon="pi pi-print" outlined size="large" @click="printLabel"
      :disabled="status !== 'connected' || !printData || isPrinting" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Button } from 'primevue';
import { Preferences } from '@capacitor/preferences';
import format from '@/mixins/format';

const props = defineProps<{
  templateType?: string;
  printData?: any;
}>();

const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const pairedDevices = ref<any[]>([]);
const selectedMac = ref<string>('');
const isPrinting = ref(false);

// --- 1. Xử lý Bật Bluetooth & Quét thiết bị ---
const turnOnAndScan = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt) return console.error("Plugin bluetoothSerial chưa load.");

  bt.enable(
    () => {
      console.log("Bluetooth đã bật!");
      // Sau khi bật, tìm các thiết bị đã ghép đôi
      bt.list((devices: any[]) => {
        pairedDevices.value = devices;
        if (devices.length === 0) alert("Không tìm thấy máy in nào đã ghép đôi trong cài đặt Bluetooth.");
      }, (err: any) => console.error("Lỗi quét:", err));
    },
    (err: any) => {
      console.log("Lỗi bật Bluetooth:", err);
      bt.showBluetoothSettings();
    }
  );
};

// --- 2. Kết nối tới MAC đã chọn ---
const connectToDevice = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt || !selectedMac.value) return;

  status.value = 'connecting';
  bt.connect(selectedMac.value,
    () => {
      status.value = 'connected';
      console.log("MÁY IN ĐÃ SẴN SÀNG.");
    },
    (err: any) => {
      status.value = 'disconnected';
      console.error("Kết nối thất bại:", err);
      alert("Kết nối máy in thất bại. Vui lòng thử lại!");
    }
  );
};

// --- 3. Lưu MAC và kết nối (Dùng khi user chọn từ Dropdown) ---
const saveAndConnect = async () => {
  if (!selectedMac.value) return;
  await Preferences.set({ key: 'SAVED_PRINTER_MAC', value: selectedMac.value });
  connectToDevice();
};

// --- 4. Ngắt kết nối (Tuỳ chọn) ---
const disconnect = () => {
  const bt = (window as any).bluetoothSerial;
  if (bt) {
    bt.disconnect(() => {
      status.value = 'disconnected';
      console.log("Đã ngắt kết nối.");
    });
  }
};

// --- 5. Tự động kết nối khi mở App ---
onMounted(async () => {
  const { value } = await Preferences.get({ key: 'SAVED_PRINTER_MAC' });
  if (value) {
    selectedMac.value = value;
    // Đợi plugin cordova sẵn sàng rồi mới gọi connect
    setTimeout(connectToDevice, 1000);
  }
});

onUnmounted(() => {
  disconnect();
});

// --- 6. Logic In TSPL ---
const printLabel = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt || status.value !== 'connected') return alert("Máy in chưa sẵn sàng!");
  if (!props.printData) return alert("Vui lòng chọn 1 dòng dữ liệu dưới bảng để in!");

  isPrinting.value = true;
  const formattedDate = format.formatDate(new Date().toISOString());
  let tspl = '';

  if (props.templateType === 'mix_glue') {
    const { donDieuCong, hinhThe, keo } = props.printData;
    const qrData = `${donDieuCong}|${hinhThe}|${keo}`;

    tspl = `
SIZE 80 mm, 50 mm
GAP 0 mm, 0 mm
DIRECTION 1
CODEPAGE UTF-8
CLS
BOX 16,16,624,384,4
TEXT 40,40,"ARIAL.TTF",0,12,12,"Đơn: ${donDieuCong || ''}"
TEXT 40,90,"ARIAL.TTF",0,12,12,"Hình thể: ${hinhThe || ''}"
TEXT 40,140,"ARIAL.TTF",0,12,12,"Keo: ${keo || ''}"
TEXT 40,340,"ARIAL.TTF",0,10,10,"Ngày in: ${formattedDate}"
QRCODE 450,40,H,5,A,0,"${qrData}"
PRINT 1,1
`;
  } else if (props.templateType === 'repacking') {
    const { xuong, donDieuCong, dayChuyen } = props.printData;
    const qrData = `${xuong}|${donDieuCong}|${dayChuyen}`;

    tspl = `
SIZE 80 mm, 50 mm
GAP 0 mm, 0 mm
DIRECTION 1
CODEPAGE UTF-8
CLS
BOX 16,16,624,384,4
TEXT 40,40,"ARIAL.TTF",0,14,14,"Xưởng: ${xuong || ''}"
TEXT 40,100,"ARIAL.TTF",0,14,14,"Đơn: ${donDieuCong || ''}"
TEXT 40,160,"ARIAL.TTF",0,14,14,"Chuyền: ${dayChuyen || ''}"
QRCODE 450,40,H,6,A,0,"${qrData}"
PRINT 1,1
`;
  }

  if (!tspl) {
    alert("Lỗi mẫu tem!");
    isPrinting.value = false;
    return;
  }

  const dataArray = new TextEncoder().encode(tspl);
  bt.write(dataArray.buffer, () => {
    console.log(`Đã in thành công mẫu: ${props.templateType}`);
    isPrinting.value = false;
  }, (err: any) => {
    console.log("Lỗi in: " + JSON.stringify(err));
    status.value = 'disconnected';
    isPrinting.value = false;
  });
};
</script>