import dayjs from 'dayjs';
import type { PayloadBuildContext } from './separateMixedGlue.types';
import { isRecordStatusCancelled } from './noSeparateGlueSync';
import { filterMixApiSeparateGlues, filterNoMixInMixApiSeparateGlues } from './separateGlueSeqSync';

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

const NO_CHIET_RECORD_STATUS = '1';
const CHIET_MAIN_RECORD_STATUS = 'C';
const CHIET_EXTRA_RECORD_STATUS = '1';

const hasPersistedSeparateGlueLineId = (value: unknown): boolean =>
  value != null && value !== '' && String(value) !== '0';

const isZeroBucketIdValue = (value: unknown): boolean => {
  if (value == null || value === '') return true;
  return String(value) === '0';
};

/** bucketId = 0 + separateGlueId/noSeparateGlueId đã lưu BE → gửi recordStatus C khi submit. */
export const shouldSubmitAsCancelledZeroBucket = (item: {
  bucketId?: unknown;
  selectedBucketId?: unknown;
  separateGlueId?: unknown;
  noSeparateGlueId?: unknown;
}): boolean => {
  const bucketId = item.bucketId ?? item.selectedBucketId;
  if (!isZeroBucketIdValue(bucketId)) return false;
  return hasPersistedSeparateGlueLineId(item.separateGlueId)
    || hasPersistedSeparateGlueLineId(item.noSeparateGlueId);
};

const resolveSeparateGlueSubmitRecordStatus = (
  item: any,
  bucketId: string | number,
  defaultRecordStatus: string,
  forceRecordStatus?: string
): string => {
  if (shouldSubmitAsCancelledZeroBucket({ ...item, bucketId })) {
    return CHIET_MAIN_RECORD_STATUS;
  }
  if (forceRecordStatus) return forceRecordStatus;
  return item.recordStatus ? String(item.recordStatus) : defaultRecordStatus;
};

const isSeparateGlueRowForSubmit = (item: any) =>
  isSeparateGlueRowReady(item) || shouldSubmitAsCancelledZeroBucket(item);

const buildSeparateGluePayloadItem = (
  item: any,
  glueId: unknown,
  recordStatus: string,
  defaultTime: string,
  seq: number,
  forceRecordStatus?: string
) => {
  const bucketId = toApiId(item.selectedBucketId ?? item.bucketId, 0);
  const payload: Record<string, unknown> = {
    glueId: toApiId(glueId),
    bucketId,
    recordStatus: resolveSeparateGlueSubmitRecordStatus(
      item,
      bucketId,
      recordStatus,
      forceRecordStatus
    ),
    confirmDate: item.confirmDate || defaultTime,
    seq: Number(item?.seq) || seq,
    requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
  };

  if (
    item.separateGlueId != null
    && String(item.separateGlueId) !== ''
    && String(item.separateGlueId) !== '0'
  ) {
    payload.separateGlueId = toApiId(item.separateGlueId);
  }

  if (
    item.noSeparateGlueId != null
    && String(item.noSeparateGlueId) !== ''
    && String(item.noSeparateGlueId) !== '0'
  ) {
    payload.noSeparateGlueId = toApiId(item.noSeparateGlueId);
  }

  return payload;
};

const buildMixSeparateGluePayloadItem = (
  item: any,
  mixGlueMasterId: string,
  recordStatus: string,
  defaultTime: string,
  seq: number,
  forceRecordStatus?: string
) => buildSeparateGluePayloadItem(item, mixGlueMasterId, recordStatus, defaultTime, seq, forceRecordStatus);

const getMixSeparateGluePayloadDedupeKey = (item: Record<string, unknown>): string => {
  const id = item.separateGlueId != null ? String(item.separateGlueId) : '';
  if (id && id !== '0') {
    return `sg:${id}|${item.bucketId ?? ''}|${item.recordStatus ?? ''}`;
  }
  return [
    'glue',
    item.glueId ?? '',
    'bucket',
    item.bucketId ?? '',
    'seq',
    item.seq ?? '',
    'status',
    item.recordStatus ?? '',
  ].join(':');
};

const apiItemToMixSeparateGluePayload = (
  item: any,
  glueId: string,
  defaultTime: string,
  forceRecordStatus: string
) => buildSeparateGluePayloadItem(
  {
    ...item,
    selectedBucketId: item.bucketId ?? item.selectedBucketId,
    selectedRequestDetailIds: item.requestDetailIds,
    separateGlueId: item.separateGlueId,
    noSeparateGlueId: item.noSeparateGlueId,
  },
  glueId,
  '1',
  defaultTime,
  Number(item?.seq) || 1,
  forceRecordStatus
);

