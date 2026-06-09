import i18n from '@/i18n';

const t = (key: string, params?: Record<string, unknown>) =>
  String(i18n.global.t(key, params ?? {}));

export const WEIGHT_EPSILON = 0.001;

/**
 * TL chiết mục tiêu (Kg, bước 0.1) từ TL thực tế đã cân — khớp thùng 0.1–0.9 kg.
 * Làm tròn xuống 0.1; chỉ làm tròn lên khi phần lẻ (kg×10) >= 0.95.
 * VD: 5.149→5.1, 5.154→5.1, 5.199→5.2, 5.601→5.6
 */
export const resolveChietTargetCapacityKg = (
  weight: number | string | undefined,
  unit = 'Kg'
): number => {
  const kg = normalizeWeightToKg(weight ?? 0, unit);
  if (kg <= 0) return 0;

  const scaled = kg * 10;
  const wholeTenths = Math.floor(scaled);
  const fracTenths = scaled - wholeTenths;

  if (fracTenths >= 0.95 - WEIGHT_EPSILON) {
    return Math.ceil(scaled) / 10;
  }
  return wholeTenths / 10;
};

export const formatEffectiveChietTargetLabel = (
  weight: number | string | undefined,
  unit = 'Kg'
): string => formatTargetWeightLabel(resolveChietTargetCapacityKg(weight, unit), 'Kg');

export type BucketOption = {
  bucketId: string | number;
  capacity: number | string;
  capacityUnit?: string;
  label?: string;
};

export const findBucketOptionById = (
  bucketList: BucketOption[],
  bucketId: unknown
): BucketOption | undefined =>
  bucketList.find((item) => String(item.bucketId) === String(bucketId));

/** Khớp kiểu bucketId với optionValue của Select (tránh lệch string/number sau khi đọc draft). */
export const normalizeBucketIdForSelect = (
  value: unknown,
  bucketList: BucketOption[]
): string | number | null => {
  if (value == null || value === '') return null;

  const matched = findBucketOptionById(bucketList, value);
  if (matched) return matched.bucketId;

  const sample = bucketList[0]?.bucketId;
  if (typeof sample === 'number') {
    const num = Number(value);
    return Number.isFinite(num) ? num : String(value);
  }

  return String(value);
};

export const normalizeWeightToKg = (value: number | string, unit = 'Kg'): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;

  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === 'g' || normalizedUnit === 'gram') {
    return num / 1000;
  }

  return num;
};

export const getBucketCapacityKg = (bucket: BucketOption): number =>
  normalizeWeightToKg(bucket.capacity, bucket.capacityUnit || 'Kg');

export const formatWeightKg = (kg: number): string => {
  const formatted = kg.toFixed(3).replace(/\.?0+$/, '');
  return formatted || '0';
};

export const formatTargetWeightLabel = (
  weight: number | string | undefined,
  unit = 'Kg'
): string => {
  const num = Number(weight);
  if (!Number.isFinite(num)) return '';

  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === 'g' || normalizedUnit === 'gram') {
    return `${num} g`;
  }

  return `${formatWeightKg(num)} Kg`;
};

export const isDecimalTargetWeight = (
  weight: number | string | undefined,
  unit = 'Kg'
): boolean => {
  const num = Number(weight);
  if (!Number.isFinite(num) || num <= 0) return false;

  const normalizedUnit = unit.toLowerCase();
  if (normalizedUnit === 'g' || normalizedUnit === 'gram') {
    return Math.abs(num - Math.round(num)) > WEIGHT_EPSILON;
  }

  return Math.abs(num - Math.round(num)) > WEIGHT_EPSILON;
};

/** So khớp chính xác TL thùng với TL chiết đã quy đổi (chỉ dung sai float). */
export const getCapacityMatchToleranceKg = (
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg'
): number => {
  void targetWeight;
  void targetWeightUnit;
  return WEIGHT_EPSILON;
};

export const getChietShortageKg = (totalKg: number, targetKg: number): number =>
  Math.max(0, targetKg - totalKg);

