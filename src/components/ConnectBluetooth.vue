<template>
  <div class="flex align-items-center gap-2">
    <!-- Khu vực nút Kết nối -->
    <Button v-if="status === 'disconnected'" label="Bật & Kết nối B300" icon="pi pi-bluetooth" severity="primary"
      @click="turnOnAndScan" />

    <!-- SỬA Ở ĐÂY: Bỏ thuộc tính disabled, đổi thành nút Hủy -->
    <Button v-else-if="status === 'connecting'" label="Đang kết nối... (Bấm để Hủy)" icon="pi pi-spin pi-spinner"
      severity="warning" @click="cancelConnection" />

    <Button v-else-if="status === 'connected'" :label="'Đã kết nối máy in'" icon="pi pi-check-circle" severity="success"
      @click="disconnect" />

    <!-- Select chọn máy in -->
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
import { ref, onUnmounted } from 'vue';
import { Button } from 'primevue';
import { Preferences } from '@capacitor/preferences';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import mixGlue from '@/api/mixGlue';
import separateGlue from '@/api/separate';

const props = defineProps<{
  templateType?: string;
  printData?: any;
}>();

const status = ref<'disconnected' | 'connecting' | 'connected'>('disconnected');
const pairedDevices = ref<any[]>([]);
const selectedMac = ref<string>('');
const isPrinting = ref(false);
const authStore = useAuthStore();
let connectionTimeout: any = null;
let autoReconnectInterval: any = null;
let pendingInitTimer: ReturnType<typeof setTimeout> | null = null;
const emit = defineEmits(['printSuccess']);

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

// --- 2. Kết nối tới MAC đã chọn CÓ TIMEOUT ---
const connectToDevice = () => {
  const bt = (window as any).bluetoothSerial;
  if (!bt || !selectedMac.value) return;

  status.value = 'connecting';

  // Đặt Timeout 10 giây. Nếu 10 giây không kết nối được thì tự động ngắt
  clearTimeout(connectionTimeout);
  connectionTimeout = setTimeout(() => {
    if (status.value === 'connecting') {
      status.value = 'disconnected';
      alert("Kết nối quá thời gian. Máy in có thể đang tắt hoặc ở xa.");
    }
  }, 10000); // 10000ms = 10 giây

  bt.connect(selectedMac.value,
    () => {
      clearTimeout(connectionTimeout); // Hủy timeout nếu thành công
      status.value = 'connected';
      console.log("MÁY IN ĐÃ SẴN SÀNG.");
    },
    (err: any) => {
      clearTimeout(connectionTimeout); // Hủy timeout nếu thất bại
      status.value = 'disconnected';
      console.error("Kết nối thất bại:", err);
    }
  );
};

const cancelConnection = () => {
  status.value = 'disconnected';
  clearTimeout(connectionTimeout);

  const bt = (window as any).bluetoothSerial;
  if (bt) {
    // Bắn lệnh disconnect để giải phóng cổng bluetooth đang bị kẹt
    bt.disconnect(() => console.log("Đã hủy kết nối ngang."));
  }
};

