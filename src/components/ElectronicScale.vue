<template>
  <div class="col-12 sm:col-7 lg:col-6 lg:mb-0">
    <label class="text-800 font-medium block flex align-items-center flex-wrap gap-2">
      <span>{{ t('electronicScale.label') }}</span>
      <Button icon="pi pi-refresh" severity="secondary" text rounded size="small" class="scale-refresh-btn"
        :title="t('electronicScale.refreshTitle')" :loading="isRefreshing" :disabled="isRefreshing"
        :aria-label="t('electronicScale.refreshAriaLabel')" @click="handleRefreshConnection" />
      <span v-if="isConnected" class="text-green-500 font-normal text-sm">
        <i class="pi pi-check-circle"></i> {{ t('electronicScale.connected') }}
      </span>
      <span v-else-if="isConnecting" class="text-orange-500 font-normal text-sm">
        <i class="pi pi-spin pi-spinner"></i> {{ t('electronicScale.connecting') }}
      </span>
      <span v-else class="text-red-500 font-normal text-sm fade-blink">
        <i class="pi pi-spin pi-spinner"></i> {{ t('electronicScale.searching') }}
      </span>
    </label>

    <div class="flex justify-content-between align-items-end">
      <div class="p-inputgroup flex align-items-center">
        <InputText :model-value="displayWeight" readonly class="text-right font-bold bg-white" style="width: 250px;"
          :class="{
            'border-green-500': isStable && isConnected,
            'text-red-500': isExceedingLimit,
            'text-primary': !isExceedingLimit
          }" />
        <span class="p-inputgroup-addon font-bold px-1">{{ effectiveDisplayUnit }}</span>

        <!-- Sai số chỉ hiển thị khi bắt buộc kiểm tra dung sai -->
        <div v-if="enforceTolerance" class="ml-1 min-w-max border-left-1 border-300 pl-3">
          <div class="text-red-500 font-bold text-xs">-{{ effectiveLowerTolerance }} g</div>
          <div class="text-green-600 font-bold text-xs">+{{ effectiveUpperTolerance }} g</div>
        </div>
      </div>

      <Button
        :disabled="!isConnected || !isStable || isExceedingLimit || disableConfirm || !hasTargetWeight || hasLockedWeight || !hasPositiveWeight"
        :label="t('electronicScale.confirm')" icon="pi pi-check" size="large" severity="success"
        @click="confirmWeight" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, onActivated, onDeactivated, watch, computed, getCurrentInstance } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useScaleManager } from '@/composables/useScaleManager';
import { useAppLocale } from '@/composables/useAppLocale';

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');

// --- NHẬN PROPS TỪ CHA ---
const props = defineProps({
  targetWeight: { type: [Number, String], default: 0 },
  lowerTolerance: { type: [Number, String], default: '' },
  upperTolerance: { type: [Number, String], default: '' },
  weightUnit: { type: [Number, String], default: '' },
  disableConfirm: { type: Boolean, default: false },
  /** false = cân bao nhiêu xác nhận bấy nhiêu; true = bắt buộc nằm trong sai số. */
  enforceTolerance: { type: Boolean, default: true },
  /** Dòng đã xác nhận cân: hiển thị TL thực tế đã lưu, không lấy số live từ cân. */
  lockedWeight: { type: [Number, String], default: '' }
});

const emit = defineEmits(['update:weight', 'connection-status', 'confirm-weight']);

// --- TÍNH TOÁN SAI SỐ (gram) ---
const effectiveLowerTolerance = computed(() => {
  if (props.lowerTolerance === '' || props.lowerTolerance === null || props.lowerTolerance === undefined) return 5;
  if (Number(props.lowerTolerance) === 0) return 5;
  return Number(props.lowerTolerance);
});

const effectiveUpperTolerance = computed(() => {
  if (props.upperTolerance === '' || props.upperTolerance === null || props.upperTolerance === undefined) return 5;
  if (Number(props.upperTolerance) === 0) return 5;
  return Number(props.upperTolerance);
});

const isKgUnit = computed(() => props.weightUnit?.toString().toLowerCase() === 'kg');

/** Đơn vị hiển thị trên UI — theo weightUnit của dòng. */
const effectiveDisplayUnit = computed(() => {
  const unit = String(props.weightUnit || 'g').trim();
  return unit.toLowerCase() === 'kg' ? 'Kg' : 'g';
});

