import dayjs from 'dayjs';
import type { PayloadBuildContext } from './separateMixedGlue.types';
import { isRecordStatusCancelled } from './noSeparateGlueSync';

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
  seq: number,
  forceRecordStatus?: string
) => ({
  glueId: toApiId(glueId),
  bucketId: toApiId(item.selectedBucketId ?? item.bucketId),
  recordStatus: forceRecordStatus ?? (item.recordStatus ? item.recordStatus : recordStatus),
  confirmDate: item.confirmDate || defaultTime,
  seq,
  requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
});

const buildMixSeparateGluePayloadItem = (
  item: any,
  mixGlueMasterId: string,
  recordStatus: string,
  defaultTime: string,
  seq: number,
  forceRecordStatus?: string
) => buildSeparateGluePayloadItem(item, mixGlueMasterId, recordStatus, defaultTime, seq, forceRecordStatus);

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

const normalizeApiNoSeparateGlueItem = (
  item: any,
  defaultTime?: string,
  seq?: number
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {
    materialCode: toApiId(item.materialCode),
    glueWeight: Number(item.glueWeight) || 0,
    glueWeightUnit: item.glueWeightUnit || 'Kg',
    bucketId: toApiId(item.bucketId ?? 0, 0),
    glueExtra: !!item.glueExtra,
    recordStatus: item.recordStatus,
    confirmDate: item.confirmDate || defaultTime,
    requestDetailIds: toApiRequestDetailIds(item.requestDetailIds),
  };

  if (item.noSeparateGlueId != null) {
    normalized.noSeparateGlueId = toApiId(item.noSeparateGlueId);
  }

  const resolvedSeq = seq ?? item.seq;
  if (resolvedSeq != null && resolvedSeq !== '') {
    normalized.seq = Number(resolvedSeq) || resolvedSeq;
  }

  return normalized;
};

const buildNoMixSeparateTableGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string
): Array<Record<string, unknown>> => {
  const noMixChemical = ctx.noMixChemicals[0];
  if (!noMixChemical) return [];

  const materialCode = noMixChemical.materialCode;
  const glueWeight = Number(
    ctx.totalNoMixGlueWeight
    ?? noMixChemical.glueWeight
    ?? noMixChemical.actualWeight
    ?? 0
  );
  const glueWeightUnit = noMixChemical.weightUnit || 'Kg';

  return (ctx.noMixSeparateGlueDetails || [])
    .filter(isSeparateGlueRowReady)
    .map((item, index) => {
      const payload: Record<string, unknown> = {
        materialCode: toApiId(materialCode),
        glueWeight,
        glueWeightUnit,
        bucketId: toApiId(item.selectedBucketId ?? item.bucketId),
        glueExtra: !!noMixChemical.glueExtra,
        recordStatus: item.recordStatus || NO_CHIET_RECORD_STATUS,
        confirmDate: item.confirmDate || defaultTime,
        seq: index + 1,
        requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
      };
      if (item.noSeparateGlueId != null && String(item.noSeparateGlueId) !== '') {
        payload.noSeparateGlueId = toApiId(item.noSeparateGlueId);
      }
      return payload;
    });
};

const mergeCancelledApiNoSeparateGlues = (
  items: Array<Record<string, unknown>>,
  ctx: PayloadBuildContext,
  defaultTime: string
): Array<Record<string, unknown>> => {
  const merged = [...items];
  const existingIds = new Set(
    merged
      .map((item) => item.noSeparateGlueId)
      .filter((id) => id != null && id !== '')
      .map(String)
  );

  (ctx.apiNoSeparateGlues || [])
    .filter((item) => isRecordStatusCancelled(item?.recordStatus))
    .forEach((item) => {
      const normalized = normalizeApiNoSeparateGlueItem(item, defaultTime);
      normalized.recordStatus = CHIET_MAIN_RECORD_STATUS;
      const id = normalized.noSeparateGlueId != null ? String(normalized.noSeparateGlueId) : '';
      if (id && existingIds.has(id)) return;
      if (id) existingIds.add(id);
      merged.push(normalized);
    });

  return merged;
};

const isRecordStatus = (value: unknown, status: string) =>
  String(value ?? '').toUpperCase() === status.toUpperCase();

const withRecordStatus = (
  item: any,
  recordStatus: string,
  defaultTime: string
): Record<string, unknown> => ({
  ...normalizeApiNoSeparateGlueItem(item, defaultTime),
  recordStatus,
  confirmDate: defaultTime,
});