export const getChietOverflowKg = (totalKg: number, targetKg: number): number =>
  Math.max(0, totalKg - targetKg);

export const isChietCapacityComplete = (
  totalKg: number,
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg'
): boolean => {
  const expectedKg = resolveChietTargetCapacityKg(targetWeight, targetWeightUnit);
  if (expectedKg <= 0) return false;

  return Math.abs(totalKg - expectedKg) <= WEIGHT_EPSILON;
};

export const formatChietCapacityBlockMessage = (
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg'
) => {
  const label = formatEffectiveChietTargetLabel(targetWeight, targetWeightUnit);
  return t('separateMixedGlue.validation.chietCapacityBlock', { label });
};

export const buildChietAddRowDebugInfo = (
  orderDetails: any[],
  bucketList: BucketOption[],
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg'
) => {
  const targetKg = normalizeWeightToKg(targetWeight ?? 0, targetWeightUnit);
  const expectedKg = resolveChietTargetCapacityKg(targetWeight, targetWeightUnit);
  const totalKg = sumSelectedBucketCapacityKg(orderDetails, bucketList);
  const shortageKg = getChietShortageKg(totalKg, expectedKg);
  const overflowKg = getChietOverflowKg(totalKg, expectedKg);

  return {
    targetWeight,
    targetWeightUnit,
    targetKg,
    expectedKg,
    targetLabel: formatEffectiveChietTargetLabel(targetWeight, targetWeightUnit),
    totalBucketKg: totalKg,
    shortageKg: Number(shortageKg.toFixed(4)),
    overflowKg: Number(overflowKg.toFixed(4)),
    isCapacityComplete: isChietCapacityComplete(totalKg, targetWeight, targetWeightUnit),
    bucketListLoaded: bucketList.length,
    rows: orderDetails.map((row, index) => ({
      row: index + 1,
      bucketId: row.selectedBucketId ?? row.bucketId ?? null,
      requestCount: (row.selectedRequestDetailIds ?? []).length,
    })),
  };
};

export const sumSelectedBucketCapacityKg = (
  orderDetails: any[],
  bucketList: BucketOption[],
  excludeRow?: any
): number => {
  let sum = 0;

  orderDetails.forEach((row) => {
    if (row === excludeRow) return;

    const bucketId = row.selectedBucketId ?? row.bucketId;
    if (!bucketId) return;

    const bucket = bucketList.find((item) => String(item.bucketId) === String(bucketId));
    if (bucket) {
      sum += getBucketCapacityKg(bucket);
    }
  });

  return sum;
};

export const getRemainingCapacityKg = (
  targetWeightKg: number,
  orderDetails: any[],
  bucketList: BucketOption[],
  excludeRow?: any
): number => targetWeightKg - sumSelectedBucketCapacityKg(orderDetails, bucketList, excludeRow);

export const sortBucketsByClosestCapacity = (
  bucketList: BucketOption[],
  targetRemainingKg: number
): BucketOption[] =>
  [...bucketList].sort((left, right) => {
    const leftDistance = Math.abs(getBucketCapacityKg(left) - targetRemainingKg);
    const rightDistance = Math.abs(getBucketCapacityKg(right) - targetRemainingKg);
    return leftDistance - rightDistance;
  });

export const getAssignedRequestDetailIds = (orderDetails: any[]): Set<string> => {
  const assignedIds = new Set<string>();

  orderDetails.forEach((row) => {
    const ids = row.selectedRequestDetailIds ?? row.requestDetailIds ?? [];
    ids.forEach((id: string | number) => assignedIds.add(String(id)));
  });

  return assignedIds;
};

export const areAllRequestDetailsAssigned = (
  orderDetails: any[],
  requestDetails: { requestDetailId: string | number }[]
): boolean => {
  if (!requestDetails.length) return true;

  const assignedIds = getAssignedRequestDetailIds(orderDetails);
  return requestDetails.every((item) => assignedIds.has(String(item.requestDetailId)));
};

