import { isRecordStatusActive } from './noSeparateGlueSync';

const NEW_LINE_ID = '0';
const ACTIVE_RECORD_STATUS = '1';

export const normalizeRowSeq = (value: unknown): number | null => {
  if (value == null || value === '') return null;
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
};

export const getNextSeparateTableSeq = (rows: any[]): number => {
  const maxSeq = (rows || []).reduce((max, row) => {
    const seq = normalizeRowSeq(row?.seq);
    return seq != null ? Math.max(max, seq) : max;
  }, 0);
  return maxSeq + 1;
};

const hasPersistedLineId = (value: unknown): boolean =>
  value != null && value !== '' && String(value) !== NEW_LINE_ID;

const isBucketTableApiItem = (item: any): boolean => {
  const bucketId = item?.bucketId ?? item?.selectedBucketId;
  return bucketId != null && String(bucketId) !== '0';
};

/** Chỉ map id khi API active (recordStatus = 1) và có thùng hợp lệ. */
const isSeqMappableApiItem = (item: any): boolean =>
  isRecordStatusActive(item?.recordStatus) && isBucketTableApiItem(item);

const hasMatchingSeq = (row: any, apiItem: any, index: number): boolean => {
  const rowSeq = normalizeRowSeq(row?.seq) ?? index + 1;
  const apiSeq = normalizeRowSeq(apiItem?.seq);
  return apiSeq != null && apiSeq === rowSeq;
};

const buildApiLookup = (
  apiItems: any[],
  idField: 'separateGlueId' | 'noSeparateGlueId'
) => {
  const bySeq = new Map<number, any>();
  const byId = new Map<string, any>();

  (apiItems || []).forEach((item) => {
    if (!isSeqMappableApiItem(item)) return;

    const seq = normalizeRowSeq(item?.seq);
    if (seq != null) {
      bySeq.set(seq, item);
    }

    const lineId = item?.[idField];
    if (hasPersistedLineId(lineId)) {
      byId.set(String(lineId), item);
    }
  });

  return { bySeq, byId };
};

const resolveApiItemForRow = (
  row: any,
  index: number,
  lookup: ReturnType<typeof buildApiLookup>,
  idField: 'separateGlueId' | 'noSeparateGlueId'
) => {
  const rowLineId = row?.[idField];
  if (hasPersistedLineId(rowLineId)) {
    const byRowId = lookup.byId.get(String(rowLineId));
    if (byRowId && hasMatchingSeq(row, byRowId, index)) {
      return byRowId;
    }
  }

  const seq = normalizeRowSeq(row?.seq) ?? index + 1;
  const bySeq = lookup.bySeq.get(seq);
  if (bySeq && hasMatchingSeq(row, bySeq, index)) {
    return bySeq;
  }

  return null;
};

const mergeRowWithApiBySeq = (
  row: any,
  index: number,
  apiItem: any | null,
  idField: 'separateGlueId' | 'noSeparateGlueId'
) => {
  const seq = normalizeRowSeq(row?.seq) ?? normalizeRowSeq(apiItem?.seq) ?? index + 1;
  const rowBucket = row?.selectedBucketId ?? row?.bucketId;
  const apiBucket = apiItem?.bucketId ?? apiItem?.selectedBucketId ?? null;
  const bucketId = rowBucket ?? apiBucket ?? null;
  const canMapIdFromApi = apiItem != null && hasMatchingSeq(row, apiItem, index);

  if (row?.isNewAddRow === true) {
    return {
      ...row,
      seq,
      [idField]: NEW_LINE_ID,
      selectedBucketId: bucketId,
      bucketId: bucketId ?? undefined,
      recordStatus: row?.recordStatus ?? ACTIVE_RECORD_STATUS,
      isNewAddRow: true,
    };
  }

  const mappedApiLineId = canMapIdFromApi ? apiItem?.[idField] : null;
  const lineId = hasPersistedLineId(mappedApiLineId)
    ? mappedApiLineId
    : (hasPersistedLineId(row?.[idField]) ? row[idField] : NEW_LINE_ID);
  const isNewLine = !hasPersistedLineId(lineId);

  return {
    ...row,
    seq,
    [idField]: lineId,
    selectedBucketId: bucketId,
    bucketId: bucketId ?? undefined,
    recordStatus: row?.recordStatus ?? (canMapIdFromApi ? apiItem?.recordStatus : undefined) ?? ACTIVE_RECORD_STATUS,
    isNewAddRow: isNewLine,
    _lastSubmittedBucketId: row?._lastSubmittedBucketId ?? (canMapIdFromApi ? apiBucket : null) ?? bucketId ?? null,
  };
};

/** Ghép dòng bảng keo trộn với separateGlues BE theo seq (recordStatus = 1) và separateGlueId nếu có. */
export const mapMixSeparateRowsWithApiBySeq = (tableRows: any[], apiItems: any[]) => {
  const lookup = buildApiLookup(apiItems, 'separateGlueId');
  return (tableRows || []).map((row, index) => {
    const apiItem = resolveApiItemForRow(row, index, lookup, 'separateGlueId');
    return mergeRowWithApiBySeq(row, index, apiItem, 'separateGlueId');
  });
};

