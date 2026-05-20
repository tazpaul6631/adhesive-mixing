import type { RequestDetailOption, SeparateGlueRow } from './separateMixedGlue.types';

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
    const requestDetailName = item.requestDetailName ?? '';
    const workOrderWeight = item.workOrderWeight ?? '';
    const workOrderWeightUnit = item.workOrderWeightUnit ?? '';
    const weightLabel = workOrderWeight !== '' && workOrderWeightUnit
      ? ` (${workOrderWeight} ${workOrderWeightUnit})`
      : '';

    return {
      requestDetailId: String(item.requestDetailId ?? ''),
      requestDetailName,
      workOrderWeight,
      workOrderWeightUnit,
      label: `${requestDetailName}${weightLabel}`.trim(),
    };
  });
};

export const resolveSeparateGlueDetails = (
  existingDraft: any,
  respData: any,
  mixGlueMasterId: string
): SeparateGlueRow[] => {
  let rows: any[] = [];

  if (Array.isArray(existingDraft?.separateGlueDetails) && existingDraft.separateGlueDetails.length > 0) {
    rows = existingDraft.separateGlueDetails;
  } else if (Array.isArray(existingDraft?.orderDetails) && existingDraft.orderDetails.length > 0) {
    rows = existingDraft.orderDetails;
  } else if (Array.isArray(respData?.separateGlueDetails) && respData.separateGlueDetails.length > 0) {
    rows = respData.separateGlueDetails;
  } else {
    return [];
  }

  return rows.map((row) => ({
    ...createDefaultSeparateGlueRow(mixGlueMasterId),
    ...row,
    glueId: mixGlueMasterId || '',
    selectedRequestDetailIds: row.selectedRequestDetailIds
      ?? (row.requestDetailId ? [String(row.requestDetailId)] : []),
  }));
};

export const mapNoMixChemicalsFull = (mixChemicals: any[]) => {
  return (mixChemicals || []).map((item: any) => ({
    factoryId: item.factoryId,
    factoryName: item.factoryName,
    styleName: item.styleName,
    materialCode: item.materialCode || '0',
    materialName: item.materialName,
    weightUnit: item.weightUnit || 'Kg',
    requiredWeight: item.requiredWeight || '',
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