/** Cân serial luôn trả về kg → quy đổi sang gram để tính nội bộ. */
const scaleKgToGrams = (kgVal: number) =>
  Number((Number.isFinite(kgVal) ? kgVal * 1000 : 0).toFixed(3));

/** Quy đổi trọng lượng dòng (kg/g) sang gram. */
const toGrams = (weight: number, fromKgUnit: boolean) => {
  const normalized = Number.isFinite(weight) ? weight : 0;
  return fromKgUnit ? scaleKgToGrams(normalized) : Number(normalized.toFixed(3));
};

/** Hiển thị / emit từ gram về đơn vị UI của dòng. */
const formatGramsForDisplay = (grams: number) => {
  const normalized = Number.isFinite(grams) ? grams : 0;
  return isKgUnit.value
    ? (normalized / 1000).toFixed(3)
    : normalized.toFixed(3);
};

const fromGrams = (grams: number) => {
  const normalized = Number.isFinite(grams) ? grams : 0;
  return isKgUnit.value
    ? Number((normalized / 1000).toFixed(3))
    : Number(normalized.toFixed(3));
};

// --- STATE (nội bộ luôn tính theo gram) ---
const weightGrams = ref(0);

const displayWeight = computed(() => formatGramsForDisplay(weightGrams.value));

const getCurrentWeightInGrams = () => weightGrams.value;

const getToleranceRangeInGrams = () => {
  const targetGrams = toGrams(parseFloat(String(props.targetWeight ?? '0')), isKgUnit.value);
  const lowerTolGram = Number(effectiveLowerTolerance.value) || 0;
  const upperTolGram = Number(effectiveUpperTolerance.value) || 0;

  return {
    targetGrams,
    minGrams: Number((targetGrams - lowerTolGram).toFixed(3)),
    maxGrams: Number((targetGrams + upperTolGram).toFixed(3)),
  };
};

const isWeightWithinTolerance = (currentGrams: number) => {
  const { minGrams, maxGrams } = getToleranceRangeInGrams();
  return currentGrams >= minGrams && currentGrams <= maxGrams;
};

// --- GỌI GLOBAL MANAGER ---
const {
  globalWeight,
  isGlobalConnected,
  isGlobalStable,
  isScaleConnecting,
  startAutoConnect,
  stopAutoConnect,
  forceReconnect,
} = useScaleManager();
const scaleSessionId = getCurrentInstance()?.uid ?? `scale-${Date.now()}`;
const isRefreshing = ref(false);

const beginScaleSession = () => {
  startAutoConnect(scaleSessionId);
};

const endScaleSession = () => {
  stopAutoConnect(scaleSessionId);
  resetDisplayedWeight();
  emit('connection-status', false);
};

const handleRefreshConnection = async () => {
  if (isRefreshing.value) return;

  isRefreshing.value = true;
  resetDisplayedWeight();

  try {
    await forceReconnect(scaleSessionId, { pickPort: true });
    toast.add({
      severity: 'info',
      summary: t('electronicScale.toast.reconnecting'),
      detail: t('electronicScale.toast.reconnectingDetail'),
      life: 4000,
    });
  } catch (error) {
    console.error('[ElectronicScale] refresh connection failed:', error);
    toast.add({
      severity: 'warn',
      summary: t('electronicScale.toast.connectFailed'),
      detail: t('electronicScale.toast.connectFailedDetail'),
      life: 4000,
    });
  } finally {
    isRefreshing.value = false;
  }
};

// Đồng bộ trạng thái kết nối ra UI — chỉ "đã kết nối" khi thực sự nhận được dữ liệu cân
const isConnected = computed(() => isGlobalConnected.value);
const isConnecting = computed(() => isScaleConnecting.value || isRefreshing.value);
const isStable = computed(() => isGlobalStable.value);

// --- LOGIC KIỂM TRA & XÁC NHẬN ---
/** Chỉ bắt TL yêu cầu khi kiểm tra dung sai (keo thêm từ modal). */
const hasTargetWeight = computed(() => {
  if (!props.enforceTolerance) return true;

  const raw = props.targetWeight;
  if (raw === '' || raw === null || raw === undefined) return false;
  const num = parseFloat(String(raw));
  return !Number.isNaN(num) && num > 0;
});

/** Trọng lượng live từ cân phải > 0 mới được xác nhận. */
const hasPositiveWeight = computed(() => weightGrams.value > 0);