const mergeCancelledMixApiSeparateGlues = (
  items: Array<Record<string, unknown>>,
  ctx: PayloadBuildContext,
  defaultTime: string,
  glueId: string
): Array<Record<string, unknown>> => {
  const merged = [...items];
  const existingKeys = new Set(merged.map((item) => getMixSeparateGluePayloadDedupeKey(item)));

  filterMixApiSeparateGlues(ctx.apiSeparateGlues || [], glueId)
    .filter((item) => isRecordStatusCancelled(item?.recordStatus))
    .forEach((item) => {
      const normalized = apiItemToMixSeparateGluePayload(item, glueId, defaultTime, CHIET_MAIN_RECORD_STATUS);
      const key = getMixSeparateGluePayloadDedupeKey(normalized);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      merged.push(normalized);
    });

  filterMixApiSeparateGlues(ctx.apiSeparateGlues || [], glueId)
    .filter((item) => !isRecordStatusCancelled(item?.recordStatus))
    .filter((item) => shouldSubmitAsCancelledZeroBucket(item))
    .forEach((item) => {
      const normalized = apiItemToMixSeparateGluePayload(item, glueId, defaultTime, CHIET_MAIN_RECORD_STATUS);
      const key = getMixSeparateGluePayloadDedupeKey(normalized);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      merged.push(normalized);
    });

  (ctx.cancelledSeparateGlueDetails || [])
    .filter((item) => String(item?.glueId ?? glueId) === String(glueId))
    .forEach((item) => {
      const normalized = buildSeparateGluePayloadItem(
        item,
        item.glueId || glueId,
        '1',
        defaultTime,
        Number(item?.seq) || merged.length + 1,
        CHIET_MAIN_RECORD_STATUS
      );
      const key = getMixSeparateGluePayloadDedupeKey(normalized);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      merged.push(normalized);
    });

  return merged;
};

/** Complete keo trộn: gửi dòng bảng (1) + dòng delete (C) — update-bucket giữ id, không tạo object mới. */
const buildMixCompleteSeparateGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string,
  activeForceRecordStatus?: string
): Array<Record<string, unknown>> => {
  const mixApiItems = filterMixApiSeparateGlues(ctx.apiSeparateGlues || [], ctx.mixGlueMasterId);
  const tableRows = (ctx.separateGlueDetails || [])
    .filter(isSeparateGlueRowForSubmit)
    .map((item, index) => buildMixSeparateGluePayloadItem(
      item,
      ctx.mixGlueMasterId,
      '1',
      defaultTime,
      Number(item?.seq) || index + 1,
      activeForceRecordStatus
    ));

  const hasCancelled = (ctx.cancelledSeparateGlueDetails || []).some(
    (item) => String(item?.glueId ?? ctx.mixGlueMasterId) === String(ctx.mixGlueMasterId)
  );

  if (tableRows.length === 0 && mixApiItems.length === 0 && !hasCancelled) {
    return [];
  }

  return mergeCancelledMixApiSeparateGlues(
    tableRows,
    ctx,
    defaultTime,
    ctx.mixGlueMasterId
  );
};

/** Re-submit keo không trộn trong đơn mix (nằm trong separateGlues). */
const buildNoMixInMixCompleteSeparateGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string,
  activeForceRecordStatus?: string
): Array<Record<string, unknown>> => {
  const noMixGlueId = String(ctx.noMixChemicals[0]?.materialCode ?? '');
  const noMixApiItems = filterNoMixInMixApiSeparateGlues(ctx.apiSeparateGlues || [], noMixGlueId);
  const tableRows = (ctx.noMixSeparateGlueDetails || [])
    .filter(isSeparateGlueRowForSubmit)
    .map((item, index) => buildSeparateGluePayloadItem(
      item,
      item.glueId || noMixGlueId,
      '1',
      defaultTime,
      Number(item?.seq) || index + 1,
      activeForceRecordStatus
    ));

  const hasCancelled = (ctx.cancelledSeparateGlueDetails || []).some(
    (item) => String(item?.glueId ?? noMixGlueId) === String(noMixGlueId)
  );

  if (tableRows.length === 0 && noMixApiItems.length === 0 && !hasCancelled) {
    return [];
  }

  return mergeCancelledMixApiSeparateGlues(
    tableRows,
    ctx,
    defaultTime,
    noMixGlueId
  );
};

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

