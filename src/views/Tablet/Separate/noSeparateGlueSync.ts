import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import format from '@/mixins/format';
import { createDefaultSeparateGlueRow } from './separateMixedGlue.mappers';
import { normalizeRowSeq } from './separateGlueSeqSync';

dayjs.extend(customParseFormat);

const CANCELLED_RECORD_STATUS = 'C';
const NEW_NO_SEPARATE_GLUE_ID = '0';
const ACTIVE_RECORD_STATUS = '1';

export const isRecordStatusCancelled = (value: unknown) =>
  String(value ?? '').toUpperCase() === CANCELLED_RECORD_STATUS;

export const isRecordStatusActive = (value: unknown) =>
  String(value ?? '').toUpperCase() === ACTIVE_RECORD_STATUS;

export const isNewNoMixSeparateAddRow = (row: any): boolean => {
  if (row?.isNewAddRow === true) return true;
  const id = row?.noSeparateGlueId;
  return id == null || id === '' || String(id) === NEW_NO_SEPARATE_GLUE_ID;
};

const hasPersistedNoSeparateGlueId = (value: unknown): boolean =>
  value != null && value !== '' && String(value) !== NEW_NO_SEPARATE_GLUE_ID;

export const normalizeNewNoMixSeparateAddRow = (row: any, noMixGlueId: string) => ({
  ...row,
  glueId: row?.glueId || noMixGlueId,
  noSeparateGlueId: NEW_NO_SEPARATE_GLUE_ID,
  recordStatus: ACTIVE_RECORD_STATUS,
  isNewAddRow: true,
  seq: row?.seq ?? undefined,
});

export const isNewMixSeparateAddRow = (row: any): boolean => {
  if (row?.isNewAddRow === true) return true;
  const id = row?.separateGlueId;
  return id == null || id === '' || String(id) === NEW_NO_SEPARATE_GLUE_ID;
};

export const normalizeNewMixSeparateAddRow = (row: any, mixGlueMasterId: string) => ({
  ...row,
  glueId: row?.glueId || mixGlueMasterId,
  separateGlueId: NEW_NO_SEPARATE_GLUE_ID,
  recordStatus: ACTIVE_RECORD_STATUS,
  isNewAddRow: true,
  seq: row?.seq ?? undefined,
});

const parseTimeMs = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = dayjs(String(value));
  return parsed.isValid() ? parsed.valueOf() : null;
};

export const getApiNoSeparateGlueTimeMs = (item: any): number | null =>
  parseTimeMs(item?.createDate ?? item?.confirmDate ?? item?.updateDate);

export const getStoreNoSeparateRowTimeMs = (row: any): number | null =>
  parseTimeMs(row?.confirmDate ?? row?.apiCreateDate ?? row?.createDate);

const getApiItemKey = (item: any): string => {
  if (hasPersistedNoSeparateGlueId(item?.noSeparateGlueId)) {
    return `id:${String(item.noSeparateGlueId)}`;
  }
  const time = getApiNoSeparateGlueTimeMs(item);
  return time != null ? `time:${time}` : '';
};

const findApiIndexByRow = (row: any, apiItems: any[]): number => {
  if (isNewNoMixSeparateAddRow(row)) return -1;

  if (hasPersistedNoSeparateGlueId(row?.noSeparateGlueId)) {
    const rowId = String(row.noSeparateGlueId);
    const byId = apiItems.findIndex(
      (item) => isRecordStatusActive(item?.recordStatus)
        && (
          String(item?.noSeparateGlueId) === rowId
          || String(item?.separateGlueId) === rowId
        )
    );
    if (byId >= 0) return byId;
  }

  const rowSeq = normalizeRowSeq(row?.seq);
  if (rowSeq != null) {
    const rowBucket = row?.selectedBucketId ?? row?.bucketId;
    const bySeq = apiItems.findIndex((item) => {
      if (!isRecordStatusActive(item?.recordStatus)) return false;
      if (normalizeRowSeq(item?.seq) !== rowSeq) return false;
      if (rowBucket == null || rowBucket === '') return true;
      return String(item?.bucketId ?? item?.selectedBucketId) === String(rowBucket);
    });
    if (bySeq >= 0) return bySeq;
  }

  if (row?._matchedApiKey) {
    const byKey = apiItems.findIndex((item) => getApiItemKey(item) === row._matchedApiKey);
    if (byKey >= 0) return byKey;
  }

  const rowTime = getStoreNoSeparateRowTimeMs(row);
  if (rowTime == null) return -1;

  let bestIndex = -1;
  let bestDiff = Number.POSITIVE_INFINITY;

  apiItems.forEach((item, index) => {
    const apiTime = getApiNoSeparateGlueTimeMs(item);
    if (apiTime == null) return;
    const diff = Math.abs(rowTime - apiTime);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = index;
    }
  });

  return bestIndex;
};

