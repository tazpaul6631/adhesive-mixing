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
        <span class="p-inputgroup-addon font-bold px-1">{{ weightUnit }}</span>

        <!-- Luôn hiển thị sai số do đã có mặc định 5g -->
        <div class="ml-1 min-w-max border-left-1 border-300 pl-3">
          <div class="text-red-500 font-bold text-xs">-{{ effectiveLowerTolerance }} g</div>
          <div class="text-green-600 font-bold text-xs">+{{ effectiveUpperTolerance }} g</div>
        </div>
      </div>

      <Button :disabled="!isConnected || !isStable || isExceedingLimit || disableConfirm || !hasTargetWeight || hasLockedWeight"
        label="Xác nhận"
        icon="pi pi-check" size="large" severity="success" @click="confirmWeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useScaleManager } from '@/composables/useScaleManager';

const toast = useToast();

// --- NHẬN PROPS TỪ CHA ---
const props = defineProps({
  targetWeight: { type: [Number, String], default: 0 },
  lowerTolerance: { type: [Number, String], default: '' },
  upperTolerance: { type: [Number, String], default: '' },
  weightUnit: { type: [Number, String], default: '' },
  disableConfirm: { type: Boolean, default: false },
  /** Dòng đã xác nhận cân: hiển thị TL thực tế đã lưu, không lấy số live từ cân. */
  lockedWeight: { type: [Number, String], default: '' }
});

const emit = defineEmits(['update:weight', 'connection-status', 'confirm-weight']);

// --- TÍNH TOÁN SAI SỐ ---
const effectiveLowerTolerance = computed(() => {
  if (props.lowerTolerance === '' || props.lowerTolerance === null || props.lowerTolerance === undefined) return 5;
  if (Number(props.lowerTolerance) === 0) return 5;
  return props.lowerTolerance;
});

const effectiveUpperTolerance = computed(() => {
  if (props.upperTolerance === '' || props.upperTolerance === null || props.upperTolerance === undefined) return 5;
  if (Number(props.upperTolerance) === 0) return 5;
  return props.upperTolerance;
});

const weightUnit = computed(() => props.weightUnit);

// --- STATE ---
const mixingProcess = ref({ weight: '0.000' });

// --- GỌI GLOBAL MANAGER ---
const { globalWeight, isGlobalConnected, isGlobalStable, startAutoConnect, stopAutoConnect } = useScaleManager();

// Đồng bộ trạng thái kết nối ra UI
const isConnected = computed(() => isGlobalConnected.value);
const isStable = computed(() => isGlobalStable.value);

// --- LOGIC KIỂM TRA & XÁC NHẬN ---
const isKgUnit = computed(() => {
  return props.weightUnit?.toString().toLowerCase() === 'kg';
});

/** Chỉ cho phép nhận số cân khi dòng đang chọn đã có TL yêu cầu (> 0). */
const hasTargetWeight = computed(() => {
  const raw = props.targetWeight;
  if (raw === '' || raw === null || raw === undefined) return false;
  const num = parseFloat(String(raw));
  return !Number.isNaN(num) && num > 0;
});

const formatScaleReading = (newWeight: string | number, isKg: boolean) => {
  if (isKg) {
    return String(newWeight);
  }
  return (parseFloat(String(newWeight) || '0') * 1000).toFixed(3);
};

const resetDisplayedWeight = () => {
  mixingProcess.value.weight = '0.000';
  emit('update:weight', '0.000');
};

const hasLockedWeight = computed(() => {
  const raw = props.lockedWeight;
  if (raw === '' || raw === null || raw === undefined) return false;
  const num = parseFloat(String(raw));
  return !Number.isNaN(num);
});

const formatLockedWeightDisplay = (weight: string | number) => {
  const num = parseFloat(String(weight) || '0');
  if (Number.isNaN(num)) return '0.000';
  return num.toFixed(3);
};

