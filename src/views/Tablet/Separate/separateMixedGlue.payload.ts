import dayjs from 'dayjs';
import type { PayloadBuildContext } from './separateMixedGlue.types';

/** Giữ precision cho snowflake ID (> MAX_SAFE_INTEGER) — gửi string, còn lại gửi number. */
export const toApiId = (value: unknown, fallback: string | number = 0): string | number => {
  if (value === '' || value == null) {
    return fallback;
  }

  const normalized = String(value).trim();
  if (!normalized) return fallback;

  const num = Number(normalized);
  if (Number.isSafeInteger(num)) {
    return num;
  }

  return normalized;
};

export const toApiRequestDetailIds = (ids: unknown): Array<string | number> => {
  if (!Array.isArray(ids)) return [];
  return [...new Set(
    ids
      .map((id) => toApiId(id, ''))
      .filter((id) => id !== '' && id != null)
  )];
};

export const isSeparateGlueRowReady = (item: any) => {
  return !!item.selectedBucketId
    || (Array.isArray(item.selectedRequestDetailIds) && item.selectedRequestDetailIds.length > 0);
};

const buildSeparateGluePayloadItem = (
  item: any,
  glueId: unknown,
  recordStatus: string,
  defaultTime: string
) => ({
  glueId: toApiId(glueId),
  bucketId: toApiId(item.selectedBucketId ?? item.bucketId),
  recordStatus,
  confirmDate: item.confirmDate || defaultTime,
  requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
});

const buildMixSeparateGluePayloadItem = (
  item: any,
  mixGlueMasterId: string,
  recordStatus: string,
  defaultTime: string
) => buildSeparateGluePayloadItem(item, mixGlueMasterId, recordStatus, defaultTime);

const collectSelectedRequestDetailIds = (ctx: PayloadBuildContext): Array<string | number> => {
  const ids = new Set<string>();

  ctx.separateGlueDetails.forEach((row) => {
    toApiRequestDetailIds(row.selectedRequestDetailIds).forEach((id) => ids.add(String(id)));
  });

  ctx.extraChietList.forEach((row) => {
    toApiRequestDetailIds(row.selectedRequestDetailIds ?? row.requestDetailIds).forEach((id) => ids.add(String(id)));
  });

  return [...ids].map((id) => toApiId(id));
};

const buildNoSeparateGlues = (
  ctx: PayloadBuildContext,
  recordStatus: string,
  defaultTime: string,
  sharedRequestDetailIds: Array<string | number>
) => {
  return ctx.noMixComponents
    .filter(item => item.actualWeight && Number(item.actualWeight) > 0)
    .map(item => ({
      materialCode: toApiId(item.materialCode),
      glueWeight: Number(item.actualWeight) || 0,
      glueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: !!item.glueExtra,
      recordStatus: item.recordStatus ? item.recordStatus : recordStatus,
      confirmDate: item.confirmDate || defaultTime,
      requestDetailIds: sharedRequestDetailIds,
    }));
};

export const buildSeparateGlueCommandPayload = (
  ctx: PayloadBuildContext,
  recordStatus: string,
  options?: { forComplete?: boolean }
) => {
  const defaultTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  const separateGlueDetailsForPayload =
    options?.forComplete && ctx.mixChemicals.length === 0 ? [] : ctx.separateGlueDetails;

  const baseSeparateGlues = separateGlueDetailsForPayload
    .filter(isSeparateGlueRowReady)
    .map((item) => buildMixSeparateGluePayloadItem(item, ctx.mixGlueMasterId, recordStatus, defaultTime));

  const separateGluesFromChiet = ctx.extraChietList
    .filter(isSeparateGlueRowReady)
    .map((item) => buildSeparateGluePayloadItem(item, item.glueId, recordStatus, defaultTime));

  const finalSeparateGlues = [...baseSeparateGlues, ...separateGluesFromChiet];
  const sharedRequestDetailIds = collectSelectedRequestDetailIds(ctx);

  return {
    factoryId: ctx.factoryId,
    workOrderMasterId: toApiId(ctx.workOrderMasterId),
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    createrId: ctx.employeeId,
    updaterId: ctx.employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues: buildNoSeparateGlues(ctx, recordStatus, defaultTime, sharedRequestDetailIds),
  };
};

/** Thoát: recordStatus C — chỉ gửi bảng 1 nếu có chọn thùng / chiết; bảng 2 chỉ dòng đã cân. */
export const buildSeparateGlueExitPayload = (ctx: PayloadBuildContext) => {
  const recordStatus = 'C';
  const defaultTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');

  const table1Touched =
    ctx.separateGlueDetails.some(isSeparateGlueRowReady)
    || ctx.extraChietList.some(isSeparateGlueRowReady);

  const baseSeparateGlues = table1Touched
    ? ctx.separateGlueDetails
      .filter(isSeparateGlueRowReady)
      .map((item) => buildMixSeparateGluePayloadItem(item, ctx.mixGlueMasterId, recordStatus, defaultTime))
    : [];

  const separateGluesExtra = table1Touched
    ? ctx.extraChietList
      .filter(isSeparateGlueRowReady)
      .map((item) => buildSeparateGluePayloadItem(item, item.glueId, recordStatus, defaultTime))
    : [];

  const finalSeparateGlues = table1Touched ? [...baseSeparateGlues, ...separateGluesExtra] : [];
  const sharedRequestDetailIds = collectSelectedRequestDetailIds(ctx);

  return {
    factoryId: ctx.factoryId,
    workOrderMasterId: toApiId(ctx.workOrderMasterId),
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    createrId: ctx.employeeId,
    updaterId: ctx.employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues: buildNoSeparateGlues(ctx, recordStatus, defaultTime, sharedRequestDetailIds),
  };
};
