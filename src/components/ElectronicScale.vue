<template>
  <div class="col-12 sm:col-7 lg:col-6 lg:mb-0">
    <label class="text-800 font-medium mb-2 block">
      Trọng lượng cân thực tế
      <span v-if="isConnected" class="text-green-500 font-normal text-sm ml-2">
        <i class="pi pi-check-circle"></i> Đã kết nối với cân
      </span>
      <span v-else class="text-red-500 font-normal text-sm ml-2 fade-blink">
        <i class="pi pi-spin pi-spinner"></i> Đang tìm kết nối...
      </span>
    </label>

    <div class="flex justify-content-between align-items-end">
      <div class="p-inputgroup flex align-items-center">
        <InputText v-model="mixingProcess.weight" readonly class="text-right font-bold bg-white" style="width: 250px;"
          :class="{
            'border-green-500': isStable && isConnected,
            'text-red-500': isExceedingLimit,
            'text-primary': !isExceedingLimit
          }" />
        <span class="p-inputgroup-addon font-bold px-1">Kg</span>
        <div v-if="lowerTolerance !== '' && upperTolerance !== ''" class="ml-1 min-w-max border-left-1 border-300 pl-3">
          <div class="text-red-500 font-bold text-xs">-{{ lowerTolerance }} g</div>
          <div class="text-green-600 font-bold text-xs">+{{ upperTolerance }} g</div>
        </div>
      </div>

      <Button :disabled="!isConnected || !isStable || isExceedingLimit" label="Xác nhận" icon="pi pi-check" size="large"
        severity="success" @click="confirmWeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { registerPlugin, WebPlugin, Capacitor } from '@capacitor/core';
import { useToast } from 'primevue/usetoast';

const toast = useToast();

// --- NHẬN PROPS TỪ CHA ---
const props = defineProps({
  targetWeight: {
    type: [Number, String],
    default: 0
  },
  lowerTolerance: {
    type: [Number, String],
    default: ''
  },
  upperTolerance: {
    type: [Number, String],
    default: ''
  }
});

// --- KẾT NỐI VỚI COMPONENT CHA ---
const emit = defineEmits(['update:weight', 'connection-status', 'confirm-weight']);

// --- STATE ---
const mixingProcess = ref({
  weight: ''
});
const isConnected = ref(false);
const isStable = ref(false);

// Các biến lưu trữ nội bộ cho logic cân
let dataBuffer = '';
let dataListener: any = null;
let watchdog: any = null;
let autoConnectInterval: any = null;

// ==========================================
// THÊM WATCH ĐỂ GÁN TRỌNG LƯỢNG YÊU CẦU VÀO INPUT
// ==========================================
watch(
  () => props.targetWeight,
  (newTargetWeight) => {
    if (newTargetWeight !== undefined && newTargetWeight !== null) {
      // Ép kiểu về số và làm tròn 3 chữ số thập phân cho đẹp
      const formattedWeight = Number(newTargetWeight).toFixed(3);
      mixingProcess.value.weight = formattedWeight;

      // Emit ngược lại cho cha biết số đã được set mặc định
      emit('update:weight', formattedWeight);
    }
  },
  { immediate: true } // immediate: true giúp chạy ngay lần đầu tiên component được render
);

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

const isExceedingLimit = computed(() => {
  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');

  // Nếu không có target thì không check
  if (target <= 0) return false;

  const current = Number(currentWeight.toFixed(3));

  // Điều kiện 1: Cấm tuyệt đối cân hụt (thấp hơn target)
  if (current < target) return true;

  // Điều kiện 2: Nếu CÓ cấu hình upperTolerance thì mới check giới hạn trên
  if (props.upperTolerance !== '' && props.upperTolerance !== null && props.upperTolerance !== undefined) {
    const upperKg = (parseFloat(props.upperTolerance.toString()) || 0) / 1000;
    const maxAcceptable = Number((target + upperKg).toFixed(3));

    if (current > maxAcceptable) return true;
  }

  // Nếu qua hết các bài test thì là hợp lệ
  return false;
});