export const getUnassignedRequestDetailLabels = (
  orderDetails: any[],
  requestDetails: { requestDetailId: string | number; requestDetailName?: string; label?: string }[]
): string[] =>
  requestDetails
    .filter((item) => !getAssignedRequestDetailIds(orderDetails).has(String(item.requestDetailId)))
    .map((item) => item.requestDetailName || item.label || String(item.requestDetailId));

export const validateBucketCapacityTotal = (
  targetWeightKg: number,
  orderDetails: any[],
  bucketList: BucketOption[],
  targetWeightLabel?: string
): { ok: boolean; totalKg: number; message?: string } => {
  if (targetWeightKg <= 0) {
    return { ok: true, totalKg: 0 };
  }

  const totalKg = sumSelectedBucketCapacityKg(orderDetails, bucketList);
  const diff = totalKg - targetWeightKg;
  const targetLabel = targetWeightLabel || `${formatWeightKg(targetWeightKg)} Kg`;

  if (Math.abs(diff) <= WEIGHT_EPSILON) {
    return { ok: true, totalKg };
  }

  if (totalKg > targetWeightKg) {
    return {
      ok: false,
      totalKg,
      message: t('separateMixedGlue.validation.capacityExceedsRequired', {
        total: formatWeightKg(totalKg),
        target: targetLabel,
      }),
    };
  }

  return {
    ok: false,
    totalKg,
    message: t('separateMixedGlue.validation.capacityBelowRequired', {
      total: formatWeightKg(totalKg),
      target: targetLabel,
    }),
  };
};

export const validateChietBucketCapacity = (
  orderDetails: any[],
  bucketList: BucketOption[],
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg'
): { ok: boolean; totalKg: number; message?: string } => {
  const expectedKg = resolveChietTargetCapacityKg(targetWeight, targetWeightUnit);
  const targetLabel = formatEffectiveChietTargetLabel(targetWeight, targetWeightUnit);
  const totalKg = sumSelectedBucketCapacityKg(orderDetails, bucketList);

  if (expectedKg <= 0) {
    return { ok: true, totalKg };
  }

  if (isChietCapacityComplete(totalKg, targetWeight, targetWeightUnit)) {
    return { ok: true, totalKg };
  }

  if (totalKg > expectedKg + WEIGHT_EPSILON) {
    return {
      ok: false,
      totalKg,
      message: t('separateMixedGlue.validation.capacityExceedsWeighed', {
        total: formatWeightKg(totalKg),
        target: targetLabel,
      }),
    };
  }

  return {
    ok: false,
    totalKg,
    message: t('separateMixedGlue.validation.capacityShortageWeighed', {
      total: formatWeightKg(totalKg),
      target: targetLabel,
    }),
  };
};

export const validateSeparateGlueAllocation = (
  orderDetails: any[],
  requestDetails: any[],
  bucketList: BucketOption[],
  targetWeight: number | string | undefined,
  targetWeightUnit = 'Kg',
  options?: { requireAllRequestDetails?: boolean }
): string | null => {
  const requireAllRequestDetails = options?.requireAllRequestDetails ?? true;
  const targetWeightKg = normalizeWeightToKg(targetWeight ?? 0, targetWeightUnit);
  const targetWeightLabel = formatTargetWeightLabel(targetWeight, targetWeightUnit);

  if (targetWeightKg > 0) {
    const capacityResult = requireAllRequestDetails
      ? validateBucketCapacityTotal(
        targetWeightKg,
        orderDetails,
        bucketList,
        targetWeightLabel
      )
      : validateChietBucketCapacity(
        orderDetails,
        bucketList,
        targetWeight,
        targetWeightUnit
      );
    if (!capacityResult.ok) {
      return capacityResult.message || t('separateMixedGlue.validation.capacityMismatch');
    }
  }

  // if (requireAllRequestDetails && !areAllRequestDetailsAssigned(orderDetails, requestDetails)) {
  //   const unassigned = getUnassignedRequestDetailLabels(orderDetails, requestDetails);
  //   return `Còn đơn yêu cầu chưa được chọn: ${unassigned.join(', ')}.`;
  // }

  return null;
};
