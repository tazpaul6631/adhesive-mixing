import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

import format from '@/mixins/format';
import { createDefaultSeparateGlueRow } from './separateMixedGlue.mappers';

dayjs.extend(customParseFormat);

const CANCELLED_RECORD_STATUS = 'C';
const NEW_NO_SEPARATE_GLUE_ID = '0';
const ACTIVE_RECORD_STATUS = '1';

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
    const byId = apiItems.findIndex(
      (item) => String(item?.noSeparateGlueId) === String(row.noSeparateGlueId)
    );
    if (byId >= 0) return byId;
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
  return {
    ...createDefaultSeparateGlueRow(noMixGlueId),
    glueId: noMixGlueId || String(apiItem?.materialCode ?? ''),
    noSeparateGlueId: apiItem?.noSeparateGlueId,
    selectedBucketId: apiItem?.bucketId ?? apiItem?.selectedBucketId ?? null,
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
  };
};

const mergeTableRowWithApiItem = (row: any, apiItem: any, apiIndex: number) => {
  const apiConfirmDate = apiItem?.confirmDate || apiItem?.createDate || null;
  const rowConfirmDate = row?.confirmDate || apiConfirmDate;
  const rowBucket = row?.selectedBucketId ?? row?.bucketId;
  const apiBucket = apiItem?.bucketId ?? apiItem?.selectedBucketId;
  const bucketChanged = rowBucket != null && String(rowBucket) !== String(apiBucket ?? '');

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
    recordStatus: bucketChanged
      ? ACTIVE_RECORD_STATUS
      : (row?.recordStatus ?? (isRecordStatusCancelled(apiItem?.recordStatus) ? ACTIVE_RECORD_STATUS : apiItem?.recordStatus)),
    apiCreateDate: apiItem?.createDate ?? row?.apiCreateDate ?? null,
    _matchedApiKey: getApiItemKey(apiItem),
    _matchedApiIndex: apiIndex,
  };
};

const applyTableRowToApiItem = (apiItem: any, row: any) => {
  const bucketId = row?.selectedBucketId ?? row?.bucketId;
  const confirmDate = row?.confirmDate || apiItem?.confirmDate || apiItem?.createDate;
  const bucketChanged = bucketId != null
    && String(bucketId) !== String(apiItem?.bucketId ?? apiItem?.selectedBucketId ?? '');

  return {
    ...apiItem,
    bucketId: bucketId ?? apiItem?.bucketId,
    confirmDate,
    requestDetailIds: row?.selectedRequestDetailIds?.length
      ? row.selectedRequestDetailIds
      : apiItem?.requestDetailIds,
    recordStatus: isRecordStatusCancelled(apiItem?.recordStatus)
      ? CANCELLED_RECORD_STATUS
      : (bucketChanged ? '1' : (row?.recordStatus ?? apiItem?.recordStatus)),
  };
};

export const isRecordStatusCancelled = (value: unknown) =>
  String(value ?? '').toUpperCase() === CANCELLED_RECORD_STATUS;

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

/** delete-row: tìm object API khớp và đánh dấu recordStatus = C. */
export const markApiNoSeparateGlueCancelledByRow = (
  apiItems: any[],
  row: any
): any[] => {
  const next = (apiItems || []).map((item) => ({ ...item }));
  const apiIndex = findApiIndexByRow(row, next);
  if (apiIndex < 0) return next;

  next[apiIndex] = {
    ...next[apiIndex],
    recordStatus: CANCELLED_RECORD_STATUS,
  };
  return next;
};

/** Khởi tạo dòng bảng từ apiNoSeparateGlues (khi chưa có draft table). */
export const buildNoMixTableRowsFromApiItems = (
  apiItems: any[],
  noMixGlueId: string
): any[] =>
  (apiItems || [])
    .filter((item) => !isRecordStatusCancelled(item?.recordStatus))
    .filter((item) => item?.bucketId != null && String(item.bucketId) !== '0')
    .map((item, index) => mapApiItemToTableRow(item, noMixGlueId, index));