// --- CORE LOGIC ---
const setDisconnected = () => {
  if (isConnected.value) {
    isConnected.value = false;
    emit('connection-status', false); // Báo ra cha là mất kết nối
  }
  isStable.value = false;
  // Không set lại '0.000' ở đây nữa để giữ nguyên số targetWeight trên màn hình nếu mất kết nối
  // mixingProcess.value.weight = '0.000'; 
  // emit('update:weight', '0.000');
};

const connectToScale = async () => {
  if (isConnected.value) return;

  try {
    if (dataListener) await dataListener.remove();

    dataListener = await SerialScale.addListener('onScaleData', (result: any) => {
      if (!isConnected.value) {
        isConnected.value = true;
        emit('connection-status', true);
      }
      clearTimeout(watchdog);
      watchdog = setTimeout(() => setDisconnected(), 2000);

      let raw = result.data;
      let cleanRaw = "";
      if (raw.length > 15) {
        for (let i = 0; i < raw.length; i += 3) cleanRaw += raw[i];
      } else { cleanRaw = raw; }

      dataBuffer += cleanRaw;

      if (dataBuffer.includes('\n') || dataBuffer.includes('\r')) {
        const line = dataBuffer.trim();

        const upperLine = line.toUpperCase();
        const newStable = upperLine.includes("ST") || !upperLine.includes("US");

        if (isStable.value !== newStable) isStable.value = newStable;

        const matches = line.match(/[-+]?\d*\.?\d+/);
        if (matches) {
          let rawValue = parseFloat(matches[0]);
          const lowerLine = line.toLowerCase();

          if (!lowerLine.includes('kg') && lowerLine.includes('g')) {
            rawValue = rawValue / 1000;
          }

          const val = rawValue.toFixed(3);

          // Cập nhật lại số nếu cân phát hiện số kg thực tế mới
          if (mixingProcess.value.weight !== val) {
            mixingProcess.value.weight = val;
            emit('update:weight', val);
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

const startAutoConnect = () => {
  connectToScale();
  autoConnectInterval = setInterval(() => {
    if (!isConnected.value) {
      connectToScale();
    }
  }, 3000);
};

// ==========================================
// LOGIC KIỂM TRA & XÁC NHẬN TRỌNG LƯỢNG
// ==========================================
const confirmWeight = () => {
  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');
  const current = Number(currentWeight.toFixed(3));

  if (target <= 0) {
    emit('confirm-weight', current.toFixed(3));
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xác nhận trọng lượng', life: 3000 });
    return;
  }

  // Nếu cân hụt -> Báo lỗi ngay lập tức
  if (current < target) {
    toast.add({ severity: 'error', summary: 'Không đạt yêu cầu', detail: `Trọng lượng không được thấp hơn ${target.toFixed(3)} Kg.`, life: 5000 });
    return;
  }

  // Nếu có upperTolerance -> Kiểm tra xem có bị vượt mức cho phép không
  if (props.upperTolerance !== '' && props.upperTolerance !== null && props.upperTolerance !== undefined) {
    const upperKg = (parseFloat(props.upperTolerance.toString()) || 0) / 1000;
    const maxAcceptable = Number((target + upperKg).toFixed(3));

    if (current > maxAcceptable) {
      toast.add({ severity: 'error', summary: 'Vượt giới hạn', detail: `Trọng lượng tối đa chỉ được phép đến ${maxAcceptable.toFixed(3)} Kg.`, life: 5000 });
      return;
    }
  }

  // Nếu lớn hơn hoặc bằng target (và nằm trong mức dư cho phép nếu có)
  emit('confirm-weight', current.toFixed(3));
  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Trọng lượng đạt yêu cầu', life: 3000 });
};

watch(
  () => props.targetWeight,
  (newTargetWeight) => {
    if (newTargetWeight !== undefined && newTargetWeight !== null) {
      const formattedWeight = Number(newTargetWeight).toFixed(3);
      mixingProcess.value.weight = formattedWeight;
      emit('update:weight', formattedWeight);
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (Capacitor.getPlatform() === 'android') {
    setTimeout(() => startAutoConnect(), 500);
  } else {
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

.border-green-500 {
  border-color: #22c55e !important;
  transition: border-color 0.3s ease;
}
</style>