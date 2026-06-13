<template>
  <div class="col-12 sm:col-8 lg:col-7 lg:mb-0">
    <label class="text-800 font-medium block" style="width: fit-content;">
      <span>{{ t('electronicScale.label') }}</span>
      <span v-if="isConnected" class="text-green-500 font-normal text-sm ml-2">
        <i class="pi pi-check-circle"></i> {{ t('electronicScale.connected') }}
      </span>
      <span v-else-if="isConnecting" class="text-orange-500 font-normal text-sm ml-2">
        <i class="pi pi-spin pi-spinner"></i> {{ t('electronicScale.connecting') }}
      </span>
      <span v-else class="text-red-500 font-normal text-sm fade-blink ml-2">
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

        <!-- Sai số: hiển thị khi bắt buộc kiểm tra dung sai hoặc parent truyền lower/upper > 0 -->
        <div v-if="enforceTolerance || hasExplicitTolerance" class="ml-1 min-w-max border-left-1 border-300 pl-3">
          <div class="text-green-600 font-bold text-sl">+{{ effectiveUpperTolerance }} {{ effectiveUpperToleranceUnit }}
          </div>
          <div class="text-red-500 font-bold text-sl">-{{ effectiveLowerTolerance }} {{ effectiveLowerToleranceUnit }}
          </div>
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
  /** Đơn vị sai số dưới (bảng trộn — từ BE). Không truyền → hiển thị g. */
  lowerToleranceUnit: { type: [Number, String], default: '' },
  /** Đơn vị sai số trên (bảng trộn — từ BE). Không truyền → hiển thị g. */
  upperToleranceUnit: { type: [Number, String], default: '' },
  weightUnit: { type: [Number, String], default: '' },
  disableConfirm: { type: Boolean, default: false },
  /** false = cân bao nhiêu xác nhận bấy nhiêu; true = bắt buộc nằm trong sai số. */
  enforceTolerance: { type: Boolean, default: true },
  /** Dòng đã xác nhận cân: hiển thị TL thực tế đã lưu, không lấy số live từ cân. */
  lockedWeight: { type: [Number, String], default: '' },
  /** Session dùng chung (vd. MixGlueManagement); không truyền thì tự tạo theo instance. */
  scaleSessionId: { type: [String, Number, Symbol], default: undefined },
  /** Ẩn dropdown chọn cân trong component (picker đặt ở parent). */
  hideScalePicker: { type: Boolean, default: false },
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

/** Parent truyền sai số cụ thể (vd. noMix ±10g) — hiển thị dù chưa bật enforceTolerance. */
const hasExplicitTolerance = computed(() => {
  const lower = Number(props.lowerTolerance);
  const upper = Number(props.upperTolerance);
  return (Number.isFinite(lower) && lower > 0) || (Number.isFinite(upper) && upper > 0);
});

const formatToleranceUnitLabel = (unit?: string | number) => {
  const normalized = String(unit || 'g').trim().toLowerCase();
  return normalized === 'kg' ? 'KG' : 'G';
};

const effectiveLowerToleranceUnit = computed(() =>
  formatToleranceUnitLabel(props.lowerToleranceUnit || 'g')
);

const effectiveUpperToleranceUnit = computed(() =>
  formatToleranceUnitLabel(props.upperToleranceUnit || 'g')
);

const normalizeWeightUnit = (unit?: string | number): 'kg' | 'g' => {
  const normalized = String(unit || 'g').trim().toLowerCase();
  return normalized === 'kg' ? 'kg' : 'g';
};

/** Quy đổi giá trị sang đơn vị cân của dòng (weightUnit) — dùng đúng unit BE trả về. */
const convertToWeightUnit = (
  value: number,
  fromUnit: string | number | undefined,
  weightUnit: 'kg' | 'g'
) => {
  const from = normalizeWeightUnit(fromUnit);
  const val = Number.isFinite(value) ? value : 0;
  if (weightUnit === 'kg') {
    return from === 'kg' ? val : val / 1000;
  }
  return from === 'kg' ? val * 1000 : val;
};

const rowWeightUnit = computed(() => normalizeWeightUnit(props.weightUnit));

const isKgUnit = computed(() => rowWeightUnit.value === 'kg');

/** Đơn vị hiển thị trên UI — theo weightUnit của dòng. */
const effectiveDisplayUnit = computed(() => {
  const unit = String(props.weightUnit || 'g').trim();
  return unit.toLowerCase() === 'kg' ? 'KG' : 'G';
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

const getCurrentWeightInWeightUnit = () => fromGrams(getCurrentWeightInGrams());

/** Min/max theo target + sai số BE (mỗi sai số giữ đúng unit BE, quy về weightUnit để so). */
const getToleranceRangeInWeightUnit = () => {
  const unit = rowWeightUnit.value;
  const target = parseFloat(String(props.targetWeight ?? '0')) || 0;
  const lowerTol = convertToWeightUnit(
    Number(effectiveLowerTolerance.value) || 0,
    props.lowerToleranceUnit || 'g',
    unit
  );
  const upperTol = convertToWeightUnit(
    Number(effectiveUpperTolerance.value) || 0,
    props.upperToleranceUnit || 'g',
    unit
  );

  return {
    min: Number((target - lowerTol).toFixed(3)),
    max: Number((target + upperTol).toFixed(3)),
  };
};

const isWeightWithinTolerance = (currentInWeightUnit: number) => {
  const { min, max } = getToleranceRangeInWeightUnit();
  return currentInWeightUnit >= min && currentInWeightUnit <= max;
};

// --- GỌI GLOBAL MANAGER ---
const {
  globalWeight,
  isGlobalConnected,
  isGlobalStable,
  isScaleConnecting,
  startAutoConnect,
  stopAutoConnect,
} = useScaleManager();
const scaleSessionId = props.scaleSessionId ?? getCurrentInstance()?.uid ?? `scale-${Date.now()}`;

const beginScaleSession = () => {
  startAutoConnect(scaleSessionId);
};

const endScaleSession = () => {
  stopAutoConnect(scaleSessionId);
  resetDisplayedWeight();
  emit('connection-status', false);
};

// Đồng bộ trạng thái kết nối ra UI — chỉ "đã kết nối" khi thực sự nhận được dữ liệu cân
const isConnected = computed(() => isGlobalConnected.value);
const isConnecting = computed(() => isScaleConnecting.value);
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

  return !isWeightWithinTolerance(getCurrentWeightInWeightUnit());
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
      life: 6000,
    });
    return;
  }

  const weightForRow = fromGrams(currentGrams).toFixed(3);

  if (props.enforceTolerance) {
    const { min, max } = getToleranceRangeInWeightUnit();
    const unit = effectiveDisplayUnit.value;
    const currentInWeightUnit = getCurrentWeightInWeightUnit();

    if (currentInWeightUnit < min) {
      toast.add({
        severity: 'error',
        summary: t('electronicScale.toast.belowMin'),
        detail: t('electronicScale.toast.belowMinDetail', {
          weight: min.toFixed(3),
          unit,
        }),
        life: 6000
      });
      return;
    }

    if (currentInWeightUnit > max) {
      toast.add({
        severity: 'error',
        summary: t('electronicScale.toast.aboveMax'),
        detail: t('electronicScale.toast.aboveMaxDetail', {
          weight: max.toFixed(3),
          unit,
        }),
        life: 6000
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
    life: 6000
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