const buildIsNoMixGlueCompleteNoSeparateGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string
): Array<Record<string, unknown>> => {
  const apiItems = ctx.apiNoSeparateGlues || [];
  const hasAddRow = (ctx.noMixSeparateGlueDetails || []).length > 0;
  const tableRows = buildNoMixSeparateTableGlues(ctx, defaultTime);
  const first = apiItems[0];
  const rest = apiItems.slice(1).map((item) => normalizeApiNoSeparateGlueItem(item, defaultTime));

  if (!first) {
    return mergeCancelledApiNoSeparateGlues(hasAddRow ? tableRows : [], ctx, defaultTime);
  }

  const firstIsC = isRecordStatus(first.recordStatus, CHIET_MAIN_RECORD_STATUS);
  const firstIs1 = isRecordStatus(first.recordStatus, NO_CHIET_RECORD_STATUS);

  // Trường hợp 1: object đầu tiên recordStatus = C
  if (firstIsC) {
    if (!hasAddRow) {
      return mergeCancelledApiNoSeparateGlues(
        [withRecordStatus(first, NO_CHIET_RECORD_STATUS, defaultTime), ...rest],
        ctx,
        defaultTime
      );
    }
    return mergeCancelledApiNoSeparateGlues(tableRows, ctx, defaultTime);
  }

  // Trường hợp 2: object đầu tiên recordStatus = 1
  if (firstIs1) {
    if (!hasAddRow) {
      return mergeCancelledApiNoSeparateGlues(
        apiItems.map((item) => normalizeApiNoSeparateGlueItem(item, defaultTime)),
        ctx,
        defaultTime
      );
    }
    return mergeCancelledApiNoSeparateGlues(
      [withRecordStatus(first, CHIET_MAIN_RECORD_STATUS, defaultTime), ...rest, ...tableRows],
      ctx,
      defaultTime
    );
  }

  if (!hasAddRow) {
    return mergeCancelledApiNoSeparateGlues(
      apiItems.map((item) => normalizeApiNoSeparateGlueItem(item, defaultTime)),
      ctx,
      defaultTime
    );
  }

  return mergeCancelledApiNoSeparateGlues(
    [...apiItems.map((item) => normalizeApiNoSeparateGlueItem(item, defaultTime)), ...tableRows],
    ctx,
    defaultTime
  );
};

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
          seq: 1,
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
        seq: 1,
        requestDetailIds: collectChietModalRequestDetailIds(ctx.extraChietList, materialCode),
      });

      ctx.extraChietList
        .filter(extra => String(extra.glueId) === String(materialCode))
        .filter(isSeparateGlueRowReady)
        .forEach((extra, extraIndex) => {
          result.push({
            materialCode: toApiId(materialCode),
            glueWeight,
            glueWeightUnit,
            bucketId: toApiId(extra.bucketId ?? extra.selectedBucketId),
            glueExtra: extra.glueExtra != null ? !!extra.glueExtra : !!item.glueExtra,
            recordStatus: forceRecordStatus ?? (extra.recordStatus || CHIET_EXTRA_RECORD_STATUS),
            confirmDate: extra.confirmDate || defaultTime,
            seq: extraIndex + 2,
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
  const isNoMixGlueComplete = Boolean(ctx.isNoMixGlue && options?.forComplete && !forceRecordStatus);

  const mixSeparateRows = ctx.mixChemicals.length > 0 ? ctx.separateGlueDetails : [];
  const includeNoMixInSeparateGlues = ctx.noMixChemicals.length > 0 && !ctx.isNoMixGlue;
  const noMixSeparateRows = includeNoMixInSeparateGlues ? (ctx.noMixSeparateGlueDetails || []) : [];
  const defaultNoMixGlueId = String(ctx.noMixChemicals[0]?.materialCode ?? '');

  const baseSeparateGlues = [
    ...mixSeparateRows
      .filter(isSeparateGlueRowReady)
      .map((item, index) => buildMixSeparateGluePayloadItem(
        item,
        ctx.mixGlueMasterId,
        recordStatus,
        defaultTime,
        index + 1,
        forceRecordStatus
      )),
    ...noMixSeparateRows
      .filter(isSeparateGlueRowReady)
      .map((item, index) => buildSeparateGluePayloadItem(
        item,
        item.glueId || defaultNoMixGlueId,
        recordStatus,
        defaultTime,
        index + 1,
        forceRecordStatus
      )),
  ];

  const finalSeparateGlues = baseSeparateGlues;
  const noSeparateGlues = isNoMixGlueComplete
    ? buildIsNoMixGlueCompleteNoSeparateGlues(ctx, defaultTime)
    : buildNoSeparateGlues(ctx, defaultTime, forceRecordStatus);

  return {
    factoryId: ctx.factoryId,
    workOrderMasterId: toApiId(ctx.workOrderMasterId),
    startDate: ctx.startDate,
    endDate: ctx.endDate,
    createrId: ctx.employeeId,
    updaterId: ctx.employeeId,
    separateGlues: finalSeparateGlues,
    noSeparateGlues,
  };
};

/** Thoát: cùng cấu trúc handleComplete, toàn bộ recordStatus = C. */
export const buildSeparateGlueExitPayload = (ctx: PayloadBuildContext) =>
  buildSeparateGlueCommandPayload(ctx, 'C', { forComplete: true, forceAllRecordStatus: 'C' });
