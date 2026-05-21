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
    || !!item.bucketId
    || (Array.isArray(item.selectedRequestDetailIds) && item.selectedRequestDetailIds.length > 0);
};

const buildSeparateGluePayloadItem = (
  item: any,
  glueId: unknown,
  recordStatus: string,
  defaultTime: string,
  forceRecordStatus?: string
) => ({
  glueId: toApiId(glueId),
  bucketId: toApiId(item.selectedBucketId ?? item.bucketId),
  recordStatus: forceRecordStatus ?? (item.recordStatus ? item.recordStatus : recordStatus),
  confirmDate: item.confirmDate || defaultTime,
  requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
});

const buildMixSeparateGluePayloadItem = (
  item: any,
  mixGlueMasterId: string,
  recordStatus: string,
  defaultTime: string,
  forceRecordStatus?: string
) => buildSeparateGluePayloadItem(item, mixGlueMasterId, recordStatus, defaultTime, forceRecordStatus);

const collectChietModalRequestDetailIds = (
  extraChietList: any[],
  materialCode: unknown
): Array<string | number> => {
  const ids = new Set<string>();

  extraChietList
    .filter((extra) => String(extra.glueId) === String(materialCode))
    .forEach((extra) => {
      toApiRequestDetailIds(extra.selectedRequestDetailIds ?? extra.requestDetailIds)
        .forEach((id) => ids.add(String(id)));
    });

  return [...ids].map((id) => toApiId(id));
};

const NO_CHIET_RECORD_STATUS = '1';
const CHIET_MAIN_RECORD_STATUS = 'C';
const CHIET_EXTRA_RECORD_STATUS = '1';

const buildNoSeparateGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string,
  forceRecordStatus?: string
) => {
  const result: Array<Record<string, unknown>> = [];

  ctx.noMixComponents
    .filter(item => item.actualWeight && Number(item.actualWeight) > 0)
    .forEach((item) => {
      const materialCode = item.materialCode;
      const glueWeight = Number(item.actualWeight) || 0;
      const glueWeightUnit = item.weightUnit || 'Kg';
      const confirmDate = item.confirmDate || defaultTime;

      if (!item.isChietCompleted) {
        result.push({
          materialCode: toApiId(materialCode),
          glueWeight,
          glueWeightUnit,
          bucketId: toApiId(0, 0),
          glueExtra: !!item.glueExtra,
          recordStatus: forceRecordStatus ?? NO_CHIET_RECORD_STATUS,
          confirmDate,
          requestDetailIds: [],
        });
        return;
      }

      result.push({
        materialCode: toApiId(materialCode),
        glueWeight,
        glueWeightUnit,
        bucketId: toApiId(item.bucketId ?? 0, 0),
        glueExtra: !!item.glueExtra,
        recordStatus: forceRecordStatus ?? (item.recordStatus || CHIET_MAIN_RECORD_STATUS),
        confirmDate,
        requestDetailIds: collectChietModalRequestDetailIds(ctx.extraChietList, materialCode),
      });

      ctx.extraChietList
        .filter(extra => String(extra.glueId) === String(materialCode))
        .filter(isSeparateGlueRowReady)
        .forEach((extra) => {
          result.push({
            materialCode: toApiId(materialCode),
            glueWeight,
            glueWeightUnit,
            bucketId: toApiId(extra.bucketId ?? extra.selectedBucketId),
            glueExtra: extra.glueExtra != null ? !!extra.glueExtra : !!item.glueExtra,
            recordStatus: forceRecordStatus ?? (extra.recordStatus || CHIET_EXTRA_RECORD_STATUS),
            confirmDate: extra.confirmDate || defaultTime,
            requestDetailIds: toApiRequestDetailIds(
              extra.selectedRequestDetailIds ?? extra.requestDetailIds
            ),
          });
        });
    });

  return result;
};

export const buildSeparateGlueCommandPayload = (
  ctx: PayloadBuildContext,
  recordStatus: string,
  options?: { forComplete?: boolean; forceAllRecordStatus?: string }
) => {
  const defaultTime = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
  const forceRecordStatus = options?.forceAllRecordStatus;

  const separateGlueDetailsForPayload =
    options?.forComplete && ctx.mixChemicals.length === 0 ? [] : ctx.separateGlueDetails;

  const baseSeparateGlues = separateGlueDetailsForPayload
    .filter(isSeparateGlueRowReady)
    .map((item) => buildMixSeparateGluePayloadItem(
      item,
      ctx.mixGlueMasterId,
      recordStatus,
      defaultTime,
      forceRecordStatus
    ));

  const finalSeparateGlues = baseSeparateGlues;

  return {
    factoryId: ctx.factoryId,
    workOrderMasterId: toApiId(ctx.workOrderMasterId),
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    createrId: ctx.employeeId,
    updaterId: ctx.employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues: buildNoSeparateGlues(ctx, defaultTime, forceRecordStatus),
  };
};

/** Thoát: cùng cấu trúc handleComplete, toàn bộ recordStatus = C. */
export const buildSeparateGlueExitPayload = (ctx: PayloadBuildContext) =>
  buildSeparateGlueCommandPayload(ctx, 'C', { forComplete: true, forceAllRecordStatus: 'C' });