const normalizeApiNoSeparateGlueItem = (
  item: any,
  defaultTime?: string,
  seq?: number,
  forceRecordStatus?: string
): Record<string, unknown> => {
  const bucketId = toApiId(item.bucketId ?? item.selectedBucketId ?? 0, 0);
  const normalized: Record<string, unknown> = {
    materialCode: toApiId(item.materialCode),
    glueWeight: Number(item.glueWeight) || 0,
    glueWeightUnit: item.glueWeightUnit || 'Kg',
    bucketId,
    glueExtra: !!item.glueExtra,
    recordStatus: resolveSeparateGlueSubmitRecordStatus(
      item,
      bucketId,
      String(item.recordStatus ?? NO_CHIET_RECORD_STATUS),
      forceRecordStatus
    ),
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
    .filter(isSeparateGlueRowForSubmit)
    .map((item, index) => {
      const bucketId = toApiId(item.selectedBucketId ?? item.bucketId, 0);
      const payload: Record<string, unknown> = {
        materialCode: toApiId(materialCode),
        glueWeight,
        glueWeightUnit,
        bucketId,
        glueExtra: !!noMixChemical.glueExtra,
        recordStatus: resolveSeparateGlueSubmitRecordStatus(
          item,
          bucketId,
          NO_CHIET_RECORD_STATUS
        ),
        confirmDate: item.confirmDate || defaultTime,
        seq: Number(item?.seq) || index + 1,
        requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
      };
      if (
        item.noSeparateGlueId != null
        && String(item.noSeparateGlueId) !== ''
        && String(item.noSeparateGlueId) !== '0'
      ) {
        payload.noSeparateGlueId = toApiId(item.noSeparateGlueId);
      }
      return payload;
    });
};

const hasPersistedNoSeparateGlueId = (value: unknown): boolean =>
  value != null && value !== '' && String(value) !== '0';

/** Dòng delete noMix (có noSeparateGlueId) → object noSeparateGlues recordStatus C. */
const buildNoMixCancelledPayloadFromRow = (
  item: any,
  ctx: PayloadBuildContext,
  defaultTime: string
): Record<string, unknown> | null => {
  if (!hasPersistedNoSeparateGlueId(item?.noSeparateGlueId)) return null;

  const noMixChemical = ctx.noMixChemicals[0];
  if (!noMixChemical) return null;

  const materialCode = noMixChemical.materialCode;
  const glueWeight = Number(
    ctx.totalNoMixGlueWeight
    ?? noMixChemical.glueWeight
    ?? noMixChemical.actualWeight
    ?? 0
  );
  const bucketId = toApiId(item.selectedBucketId ?? item.bucketId, 0);

  return {
    materialCode: toApiId(materialCode),
    glueWeight,
    glueWeightUnit: noMixChemical.weightUnit || 'Kg',
    bucketId,
    glueExtra: !!noMixChemical.glueExtra,
    recordStatus: CHIET_MAIN_RECORD_STATUS,
    confirmDate: item.confirmDate || defaultTime,
    seq: Number(item?.seq) || 1,
    requestDetailIds: toApiRequestDetailIds(item.selectedRequestDetailIds ?? item.requestDetailIds),
    noSeparateGlueId: toApiId(item.noSeparateGlueId),
  };
};

const getNoSeparateGluePayloadDedupeKey = (item: Record<string, unknown>): string => {
  const id = item.noSeparateGlueId != null ? String(item.noSeparateGlueId) : '';
  const status = String(item.recordStatus ?? '').toUpperCase();
  const bucket = item.bucketId ?? '';
  const seq = item.seq ?? '';
  if (id && id !== '0') {
    return `id:${id}|${status}|${bucket}`;
  }
  return [
    'bucket',
    bucket,
    'seq',
    seq,
    'status',
    status,
    'weight',
    item.glueWeight ?? '',
  ].join(':');
};

const dedupeNoSeparateGluePayload = (
  items: Array<Record<string, unknown>>
): Array<Record<string, unknown>> => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = getNoSeparateGluePayloadDedupeKey(item);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeCancelledApiNoSeparateGlues = (
  items: Array<Record<string, unknown>>,
  ctx: PayloadBuildContext,
  defaultTime: string
): Array<Record<string, unknown>> => {
  const merged = [...items];
  const existingKeys = new Set(merged.map((item) => getNoSeparateGluePayloadDedupeKey(item)));

  (ctx.apiNoSeparateGlues || [])
    .filter((item) => isRecordStatusCancelled(item?.recordStatus))
    .forEach((item) => {
      const normalized = normalizeApiNoSeparateGlueItem(item, defaultTime);
      normalized.recordStatus = CHIET_MAIN_RECORD_STATUS;
      const key = getNoSeparateGluePayloadDedupeKey(normalized);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      merged.push(normalized);
    });

  (ctx.apiNoSeparateGlues || [])
    .filter((item) => !isRecordStatusCancelled(item?.recordStatus))
    .filter((item) => shouldSubmitAsCancelledZeroBucket(item))
    .forEach((item) => {
      const normalized = normalizeApiNoSeparateGlueItem(item, defaultTime, undefined, CHIET_MAIN_RECORD_STATUS);
      const key = getNoSeparateGluePayloadDedupeKey(normalized);
      if (existingKeys.has(key)) return;
      existingKeys.add(key);
      merged.push(normalized);
    });

  (ctx.cancelledSeparateGlueDetails || []).forEach((item) => {
    const normalized = buildNoMixCancelledPayloadFromRow(item, ctx, defaultTime);
    if (!normalized) return;
    const key = getNoSeparateGluePayloadDedupeKey(normalized);
    if (existingKeys.has(key)) return;
    existingKeys.add(key);
    merged.push(normalized);
  });

  return merged;
};

const buildIsNoMixGlueCompleteNoSeparateGlues = (
  ctx: PayloadBuildContext,
  defaultTime: string
): Array<Record<string, unknown>> => {
  const apiItems = ctx.apiNoSeparateGlues || [];
  const tableRows = buildNoMixSeparateTableGlues(ctx, defaultTime);
  const hasTableRows = tableRows.length > 0;

  if (!hasTableRows && apiItems.length === 0) {
    return [];
  }

  const hasCancelledApi = apiItems.some((item) => isRecordStatusCancelled(item?.recordStatus));

  if (!hasTableRows && apiItems.length === 0 && !hasCancelledApi) {
    return [];
  }

  return dedupeNoSeparateGluePayload(
    mergeCancelledApiNoSeparateGlues(
      tableRows,
      ctx,
      defaultTime
    )
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
        .filter(isSeparateGlueRowForSubmit)
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
  const isCompleteSubmit = Boolean(options?.forComplete && !forceRecordStatus);
  const activeForceRecordStatus = isCompleteSubmit ? NO_CHIET_RECORD_STATUS : forceRecordStatus;

  const mixSeparateRows = ctx.mixChemicals.length > 0 ? ctx.separateGlueDetails : [];
  const includeNoMixInSeparateGlues = ctx.noMixChemicals.length > 0 && !ctx.isNoMixGlue;
  const noMixSeparateRows = includeNoMixInSeparateGlues ? (ctx.noMixSeparateGlueDetails || []) : [];
  const defaultNoMixGlueId = String(ctx.noMixChemicals[0]?.materialCode ?? '');
  const isNoMixGlueComplete = Boolean(ctx.isNoMixGlue && options?.forComplete && !forceRecordStatus);
  const useMixOrderCompleteResubmit = Boolean(
    isCompleteSubmit && !ctx.isNoMixGlue && ctx.mixChemicals.length > 0
  );

  let baseSeparateGlues: Array<Record<string, unknown>>;

  if (useMixOrderCompleteResubmit) {
    baseSeparateGlues = buildMixCompleteSeparateGlues(ctx, defaultTime, activeForceRecordStatus);
    if (includeNoMixInSeparateGlues) {
      baseSeparateGlues = [
        ...baseSeparateGlues,
        ...buildNoMixInMixCompleteSeparateGlues(ctx, defaultTime, activeForceRecordStatus),
      ];
    }
  } else {
    baseSeparateGlues = [
      ...mixSeparateRows
        .filter(isSeparateGlueRowForSubmit)
        .map((item, index) => buildMixSeparateGluePayloadItem(
          item,
          ctx.mixGlueMasterId,
          recordStatus,
          defaultTime,
          index + 1,
          activeForceRecordStatus
        )),
      ...noMixSeparateRows
        .filter(isSeparateGlueRowForSubmit)
        .map((item, index) => buildSeparateGluePayloadItem(
          item,
          item.glueId || defaultNoMixGlueId,
          recordStatus,
          defaultTime,
          mixSeparateRows.filter(isSeparateGlueRowReady).length + index + 1,
          activeForceRecordStatus
        )),
    ];

    let nextSeq = baseSeparateGlues.length;
    if (!isNoMixGlueComplete) {
      (ctx.cancelledSeparateGlueDetails || []).forEach((item) => {
        if (hasPersistedNoSeparateGlueId(item?.noSeparateGlueId) && !item?.separateGlueId) {
          return;
        }
        nextSeq += 1;
        const glueId = item.glueId || ctx.mixGlueMasterId || defaultNoMixGlueId;
        baseSeparateGlues.push(buildSeparateGluePayloadItem(
          item,
          glueId,
          recordStatus,
          defaultTime,
          nextSeq,
          CHIET_MAIN_RECORD_STATUS
        ));
      });
    }
  }

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
