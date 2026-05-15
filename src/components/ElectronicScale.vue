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

      <Button :disabled="!isConnected || !isStable || isExceedingLimit" label="Xác nhận" icon="pi pi-check" size="large"
        severity="success" @click="confirmWeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useScaleManager } from '@/composables/useScaleManager';

const toast = useToast();

// --- NHẬN PROPS TỪ CHA (GIỮ NGUYÊN) ---
const props = defineProps({
  targetWeight: { type: [Number, String], default: 0 },
  lowerTolerance: { type: [Number, String], default: '' },
  upperTolerance: { type: [Number, String], default: '' },
  weightUnit: { type: [Number, String], default: '' }
});

const emit = defineEmits(['update:weight', 'connection-status', 'confirm-weight']);

// --- TÍNH TOÁN SAI SỐ (GIỮ NGUYÊN 100%) ---
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

// --- CÁC WATCHER ĐỂ ĐỒNG BỘ UI VÀ EMIT (Thay thế logic lắng nghe Serial cũ) ---
watch(isGlobalConnected, (newStatus) => {
  emit('connection-status', newStatus);
});

// Khi cân gửi số mới về -> cập nhật UI -> Emit ra cho component cha
watch(globalWeight, (newWeight) => {
  mixingProcess.value.weight = newWeight;
  emit('update:weight', newWeight);
});

// --- WATCH TARGET WEIGHT (GIỮ NGUYÊN 100%) ---
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

// --- LOGIC KIỂM TRA & XÁC NHẬN (GIỮ NGUYÊN 100%) ---
const isExceedingLimit = computed(() => {
  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');
  if (target <= 0) return false;

  const current = Number(currentWeight.toFixed(3));
  const lowerKg = (parseFloat(effectiveLowerTolerance.value.toString()) || 0) / 1000;
  const minAcceptable = Number((target - lowerKg).toFixed(3));
  if (current < minAcceptable) return true;

  const upperKg = (parseFloat(effectiveUpperTolerance.value.toString()) || 0) / 1000;
  const maxAcceptable = Number((target + upperKg).toFixed(3));
  if (current > maxAcceptable) return true;

  return false;
});

const confirmWeight = () => {
  const currentWeight = parseFloat(mixingProcess.value.weight || '0');
  const target = parseFloat(props.targetWeight?.toString() || '0');
  const current = Number(currentWeight.toFixed(3));

  if (target <= 0) {
    emit('confirm-weight', current.toFixed(3));
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã xác nhận trọng lượng', life: 3000 });
    return;
  }

  const lowerKg = (parseFloat(effectiveLowerTolerance.value.toString()) || 0) / 1000;
  const minAcceptable = Number((target - lowerKg).toFixed(3));
  if (current < minAcceptable) {
    toast.add({ severity: 'error', summary: 'Không đạt yêu cầu', detail: `Trọng lượng không được thấp hơn ${minAcceptable.toFixed(3)} Kg.`, life: 5000 });
    return;
  }

  const upperKg = (parseFloat(effectiveUpperTolerance.value.toString()) || 0) / 1000;
  const maxAcceptable = Number((target + upperKg).toFixed(3));
  if (current > maxAcceptable) {
    toast.add({ severity: 'error', summary: 'Vượt giới hạn', detail: `Trọng lượng tối đa chỉ được phép đến ${maxAcceptable.toFixed(3)} Kg.`, life: 5000 });
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