const mapApiItemToTableRow = (apiItem: any, noMixGlueId: string, apiIndex: number) => {
  const confirmDate = apiItem?.confirmDate || apiItem?.createDate || null;
  const bucketId = apiItem?.bucketId ?? apiItem?.selectedBucketId ?? null;
  return {
    ...createDefaultSeparateGlueRow(noMixGlueId),
    glueId: noMixGlueId || String(apiItem?.materialCode ?? ''),
    noSeparateGlueId: apiItem?.noSeparateGlueId ?? apiItem?.separateGlueId,
    seq: normalizeRowSeq(apiItem?.seq) ?? undefined,
    selectedBucketId: bucketId,
    selectedRequestDetailIds: Array.isArray(apiItem?.requestDetailIds)
      ? apiItem.requestDetailIds.map(String)
      : [],
    operator: apiItem?.operator || '',
    operatorId: apiItem?.operatorId || '',
    confirmDate,
    confirmTime: confirmDate ? format.formatDate(confirmDate) : null,
    recordStatus: apiItem?.recordStatus,
    apiCreateDate: apiItem?.createDate ?? null,
    _matchedApiKey: getApiItemKey(apiItem),
    _matchedApiIndex: apiIndex,
    _lastSubmittedBucketId: bucketId,
  };
};

const mergeTableRowWithApiItem = (row: any, apiItem: any, apiIndex: number) => {
  const apiConfirmDate = apiItem?.confirmDate || apiItem?.createDate || null;
  const rowConfirmDate = row?.confirmDate || apiConfirmDate;
  const rowBucket = row?.selectedBucketId ?? row?.bucketId;
  const apiBucket = apiItem?.bucketId ?? apiItem?.selectedBucketId;

  return {
    ...row,
    glueId: row?.glueId || String(apiItem?.materialCode ?? ''),
    noSeparateGlueId: apiItem?.noSeparateGlueId ?? row?.noSeparateGlueId,
    selectedBucketId: rowBucket ?? apiBucket ?? null,
    selectedRequestDetailIds: row?.selectedRequestDetailIds?.length
      ? row.selectedRequestDetailIds
      : (Array.isArray(apiItem?.requestDetailIds) ? apiItem.requestDetailIds.map(String) : []),
    confirmDate: rowConfirmDate,
    confirmTime: row?.confirmTime ?? (rowConfirmDate ? format.formatDate(rowConfirmDate) : null),
    recordStatus: row?.recordStatus ?? apiItem?.recordStatus,
    apiCreateDate: apiItem?.createDate ?? row?.apiCreateDate ?? null,
    _matchedApiKey: getApiItemKey(apiItem),
    _matchedApiIndex: apiIndex,
  };
};

const applyTableRowToApiItem = (apiItem: any, row: any) => {
  const confirmDate = row?.confirmDate || apiItem?.confirmDate || apiItem?.createDate;

  return {
    ...apiItem,
    confirmDate,
    requestDetailIds: row?.selectedRequestDetailIds?.length
      ? row.selectedRequestDetailIds
      : apiItem?.requestDetailIds,
    recordStatus: isRecordStatusCancelled(apiItem?.recordStatus)
      ? CANCELLED_RECORD_STATUS
      : (row?.recordStatus ?? apiItem?.recordStatus),
  };
};

export type SeparateBucketUpdatePayload = {
  row: any;
  previousBucketId: string | number | null;
  newBucketId: string | number | null;
};

const normalizeBucketId = (value: unknown): string =>
  value == null || value === '' ? '' : String(value);

export const hasPersistedSeparateRowIdentity = (row: any): boolean => {
  const sgId = row?.separateGlueId;
  if (sgId != null && sgId !== '' && String(sgId) !== NEW_NO_SEPARATE_GLUE_ID) return true;
  const nsgId = row?.noSeparateGlueId;
  if (nsgId != null && nsgId !== '' && String(nsgId) !== NEW_NO_SEPARATE_GLUE_ID) return true;
  return row?._lastSubmittedBucketId != null;
};

/** Dòng đã từng gửi BE — cần push recordStatus C khi delete-row. */
export const shouldPersistCancelledSeparateRow = (row: any): boolean => {
  if (row?.isNewAddRow === true && !hasPersistedSeparateRowIdentity(row)) return false;
  return hasPersistedSeparateRowIdentity(row);
};

