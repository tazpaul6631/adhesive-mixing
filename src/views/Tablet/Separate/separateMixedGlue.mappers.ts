import format from '@/mixins/format';
import type { HeaderInfo, RequestDetailOption, SeparateGlueRow } from './separateMixedGlue.types';

const formatGlueWeightDisplay = (weight: unknown): string | null => {
  if (weight === undefined || weight === null || weight === '') return null;
  const num = Number(weight);
  if (!Number.isFinite(num)) return null;
  return num.toFixed(3);
};

/** noMix: chỉ lấy glueWeight object đầu tiên trong noSeparateGlues, không cộng dồn. */
export const resolveNoMixGlueWeightFromApi = (respData: any): string => {
  const noSeparateGlues = respData?.noSeparateGlues;
  if (Array.isArray(noSeparateGlues) && noSeparateGlues.length > 0) {
    const fromFirst = formatGlueWeightDisplay(noSeparateGlues[0]?.glueWeight);
    if (fromFirst != null) return fromFirst;
  }
  return respData?.totalNoMixGlueWeight?.toString() || '0.000';
};

export const mapSeparateHeaderInfo = (respData: any): HeaderInfo => ({
  orderNo: respData?.workOrderMasterName || '',
  glue: respData?.chemicalMasterName || respData?.glueName || '',
  totalWeight: respData?.workOrderWeight?.toString() || '',
  totalMixGlueWeight: respData?.totalMixGlueWeight?.toString() || '0.000',
  totalNoMixGlueWeight: resolveNoMixGlueWeightFromApi(respData),
  isNoMixGlue: Boolean(respData?.isNoMixGlue),
});

export const createDefaultSeparateGlueRow = (mixGlueMasterId: string): SeparateGlueRow => ({
  glueId: mixGlueMasterId || '',
  selectedRequestDetailIds: [],
  selectedBucketId: null,
  operator: '',
  operatorId: '',
  confirmTime: null,
  confirmDate: null,
});

export const normalizeRequestDetails = (respData: any): RequestDetailOption[] => {
  const items = respData?.requestDetails ?? respData?.orderDetails ?? [];
  return items.map((item: any) => {
    const requestDetailName =
      item.requestDetailName ?? item.productLineName ?? item.styleName ?? '';
    const requestDetailId = String(
      item.requestDetailId ?? item.workOrderDetailId ?? item.styleId ?? ''
    );
    const workOrderWeight = item.workOrderWeight ?? '';
    const workOrderWeightUnit = item.workOrderWeightUnit ?? 'Kg';
    const weightLabel = workOrderWeight !== '' && workOrderWeightUnit
      ? ` (${workOrderWeight} ${workOrderWeightUnit})`
      : '';

    return {
      requestDetailId,
      requestDetailName,
      workOrderWeight,
      workOrderWeightUnit,
      label: `${requestDetailName}${weightLabel}`.trim(),
    };
  });
};

const mapSeparateGlueRows = (rows: any[], mixGlueMasterId: string): SeparateGlueRow[] =>
  (rows || []).map((row) => ({
    ...createDefaultSeparateGlueRow(mixGlueMasterId),
    ...row,
    glueId: mixGlueMasterId || String(row.glueId ?? ''),
    selectedBucketId: row.selectedBucketId ?? row.bucketId ?? null,
    selectedRequestDetailIds: row.selectedRequestDetailIds
      ?? (Array.isArray(row.requestDetailIds) ? row.requestDetailIds.map(String) : [])
      ?? (row.requestDetailId ? [String(row.requestDetailId)] : []),
    confirmTime: row.confirmTime ?? (row.confirmDate ? format.formatDate(row.confirmDate) : null),
    confirmDate: row.confirmDate ?? null,
  }));

export const resolveSeparateGlueDetails = (
  existingDraft: any,
  respData: any,
  mixGlueMasterId: string
): SeparateGlueRow[] => {
  let rows: any[] = [];

  if (Array.isArray(existingDraft?.separateGlueDetails) && existingDraft.separateGlueDetails.length > 0) {
    rows = existingDraft.separateGlueDetails;
  } else if (Array.isArray(respData?.separateGlues) && respData.separateGlues.length > 0) {
    rows = respData.separateGlues;
  } else if (Array.isArray(respData?.separateGlueDetails) && respData.separateGlueDetails.length > 0) {
    rows = respData.separateGlueDetails;
  } else {
    return [];
  }

  return mapSeparateGlueRows(rows, mixGlueMasterId);
};