const resetDisplayedWeight = () => {
  weightGrams.value = 0;
  emit('update:weight', formatGramsForDisplay(0));
};

const hasLockedWeight = computed(() => {
  const raw = props.lockedWeight;
  if (raw === '' || raw === null || raw === undefined) return false;
  const num = parseFloat(String(raw));
  return !Number.isNaN(num);
});

const applyLockedWeightDisplay = () => {
  const num = parseFloat(String(props.lockedWeight) || '0');
  weightGrams.value = Number.isNaN(num) ? 0 : toGrams(num, isKgUnit.value);
  emit('update:weight', formatGramsForDisplay(weightGrams.value));
};

// --- CÁC WATCHER ĐỂ ĐỒNG BỘ UI VÀ EMIT ---
watch(isGlobalConnected, (newStatus) => {
  emit('connection-status', newStatus);
});

// Dòng đã xác nhận → hiển thị actualWeight đã lưu; chưa xác nhận → live cân hoặc 0.000
watch(
  [
    globalWeight,
    isKgUnit,
    hasTargetWeight,
    hasLockedWeight,
    () => props.lockedWeight,
    () => props.enforceTolerance,
    () => props.targetWeight,
    () => props.disableConfirm,
  ],
  ([newWeight, , canWeigh]) => {
    if (hasLockedWeight.value) {
      applyLockedWeightDisplay();
      return;
    }

    if (!canWeigh) {
      resetDisplayedWeight();
      return;
    }

    const kgFromScale = parseFloat(String(newWeight) || '0');
    weightGrams.value = scaleKgToGrams(kgFromScale);
    emit('update:weight', formatGramsForDisplay(weightGrams.value));
  },
  { immediate: true }
);

const isExceedingLimit = computed(() => {
  if (!props.enforceTolerance) return false;
  if (hasLockedWeight.value) return false;
  if (!hasTargetWeight.value) return false;

  return !isWeightWithinTolerance(getCurrentWeightInGrams());
});

const confirmWeight = () => {
  if (props.enforceTolerance && !hasTargetWeight.value) {
    toast.add({
      severity: 'warn',
      summary: t('electronicScale.toast.noTargetWeight'),
      detail: t('electronicScale.toast.noTargetWeightDetail'),
      life: 4000
    });
    return;
  }

  const currentGrams = getCurrentWeightInGrams();
  if (currentGrams <= 0) {
    toast.add({
      severity: 'warn',
      summary: t('electronicScale.toast.zeroWeight'),
      detail: t('electronicScale.toast.zeroWeightDetail'),
      life: 4000,
    });
    return;
  }

  const weightForRow = fromGrams(currentGrams).toFixed(3);

  if (props.enforceTolerance) {
    const { minGrams, maxGrams } = getToleranceRangeInGrams();
    const unit = effectiveDisplayUnit.value;
    const minDisplay = fromGrams(minGrams);
    const maxDisplay = fromGrams(maxGrams);

    if (currentGrams < minGrams) {
      toast.add({
        severity: 'error',
        summary: t('electronicScale.toast.belowMin'),
        detail: t('electronicScale.toast.belowMinDetail', {
          weight: minDisplay.toFixed(3),
          unit,
        }),
        life: 5000
      });
      return;
    }

    if (currentGrams > maxGrams) {
      toast.add({
        severity: 'error',
        summary: t('electronicScale.toast.aboveMax'),
        detail: t('electronicScale.toast.aboveMaxDetail', {
          weight: maxDisplay.toFixed(3),
          unit,
        }),
        life: 5000
      });
      return;
    }
  }

  emit('confirm-weight', weightForRow);
  toast.add({
    severity: 'success',
    summary: t('electronicScale.toast.success'),
    detail: props.enforceTolerance
      ? t('electronicScale.toast.successWithinTolerance')
      : t('electronicScale.toast.successConfirmed'),
    life: 3000
  });
};

// --- LIFECYCLE ---
// Ionic cache page → dùng activated/deactivated; session owner tránh page cũ vẫn auto-connect.
onMounted(() => {
  setTimeout(() => beginScaleSession(), 500);
});

onActivated(() => {
  beginScaleSession();
});

onDeactivated(() => {
  endScaleSession();
});

onUnmounted(() => {
  endScaleSession();
});
</script>

<style scoped>
.scale-refresh-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
}

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