const matchApiSeparateGlueItemByRow = (item: any, row: any): boolean => {
  if (isRecordStatusCancelled(item?.recordStatus)) return false;

  const rowGlueId = row?.glueId;
  if (rowGlueId != null && rowGlueId !== '') {
    const itemGlueId = item?.glueId ?? item?.materialCode ?? '';
    if (String(itemGlueId) !== String(rowGlueId)) return false;
  }

  const noSeparateGlueId = row?.noSeparateGlueId;
  if (
    noSeparateGlueId != null
    && noSeparateGlueId !== ''
    && String(noSeparateGlueId) !== NEW_NO_SEPARATE_GLUE_ID
    && isRecordStatusActive(item?.recordStatus)
    && (
      String(item?.noSeparateGlueId) === String(noSeparateGlueId)
      || String(item?.separateGlueId) === String(noSeparateGlueId)
    )
  ) {
    return true;
  }

  const separateGlueId = row?.separateGlueId;
  if (
    separateGlueId != null
    && separateGlueId !== ''
    && String(separateGlueId) !== NEW_NO_SEPARATE_GLUE_ID
    && String(item?.separateGlueId) === String(separateGlueId)
    && isRecordStatusActive(item?.recordStatus)
  ) {
    return true;
  }

  const rowSeq = normalizeRowSeq(row?.seq);
  const itemSeq = normalizeRowSeq(item?.seq);
  if (
    rowSeq != null
    && itemSeq != null
    && rowSeq === itemSeq
    && isRecordStatusActive(item?.recordStatus)
  ) {
    const bucketId = row?.selectedBucketId ?? row?.bucketId;
    if (bucketId == null) return true;
    return String(item?.bucketId ?? item?.selectedBucketId) === String(bucketId);
  }

  const bucketId = row?.selectedBucketId ?? row?.bucketId;
  if (bucketId == null || String(item?.bucketId ?? item?.selectedBucketId) !== String(bucketId)) {
    return false;
  }

  const rowConfirm = row?.confirmDate;
  if (rowConfirm != null && rowConfirm !== '') {
    return String(item?.confirmDate ?? '') === String(rowConfirm);
  }

  return true;
};

const findApiIndexByRowForBucketSync = (row: any, apiItems: any[]): number => {
  if (hasPersistedNoSeparateGlueId(row?.noSeparateGlueId)) {
    const rowId = String(row.noSeparateGlueId);
    const byNoMixId = apiItems.findIndex(
      (item) => isRecordStatusActive(item?.recordStatus)
        && (
          String(item?.noSeparateGlueId) === rowId
          || String(item?.separateGlueId) === rowId
        )
    );
    if (byNoMixId >= 0) return byNoMixId;
  }

  const separateGlueId = row?.separateGlueId;
  if (
    separateGlueId != null
    && separateGlueId !== ''
    && String(separateGlueId) !== NEW_NO_SEPARATE_GLUE_ID
  ) {
    const byMixId = apiItems.findIndex(
      (item) => isRecordStatusActive(item?.recordStatus)
        && String(item?.separateGlueId) === String(separateGlueId)
    );
    if (byMixId >= 0) return byMixId;
  }

  const rowSeq = normalizeRowSeq(row?.seq);
  if (rowSeq == null) return -1;

  return apiItems.findIndex(
    (item) => isRecordStatusActive(item?.recordStatus)
      && normalizeRowSeq(item?.seq) === rowSeq
  );
};

/** update-bucket: giữ separateGlueId/noSeparateGlueId, chỉ đổi bucketId, recordStatus = 1. */
export const applyInPlaceSeparateRowBucketUpdate = (
  row: any,
  newBucketId: string | number | null
): void => {
  if (newBucketId != null && newBucketId !== '') {
    row.selectedBucketId = newBucketId;
    row.bucketId = newBucketId;
  }
  row.recordStatus = ACTIVE_RECORD_STATUS;
  if (hasPersistedSeparateRowIdentity(row)) {
    delete row.isNewAddRow;
  }
};

export const syncApiSeparateGlueBucketByRow = (
  apiItems: any[],
  row: any,
  newBucketId: unknown
): any[] => {
  const next = (apiItems || []).map((item) => ({ ...item }));
  if (!hasPersistedSeparateRowIdentity(row)) return next;

  const apiIndex = findApiIndexByRowForBucketSync(row, next);
  if (apiIndex < 0) return next;

  next[apiIndex] = {
    ...next[apiIndex],
    bucketId: newBucketId,
    recordStatus: ACTIVE_RECORD_STATUS,
  };
  return next;
};