export const resolveNoMixSeparateGlueDetails = (
  existingDraft: any,
  respData: any,
  noMixGlueId: string,
  isNoMixGlue = false
): SeparateGlueRow[] => {
  let rows: any[] = [];

  if (Array.isArray(existingDraft?.noMixSeparateGlueDetails) && existingDraft.noMixSeparateGlueDetails.length > 0) {
    rows = existingDraft.noMixSeparateGlueDetails;
  } else if (
    !isNoMixGlue
    && Array.isArray(respData?.noSeparateGlues)
    && respData.noSeparateGlues.length > 0
  ) {
    rows = respData.noSeparateGlues;
  } else {
    return [];
  }

  return mapSeparateGlueRows(rows, noMixGlueId);
};

export const mapNoMixChemicalsFull = (mixChemicals: any[]) => {
  return (mixChemicals || []).map((item: any) => ({
    factoryId: item.factoryId,
    factoryName: item.factoryName,
    styleName: item.styleName,
    materialCode: item.materialCode || '0',
    materialName: item.materialName,
    weightUnit: item.weightUnit || 'Kg',
    glueWeight: item.glueWeight ?? item.requiredWeight ?? '',
    requiredWeight: item.requiredWeight || item.glueWeight || '',
    actualWeight: item.actualWeight || '',
    lowerTolerance: item.lowerTolerance || '0',
    upperTolerance: item.upperTolerance || '0',
    mixingRatio: item.mixingRatio || '100',
    glueExtra: item.glueExtra || false,
  }));
};

export const applyMixGlueMasterId = (
  respData: any,
  draftFallback: unknown,
  setMixGlueMasterId: (value: string) => void
) => {
  const fromApi = respData?.mixGlueMasterId;
  if (fromApi !== '' && fromApi != null) {
    setMixGlueMasterId(String(fromApi));
    return;
  }

  if (draftFallback != null && draftFallback !== '') {
    setMixGlueMasterId(String(draftFallback));
  }
};

export const syncSeparateGlueRowGlueIds = (
  rows: SeparateGlueRow[],
  mixGlueMasterId: string
): SeparateGlueRow[] => {
  if (!mixGlueMasterId) return rows;

  return rows.map((row) => ({
    ...row,
    glueId: mixGlueMasterId,
  }));
};

export const resolveSplitSeparateGlueDetails = (
  existingDraft: any,
  respData: any,
  mixGlueMasterId: string,
  hasMix: boolean,
  hasNoMix: boolean,
  noMixGlueId: string,
  isNoMixGlue = false
): { mixRows: SeparateGlueRow[]; noMixRows: SeparateGlueRow[] } => {
  const resolvedMix = resolveSeparateGlueDetails(existingDraft, respData, mixGlueMasterId);
  const resolvedNoMix = resolveNoMixSeparateGlueDetails(existingDraft, respData, noMixGlueId, isNoMixGlue);
  const draftMix = Array.isArray(existingDraft?.separateGlueDetails) ? existingDraft.separateGlueDetails : [];
  const draftNoMix = Array.isArray(existingDraft?.noMixSeparateGlueDetails)
    ? existingDraft.noMixSeparateGlueDetails
    : [];

  const pickMixRows = () => (
    draftMix.length > 0 ? mapSeparateGlueRows(draftMix, mixGlueMasterId) : resolvedMix
  );
  const pickNoMixRows = () => {
    if (draftNoMix.length > 0) return mapSeparateGlueRows(draftNoMix, noMixGlueId);
    if (isNoMixGlue) return [];
    return resolvedNoMix;
  };

  if (hasMix && hasNoMix) {
    return {
      mixRows: pickMixRows(),
      noMixRows: pickNoMixRows().map((row: SeparateGlueRow) => ({
        ...row,
        glueId: noMixGlueId || row.glueId,
      })),
    };
  }

  if (hasMix) {
    return {
      mixRows: pickMixRows(),
      noMixRows: [],
    };
  }

  if (hasNoMix) {
    return {
      mixRows: [],
      noMixRows: pickNoMixRows().map((row: SeparateGlueRow) => ({
        ...row,
        glueId: noMixGlueId || row.glueId,
      })),
    };
  }

  return { mixRows: [], noMixRows: [] };
};