const applyLockedWeightDisplay = () => {
  const display = formatLockedWeightDisplay(props.lockedWeight as string | number);
  mixingProcess.value.weight = display;
  emit('update:weight', display);
};

// --- CÁC WATCHER ĐỂ ĐỒNG BỘ UI VÀ EMIT ---
watch(isGlobalConnected, (newStatus) => {
  emit('connection-status', newStatus);
});

// Dòng đã xác nhận → hiển thị actualWeight đã lưu; chưa xác nhận → live cân hoặc 0.000
watch([globalWeight, isKgUnit, hasTargetWeight, hasLockedWeight, () => props.lockedWeight], ([newWeight, isKg, canWeigh]) => {
  if (hasLockedWeight.value) {
    applyLockedWeightDisplay();
    return;
  }

  if (!canWeigh) {
    resetDisplayedWeight();
    return;
  }

  const formatted = formatScaleReading(newWeight as string, isKg as boolean);
  mixingProcess.value.weight = formatted;
  emit('update:weight', formatted);
}, { immediate: true });

const isExceedingLimit = computed(() => {
  if (hasLockedWeight.value) return false;
  if (!hasTargetWeight.value) return false;

  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');
  const current = Number(currentWeight.toFixed(3));

  // Sai số mặc định là Gram
  const lowerTolGram = parseFloat(effectiveLowerTolerance.value.toString()) || 0;
  const upperTolGram = parseFloat(effectiveUpperTolerance.value.toString()) || 0;

  // Quy đổi sai số về cùng đơn vị với targetWeight
  const lowerDiff = isKgUnit.value ? lowerTolGram / 1000 : lowerTolGram;
  const upperDiff = isKgUnit.value ? upperTolGram / 1000 : upperTolGram;

  const minAcceptable = Number((target - lowerDiff).toFixed(3));
  const maxAcceptable = Number((target + upperDiff).toFixed(3));

  return current < minAcceptable || current > maxAcceptable;
});

const confirmWeight = () => {
  if (!hasTargetWeight.value) {
    toast.add({
      severity: 'warn',
      summary: 'Chưa có TL yêu cầu',
      detail: 'Dòng này chưa có trọng lượng yêu cầu. Vui lòng cân thành phần gốc trước hoặc chọn dòng khác.',
      life: 4000
    });
    return;
  }

  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');
  const current = Number(currentWeight.toFixed(3));
  const unit = props.weightUnit || 'Kg';

  // Sai số mặc định là Gram
  const lowerTolGram = parseFloat(effectiveLowerTolerance.value.toString()) || 0;
  const upperTolGram = parseFloat(effectiveUpperTolerance.value.toString()) || 0;

  // Quy đổi sai số về cùng đơn vị với targetWeight
  const lowerDiff = isKgUnit.value ? lowerTolGram / 1000 : lowerTolGram;
  const upperDiff = isKgUnit.value ? upperTolGram / 1000 : upperTolGram;

  const minAcceptable = Number((target - lowerDiff).toFixed(3));
  const maxAcceptable = Number((target + upperDiff).toFixed(3));

  if (current < minAcceptable) {
    toast.add({ severity: 'error', summary: 'Không đạt yêu cầu', detail: `Trọng lượng không được thấp hơn ${minAcceptable.toFixed(3)} ${unit}.`, life: 5000 });
    return;
  }

  if (current > maxAcceptable) {
    toast.add({ severity: 'error', summary: 'Vượt giới hạn', detail: `Trọng lượng tối đa chỉ được phép đến ${maxAcceptable.toFixed(3)} ${unit}.`, life: 5000 });
    return;
  }

  emit('confirm-weight', current.toFixed(3));
  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Trọng lượng đạt yêu cầu', life: 3000 });
};

// --- LIFECYCLE ---
onMounted(() => {
  setTimeout(() => startAutoConnect(), 500);
});

onUnmounted(() => {
  stopAutoConnect(); // Dọn dẹp khi chuyển sang màn hình khác
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