export const syncNoMixSeparateGlueBucketInApi = (
  apiNoSeparateGlues: any[],
  apiSeparateGlues: any[],
  row: any,
  newBucketId: unknown
): { apiNoSeparateGlues: any[]; apiSeparateGlues: any[] } => {
  if (!hasPersistedSeparateRowIdentity(row)) {
    return { apiNoSeparateGlues, apiSeparateGlues };
  }

  const patchBucket = (item: any) => ({
    ...item,
    bucketId: newBucketId,
    recordStatus: ACTIVE_RECORD_STATUS,
  });

  const nextNoMix = (apiNoSeparateGlues || []).map((item) => ({ ...item }));
  const noMixIndex = findApiIndexByRowForBucketSync(row, nextNoMix);
  if (noMixIndex >= 0) {
    nextNoMix[noMixIndex] = patchBucket(nextNoMix[noMixIndex]);
    return { apiNoSeparateGlues: nextNoMix, apiSeparateGlues };
  }

  const nextMix = (apiSeparateGlues || []).map((item) => ({ ...item }));
  const mixIndex = findApiIndexByRowForBucketSync(row, nextMix);
  if (mixIndex < 0) {
    return { apiNoSeparateGlues, apiSeparateGlues };
  }

  nextMix[mixIndex] = patchBucket(nextMix[mixIndex]);
  return { apiNoSeparateGlues, apiSeparateGlues: nextMix };
};

export const stampSubmittedSeparateRowBuckets = (rows: any[]) => {
  (rows || []).forEach((row) => {
    const bucketId = row?.selectedBucketId ?? row?.bucketId;
    if (bucketId != null && bucketId !== '') {
      row._lastSubmittedBucketId = bucketId;
    }
    delete row.isNewAddRow;
  });
};

/** @deprecated update-bucket in-place — không còn tạo snapshot C cho thùng cũ. */
export const buildCancelledBucketRowSnapshot = (row: any, previousBucketId: unknown) => ({
  ...row,
  selectedBucketId: previousBucketId,
  bucketId: previousBucketId,
  recordStatus: CANCELLED_RECORD_STATUS,
});

export const getCancelledSeparateGlueDetailKey = (item: any): string => {
  const sgId = item?.separateGlueId;
  if (sgId != null && String(sgId) !== '' && String(sgId) !== NEW_NO_SEPARATE_GLUE_ID) {
    return `sg:${sgId}|${normalizeBucketId(item?.selectedBucketId ?? item?.bucketId)}`;
  }
  const nsgId = item?.noSeparateGlueId;
  if (nsgId != null && String(nsgId) !== '' && String(nsgId) !== NEW_NO_SEPARATE_GLUE_ID) {
    return `nsg:${nsgId}|${normalizeBucketId(item?.selectedBucketId ?? item?.bucketId)}`;
  }
  const seq = normalizeRowSeq(item?.seq);
  const bucketId = normalizeBucketId(item?.selectedBucketId ?? item?.bucketId);
  const glueId = item?.glueId ?? '';
  return `seq:${glueId}|${seq ?? ''}|${bucketId}`;
};

export const appendCancelledSeparateGlueDetail = (
  cancelledList: any[],
  snapshot: any
): any[] => {
  const key = getCancelledSeparateGlueDetailKey(snapshot);
  if (cancelledList.some((item) => getCancelledSeparateGlueDetailKey(item) === key)) {
    return cancelledList;
  }
  return [...cancelledList, snapshot];
};

/** @deprecated update-bucket giữ id — không reset về dòng mới. */
export const resetNoMixRowForNewBucketAssignment = (row: any) => {
  row.noSeparateGlueId = NEW_NO_SEPARATE_GLUE_ID;
  row.isNewAddRow = true;
  row.recordStatus = ACTIVE_RECORD_STATUS;
  delete row._matchedApiKey;
  delete row._matchedApiIndex;
  return row;
};

