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
    <Button :label="isPrinting ? 'Đang in...' : 'Xác nhận hoàn thành'" icon="pi pi-print" outlined size="large"
      @click="printLabel" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { Button } from 'primevue';
import { Preferences } from '@capacitor/preferences';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import mixGlue from '@/api/mixGlue';
import router from '@/router';

const props = defineProps<{
  templateType?: string;
  printData?: any;
}>();

const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const pairedDevices = ref<any[]>([]);
const selectedMac = ref<string>('');
const isPrinting = ref(false);
const authStore = useAuthStore();

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
const printLabel = async () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt || status.value !== 'connected') return alert("Máy in chưa sẵn sàng!");
  if (!props.printData) return alert("Không tìm thấy dữ liệu để in!");

  isPrinting.value = true;
  let tspl = '';

  try {
    if (props.templateType === 'mix_glue') {
      const { workOrderMasterId, mixGlueMasterId } = props.printData;

      const payload = {
        factoryId: authStore.user?.factoryId,
        workOrderMasterId: workOrderMasterId,
        mixGlueMasterId: mixGlueMasterId
      };

      const response = await mixGlue.postMixGlueConfirm(payload);

      if (response.data?.success) {
        const { styleName, startDate, endDate, domainApi, action } = response.data.data;

        const formattedStart = format.formatDate(startDate);
        const formattedEnd = format.formatDate(endDate);

        // 1. Khởi tạo TSPL với tọa độ chuẩn y như bản in Test của bạn
        tspl = `
SIZE 75 mm, 50 mm
GAP 0 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 10,40,H,4,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}/${workOrderMasterId}"
TEXT 200,100,"ARIAL.TTF",0,12,12,"Từ: ${formattedStart}"
TEXT 200,150,"ARIAL.TTF",0,12,12,"Đến: ${formattedEnd}"
`;

        // 2. Thuật toán gom dòng cho Hình thể
        const styles = styleName ? styleName.split(',').map((s: string) => s.trim()) : [];
        const MAX_CHARS_PER_LINE = 30; // Số ký tự tối đa trên 1 dòng
        const MAX_LINES = 3;           // Chỉ cho phép in tối đa 3 dòng hình thể

        let lines: string[] = [];
        let currentLine = "";

        // Chạy vòng lặp để ghép các hình thể lại
        styles.forEach((style: string) => {
          let testLine = currentLine.length === 0 ? style : `${currentLine}, ${style}`;
          if (testLine.length > MAX_CHARS_PER_LINE) {
            lines.push(currentLine);
            currentLine = style;
          } else {
            currentLine = testLine;
          }
        });
        if (currentLine) lines.push(currentLine);

        // 3. Xử lý giới hạn dòng
        if (lines.length > MAX_LINES) {
          lines = lines.slice(0, MAX_LINES);
          // Thêm dấu 3 chấm vào dòng cuối cùng để báo hiệu văn bản bị cắt
          lines[MAX_LINES - 1] = lines[MAX_LINES - 1] + " ...";
        }

        // 4. In các dòng hình thể ra (Bắt đầu từ Y = 230, X = 10 y như bản test)
        let currentY = 230;
        lines.forEach((lineText: string, index: number) => {
          const prefix = index === 0 ? "Hình thể: " : "          "; // Thụt lề 10 khoảng trắng cho dòng dưới
          tspl += `TEXT 10,${currentY},"ARIAL.TTF",0,12,12,"${prefix}${lineText}"\n`;
          currentY += 40; // Khoảng cách giữa các dòng là 40 (230 -> 270 -> 310)
        });

        // 5. Kết thúc lệnh in
        tspl += `PRINT 1,1\n`;

      } else {
        alert(`Lỗi API: ${response.data?.message}`);
        isPrinting.value = false;
        return;
      }
    }
    //     else if (props.templateType === 'repacking') {
    //       const { xuong, donDieuCong, dayChuyen } = props.printData;
    //       const qrData = `${xuong}|${donDieuCong}|${dayChuyen}`;

    //       tspl = `
    // SIZE 75 mm, 50 mm
    // GAP 2 mm, 0 mm
    // REFERENCE 0,0
    // DIRECTION 1
    // CODEPAGE UTF-8
    // CLS
    // BOX 16,16,584,384,4
    // TEXT 40,40,"ARIAL.TTF",0,14,14,"Xưởng: ${xuong || ''}"
    // TEXT 40,100,"ARIAL.TTF",0,14,14,"Đơn: ${donDieuCong || ''}"
    // TEXT 40,160,"ARIAL.TTF",0,14,14,"Chuyền: ${dayChuyen || ''}"
    // QRCODE 430,40,H,6,A,0,"${qrData}"
    // PRINT 1,1
    // `;
    //     }

    if (!tspl) {
      alert("Lỗi mẫu tem hoặc không có dữ liệu!");
      isPrinting.value = false;
      return;
    }

    // Gửi lệnh in qua Bluetooth
    const dataArray = new TextEncoder().encode(tspl);
    bt.write(dataArray.buffer, () => {
      console.log(`Đã in thành công mẫu: ${props.templateType}`);
      isPrinting.value = false;
      router.push('/list-qip-confirm-mix-glue');
    }, (err: any) => {
      console.log("Lỗi in: " + JSON.stringify(err));
      status.value = 'disconnected';
      isPrinting.value = false;
    });

  } catch (error) {
    console.error("Lỗi khi xử lý in:", error);
    alert("Đã xảy ra lỗi khi gọi API in. Vui lòng kiểm tra kết nối mạng!");
    isPrinting.value = false;
  }
};
</script>