/** Ghép dòng bảng keo không trộn với noSeparateGlues / separateGlues BE theo seq (recordStatus = 1). */
export const mapNoMixSeparateRowsWithApiBySeq = (tableRows: any[], apiItems: any[]) => {
  const lookup = buildApiLookup(apiItems, 'noSeparateGlueId');
  return (tableRows || []).map((row, index) => {
    const apiItem = resolveApiItemForRow(row, index, lookup, 'noSeparateGlueId');
    return mergeRowWithApiBySeq(row, index, apiItem, 'noSeparateGlueId');
  });
};

/** Chuẩn hóa item API keo không trộn — gom noSeparateGlueId từ BE (noSeparateGlues hoặc separateGlues). */
export const normalizeNoMixApiItemForSeqMap = (item: any, noMixGlueId: string) => {
  const glueId = String(noMixGlueId ?? '');
  const lineId = item?.noSeparateGlueId ?? item?.separateGlueId ?? null;
  return {
    ...item,
    glueId: item?.glueId ?? item?.materialCode ?? glueId,
    materialCode: item?.materialCode ?? item?.glueId ?? glueId,
    noSeparateGlueId: lineId,
    bucketId: item?.bucketId ?? item?.selectedBucketId,
  };
};

const matchesNoMixGlueId = (item: any, noMixGlueId: string): boolean => {
  if (!noMixGlueId) return true;
  const code = String(item?.materialCode ?? item?.glueId ?? '');
  return code === String(noMixGlueId);
};

/** Lấy API keo không trộn từ BE — ưu tiên noSeparateGlues, fallback separateGlues theo glueId. */
export const resolveNoMixApiItemsForSeqMap = (
  respData: any,
  noMixGlueId: string
): any[] => {
  const glueId = String(noMixGlueId ?? '');

  const fromNoSeparateGlues = (Array.isArray(respData?.noSeparateGlues) ? respData.noSeparateGlues : [])
    .filter((item: any) => matchesNoMixGlueId(item, glueId))
    .map((item: any) => normalizeNoMixApiItemForSeqMap(item, glueId));

  if (fromNoSeparateGlues.length > 0) {
    return fromNoSeparateGlues;
  }

  return (Array.isArray(respData?.separateGlues) ? respData.separateGlues : [])
    .filter((item: any) => matchesNoMixGlueId(item, glueId))
    .map((item: any) => normalizeNoMixApiItemForSeqMap(item, glueId));
};

/** Fallback API từ store khi BE không có — thử apiNoSeparateGlues rồi apiSeparateGlues. */
export const resolveNoMixApiFallbackForSeqMap = (
  apiNoSeparateGlues: any[],
  apiSeparateGlues: any[],
  noMixGlueId: string
): any[] => {
  const glueId = String(noMixGlueId ?? '');

  const fromNoSeparate = (apiNoSeparateGlues || [])
    .filter((item) => isRecordStatusActive(item?.recordStatus))
    .map((item) => normalizeNoMixApiItemForSeqMap(item, glueId));

  if (fromNoSeparate.length > 0) {
    return fromNoSeparate;
  }

  return filterNoMixInMixApiSeparateGlues(apiSeparateGlues || [], glueId)
    .filter((item) => isRecordStatusActive(item?.recordStatus))
    .map((item) => normalizeNoMixApiItemForSeqMap(item, glueId));
};

/** API nguồn map seq cho bảng keo trộn — chỉ lấy dòng thuộc mixGlueMasterId. */
export const resolveMixApiItemsForSeqMap = (
  respData: any,
  mixGlueMasterId: string
): any[] => {
  const separateGlues = Array.isArray(respData?.separateGlues) ? respData.separateGlues : [];
  if (!mixGlueMasterId) return separateGlues;
  return separateGlues.filter(
    (item: any) => String(item?.glueId ?? '') === String(mixGlueMasterId)
  );
};

export const filterMixApiSeparateGlues = (apiItems: any[], mixGlueMasterId: string): any[] =>
  (apiItems || []).filter(
    (item) => String(item?.glueId ?? '') === String(mixGlueMasterId)
  );

export const filterNoMixInMixApiSeparateGlues = (apiItems: any[], noMixGlueId: string): any[] =>
  (apiItems || []).filter(
    (item) => String(item?.glueId ?? item?.materialCode ?? '') === String(noMixGlueId)
  );

/** Sau update-bucket: gán thùng mới như dòng mới (separateGlueId = 0). */
export const resetMixRowForNewBucketAssignment = (row: any) => {
  row.separateGlueId = NEW_LINE_ID;
  row.isNewAddRow = true;
  row.recordStatus = ACTIVE_RECORD_STATUS;
  return row;
};