/** Ghép dòng bảng noMix với apiNoSeparateGlues theo confirmDate ≈ createDate. */
export const syncNoMixSeparateGlueState = (
  tableRows: any[],
  apiItems: any[],
  noMixGlueId: string
): { tableRows: any[]; apiItems: any[] } => {
  const nextApiItems = (apiItems || []).map((item) => ({ ...item }));
  const usedApiIndexes = new Set<number>();
  const syncedRows: any[] = [];

  (tableRows || []).forEach((row) => {
    if (isNewNoMixSeparateAddRow(row)) {
      syncedRows.push(normalizeNewNoMixSeparateAddRow(row, noMixGlueId));
      return;
    }

    let apiIndex = findApiIndexByRow(row, nextApiItems);
    if (apiIndex >= 0 && usedApiIndexes.has(apiIndex)) {
      apiIndex = -1;
    }

    if (apiIndex < 0) {
      const rowTime = getStoreNoSeparateRowTimeMs(row);
      if (rowTime != null) {
        let bestIndex = -1;
        let bestDiff = Number.POSITIVE_INFINITY;
        nextApiItems.forEach((item, index) => {
          if (usedApiIndexes.has(index) || isRecordStatusCancelled(item?.recordStatus)) return;
          const apiTime = getApiNoSeparateGlueTimeMs(item);
          if (apiTime == null) return;
          const diff = Math.abs(rowTime - apiTime);
          if (diff < bestDiff) {
            bestDiff = diff;
            bestIndex = index;
          }
        });
        apiIndex = bestIndex;
      }
    }

    if (apiIndex >= 0) {
      usedApiIndexes.add(apiIndex);
      const mergedRow = mergeTableRowWithApiItem(row, nextApiItems[apiIndex], apiIndex);
      syncedRows.push(mergedRow);
      nextApiItems[apiIndex] = applyTableRowToApiItem(nextApiItems[apiIndex], mergedRow);
      return;
    }

    syncedRows.push(normalizeNewNoMixSeparateAddRow(row, noMixGlueId));
  });

  return { tableRows: syncedRows, apiItems: nextApiItems };
};

/** delete-row keo trộn: tìm object API khớp và đánh dấu recordStatus = C. */
export const markApiSeparateGlueCancelledByRow = (
  apiItems: any[],
  row: any
): any[] => {
  const next = (apiItems || []).map((item) => ({ ...item }));
  if (!shouldPersistCancelledSeparateRow(row)) return next;

  const apiIndex = next.findIndex((item) => matchApiSeparateGlueItemByRow(item, row));
  if (apiIndex < 0) return next;

  next[apiIndex] = {
    ...next[apiIndex],
    recordStatus: CANCELLED_RECORD_STATUS,
  };
  return next;
};

/** delete-row: tìm object API khớp và đánh dấu recordStatus = C. */
export const markApiNoSeparateGlueCancelledByRow = (
  apiItems: any[],
  row: any
): any[] => {
  const next = (apiItems || []).map((item) => ({ ...item }));
  if (!shouldPersistCancelledSeparateRow(row)) return next;

  const apiIndex = findApiIndexByRow(row, next);
  if (apiIndex < 0) return next;

  next[apiIndex] = {
    ...next[apiIndex],
    recordStatus: CANCELLED_RECORD_STATUS,
  };
  return next;
};

/** Đánh dấu C trên apiNoSeparateGlues hoặc apiSeparateGlues — dùng chung cho mọi bảng keo không trộn. */
export const markNoMixSeparateRowCancelledInApi = (
  apiNoSeparateGlues: any[],
  apiSeparateGlues: any[],
  row: any
): { apiNoSeparateGlues: any[]; apiSeparateGlues: any[] } => {
  if (!shouldPersistCancelledSeparateRow(row)) {
    return { apiNoSeparateGlues, apiSeparateGlues };
  }

  if (findApiIndexByRow(row, apiNoSeparateGlues) >= 0) {
    return {
      apiNoSeparateGlues: markApiNoSeparateGlueCancelledByRow(apiNoSeparateGlues, row),
      apiSeparateGlues,
    };
  }

  const separateIndex = (apiSeparateGlues || []).findIndex(
    (item) => matchApiSeparateGlueItemByRow(item, row)
  );
  if (separateIndex >= 0) {
    return {
      apiNoSeparateGlues,
      apiSeparateGlues: markApiSeparateGlueCancelledByRow(apiSeparateGlues, row),
    };
  }

  return { apiNoSeparateGlues, apiSeparateGlues };
};

/** Khởi tạo dòng bảng từ apiNoSeparateGlues (khi chưa có draft table). */
export const buildNoMixTableRowsFromApiItems = (
  apiItems: any[],
  noMixGlueId: string
): any[] =>
  (apiItems || [])
    .filter((item) => isRecordStatusActive(item?.recordStatus))
    .filter((item) => item?.bucketId != null && String(item.bucketId) !== '0')
    .map((item, index) => mapApiItemToTableRow(item, noMixGlueId, index));