// --- Cơ chế theo dõi và tự động kết nối lại ---
const startAutoReconnectWatchdog = () => {
  // Tránh việc tạo nhiều interval trùng lặp
  clearInterval(autoReconnectInterval);

  autoReconnectInterval = setInterval(() => {
    const bt = (window as any).bluetoothSerial;
    if (!bt) return;

    // Kiểm tra xem máy in thực tế còn kết nối không
    bt.isConnected(
      () => {
        // Vẫn đang kết nối ổn định -> Cập nhật UI cho chắc chắn
        if (status.value !== 'connected') status.value = 'connected';
      },
      () => {
        // Phát hiện rớt kết nối
        if (status.value === 'connected') {
          console.log("Phát hiện rớt kết nối Bluetooth!");
          status.value = 'disconnected';
        }

        // Tự động thử kết nối lại nếu:
        // 1. Trạng thái đang ngắt kết nối
        // 2. Đã có địa chỉ MAC lưu trước đó
        // 3. Bluetooth của điện thoại đang bật
        if (status.value === 'disconnected' && selectedMac.value) {
          bt.isEnabled(
            () => {
              console.log("Đang tự động thử kết nối lại...");
              connectToDevice();
            },
            () => {
              // Bluetooth điện thoại bị tắt, không làm gì cả
            }
          );
        }
      }
    );
  }, 5000); // Kiểm tra mỗi 5 giây (bạn có thể điều chỉnh 3000ms hoặc 5000ms)
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

// --- 5. Chỉ chạy khi parent gọi initBluetooth() (vd. onIonViewWillEnter). Không tự onMounted — tránh quét/kết nối khi không ở màn có máy in.
const initBluetooth = async () => {
  if (pendingInitTimer) {
    clearTimeout(pendingInitTimer);
    pendingInitTimer = null;
  }

  const { value } = await Preferences.get({ key: 'SAVED_PRINTER_MAC' });
  if (!value) return;

  selectedMac.value = value;

  pendingInitTimer = setTimeout(() => {
    pendingInitTimer = null;
    const bt = (window as any).bluetoothSerial;
    if (bt) {
      bt.isEnabled(
        () => {
          if (status.value !== 'connected') {
            connectToDevice();
          }
          startAutoReconnectWatchdog();
        },
        () => {
          console.log("Bluetooth đang tắt, tự động yêu cầu bật...");
          bt.enable(
            () => {
              console.log("Bluetooth đã được bật tự động.");
              connectToDevice();
              startAutoReconnectWatchdog();
            },
            (err: any) => {
              console.log("Người dùng từ chối bật Bluetooth hoặc có lỗi:", err);
            }
          );
        }
      );
    }
  }, 500);
};

const cleanupBluetooth = () => {
  clearTimeout(connectionTimeout);
  if (pendingInitTimer) {
    clearTimeout(pendingInitTimer);
    pendingInitTimer = null;
  }
  clearInterval(autoReconnectInterval);
  // disconnect(); // Tùy chọn: comment lại nếu muốn giữ kết nối khi đổi tab
};

onUnmounted(() => {
  cleanupBluetooth();
});

defineExpose({
  initBluetooth,
  cleanupBluetooth
});

// --- TSPL chữ đậm: TSC không có "font-weight"; dùng font đậm trong máy hoặc in 2 lớp lệch dot ---
const TSPL_FONT_REGULAR = 'ARIAL.TTF';
/** Đặt true nếu đã nạp font đậm (vd. ARIALBD.TTF) bằng TSC utilities — chỉ 1 lệnh TEXT. */
const USE_TSPL_BOLD_FONT_FILE = false;
const TSPL_FONT_BOLD = 'ARIALBD.TTF';
const TSPL_TEXT_XMUL = 13;
const TSPL_TEXT_YMUL = 13;
/** Khi không dùng font đậm: in lệnh TEXT lần 2 lệch N dot theo trục X để nét dày hơn. */
const TSPL_BOLD_SIM_OFFSET_DOTS = 2;

const tsplEscapeForQuote = (s: string) => String(s).replace(/"/g, "'");

/**
 * Trả về 1–2 dòng lệnh TEXT (đậm). Không áp dụng cho QRCODE.
 */
const tsplBoldText = (x: number, y: number, text: string, xMul = TSPL_TEXT_XMUL, yMul = TSPL_TEXT_YMUL) => {
  const inner = tsplEscapeForQuote(text);
  const font = USE_TSPL_BOLD_FONT_FILE ? TSPL_FONT_BOLD : TSPL_FONT_REGULAR;
  if (USE_TSPL_BOLD_FONT_FILE) {
    return `TEXT ${x},${y},"${font}",0,${xMul},${yMul},"${inner}"\n`;
  }
  return (
    `TEXT ${x},${y},"${font}",0,${xMul},${yMul},"${inner}"\n` +
    `TEXT ${x + TSPL_BOLD_SIM_OFFSET_DOTS},${y},"${font}",0,${xMul},${yMul},"${inner}"\n`
  );
};

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

        // 1. Khởi tạo TSPL: phần cố định + mã QR; chữ dùng tsplBoldText
        tspl = `
SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,40,H,3,A,0,"${domainApi}${action}/${payload.factoryId}/${mixGlueMasterId}/${workOrderMasterId}"
`;
        tspl += tsplBoldText(200, 80, 'Từ ngày:');
        tspl += tsplBoldText(200, 120, formattedStart);
        tspl += tsplBoldText(200, 160, 'Đến ngày:');
        tspl += tsplBoldText(200, 200, formattedEnd);

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
        let currentY = 240;
        lines.forEach((lineText: string, index: number) => {
          const prefix = index === 0 ? "Hình thể: " : "          "; // Thụt lề 10 khoảng trắng cho dòng dưới
          tspl += tsplBoldText(15, currentY, `${prefix}${lineText}`);
          currentY += 40; // Khoảng cách giữa các dòng là 50 (250 -> 300 -> 350)
        });

        // 5. Kết thúc lệnh in
        tspl += `PRINT 1,1\n`;

      } else {
        alert(`Lỗi API: ${response.data?.message}`);
        isPrinting.value = false;
        return;
      }
    }
    else if (props.templateType === 'separate') {
      const printData = props.printData;
      let response;
      let qrCodeParams = '';

      // 1. Phân loại Keo Trộn (Mixed) hay Keo Không Trộn (No Mix) dựa vào key của printData
      if (printData.separateGlueId) {
        // --- LOGIC CHO KEO CHIẾT ---
        const payloadMix = {
          factoryId: authStore.user?.factoryId,
          separateGlueId: printData.separateGlueId
        };

        response = await separateGlue.postConfirmSG(payloadMix);
        qrCodeParams = `${payloadMix.factoryId}/${payloadMix.separateGlueId}`;

      } else if (printData.noSeparateGlueId) {
        // --- LOGIC CHO KEO KHÔNG CHIẾT ---
        const payloadNoMix = {
          factoryId: authStore.user?.factoryId,
          noSeparateGlueId: printData.noSeparateGlueId
        };

        response = await separateGlue.postConfirmNSG(payloadNoMix);
        qrCodeParams = `${payloadNoMix.factoryId}/${payloadNoMix.noSeparateGlueId}`;
      } else {
        alert("Dữ liệu in không hợp lệ!");
        isPrinting.value = false;
        return;
      }

      // 2. Xử lý kết quả trả về từ API (Chung cho cả 2 loại)
      if (response && response.data?.success) {
        const { styleName, startDate, endDate, domainApi, action } = response.data.data;

        const formattedStart = format.formatDate(startDate);
        const formattedEnd = format.formatDate(endDate);

        // Khởi tạo TSPL với tọa độ chuẩn
        tspl = `
SIZE 69 mm, 49 mm
GAP 3 mm, 0 mm
REFERENCE 0,0
DIRECTION 1
CODEPAGE UTF-8
CLS
QRCODE 15,40,H,3,A,0,"${domainApi}${action}/${qrCodeParams}"
`;
        tspl += tsplBoldText(200, 80, 'Từ:');
        tspl += tsplBoldText(200, 120, formattedStart);
        tspl += tsplBoldText(200, 160, 'Đến:');
        tspl += tsplBoldText(200, 200, formattedEnd);

        // Thuật toán gom dòng cho Hình thể
        const styles = styleName ? styleName.split(',').map((s: string) => s.trim()) : [];
        const MAX_CHARS_PER_LINE = 30;
        const MAX_LINES = 3;

        let lines: string[] = [];
        let currentLine = "";

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

        if (lines.length > MAX_LINES) {
          lines = lines.slice(0, MAX_LINES);
          lines[MAX_LINES - 1] = lines[MAX_LINES - 1] + " ...";
        }

        let currentY = 240;
        lines.forEach((lineText: string, index: number) => {
          const prefix = index === 0 ? "Hình thể: " : "          ";
          tspl += tsplBoldText(15, currentY, `${prefix}${lineText}`);
          currentY += 40;
        });

        // Kết thúc lệnh in
        tspl += `PRINT 1,1\n`;

      } else {
        alert(`Lỗi API: ${response?.data?.message || 'Không thể xác nhận'}`);
        isPrinting.value = false;
        return;
      }
    }

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
      emit('printSuccess');
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