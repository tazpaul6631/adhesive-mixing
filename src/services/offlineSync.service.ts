import syncApi from '@/api/sync';
import {
  deleteOfflineQueueItems,
  listPendingQueueItems,
  updateOfflineQueueItemsError,
  type OfflineQueueItem,
  type OfflineQueueType,
} from '@/services/offlineQueue.service';

export type OfflineSyncProgress = {
  current: number;
  total: number;
  type?: OfflineQueueType;
};

export type OfflineSyncResult = {
  syncedCount: number;
  totalCount: number;
};

type SyncGroupConfig = {
  request: (payloadArray: any[]) => Promise<any>;
  mapPayload: (payload: any) => any;
};

const syncOrder: OfflineQueueType[] = ['ReceiveGlue', 'ReturnGlue', 'GlueCheckList'];

function normalizeValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function normalizeIdValue(value: any) {
  const normalizedValue = normalizeValue(value);
  return normalizedValue || '0';
}

function hasPayloadValue(value: any) {
  return normalizeValue(value) !== '';
}

function addValueIfExists(target: Record<string, any>, key: string, value: any) {
  if (hasPayloadValue(value)) {
    target[key] = normalizeValue(value);
  }
}

function mapReceiveGluePayload(payload: any) {
  const requestPayload: Record<string, any> = {
    factoryId: normalizeValue(payload?.factoryId),
    productLineId: normalizeValue(payload?.productLineId),
    updaterId: normalizeValue(payload?.updaterId),
  };

  addValueIfExists(requestPayload, 'mixGlueMasterId', payload?.mixGlueMasterId);
  addValueIfExists(requestPayload, 'separateGlueId', payload?.separateGlueId);
  addValueIfExists(requestPayload, 'noSeparateGlueId', payload?.noSeparateGlueId);
  addValueIfExists(requestPayload, 'receivedBy', payload?.receivedBy);

  return requestPayload;
}

function normalizeIdArrayValue(value: any) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeValue(item))
    .filter(Boolean);
}

function mapReturnGluePayload(payload: any) {
  return {
    factoryId: normalizeValue(payload?.factoryId),
    returnGlueId: normalizeIdValue(payload?.returnGlueId),
    lineChemicalIds: normalizeIdArrayValue(payload?.lineChemicalIds),
    recordStatus: normalizeValue(payload?.recordStatus || '1'),
    createrId: normalizeValue(payload?.createrId),
    updaterId: normalizeValue(payload?.updaterId),
  };
}

function mapGlueCheckListPayload(payload: any) {
  return {
    factoryId: normalizeValue(payload?.factoryId),
    checkListItemId: normalizeIdValue(payload?.checkListItemId),
    checkTime: normalizeValue(payload?.checkTime),
    result: Boolean(payload?.result),
    note: normalizeValue(payload?.note),
    recordStatus: normalizeValue(payload?.recordStatus || '1'),
    createrId: normalizeValue(payload?.createrId),
    updaterId: normalizeValue(payload?.updaterId),
  };
}

const syncConfigs: Record<OfflineQueueType, SyncGroupConfig> = {
  ReceiveGlue: {
    request: syncApi.syncReceiveGlue,
    mapPayload: mapReceiveGluePayload,
  },
  ReturnGlue: {
    request: syncApi.syncGlueReturn,
    mapPayload: mapReturnGluePayload,
  },
  GlueCheckList: {
    request: syncApi.syncCheckListResult,
    mapPayload: mapGlueCheckListPayload,
  },
};

function groupQueueItems(items: OfflineQueueItem[]) {
  const groupedItems = new Map<OfflineQueueType, OfflineQueueItem[]>();

  for (const type of syncOrder) {
    groupedItems.set(type, []);
  }

  for (const item of items) {
    if (!groupedItems.has(item.queueType)) {
      continue;
    }

    groupedItems.get(item.queueType)?.push(item);
  }

  return groupedItems;
}

function isSyncSuccess(response: any) {
  const responseData = response?.data ?? response;

  if (responseData?.success === false) {
    return false;
  }

  if (responseData?.success === true && responseData?.data === false) {
    return false;
  }

  return responseData?.success === true || responseData?.data === true;
}

function getSyncErrorMessage(error: any, response?: any) {
  return response?.data?.message
    || error?.response?.data?.message
    || error?.message
    || 'Không thể đồng bộ dữ liệu offline.';
}

async function runSyncPendingOfflineQueue(
  onProgress?: (progress: OfflineSyncProgress) => void
): Promise<OfflineSyncResult> {
  const pendingItems = await listPendingQueueItems();
  const syncableItems = pendingItems.filter((item) => syncOrder.includes(item.queueType));
  const totalCount = syncableItems.length;
  let syncedCount = 0;

  onProgress?.({ current: syncedCount, total: totalCount });

  if (!totalCount) {
    return { syncedCount, totalCount };
  }

  const groupedItems = groupQueueItems(syncableItems);

  for (const queueType of syncOrder) {
    const items = groupedItems.get(queueType) ?? [];

    if (!items.length) {
      continue;
    }

    const config = syncConfigs[queueType];
    const ids = items.map((item) => item.id);
    const requestPayload = items.map((item) => config.mapPayload(item.payload));

    try {
      const response = await config.request(requestPayload);

      if (!isSyncSuccess(response)) {
        throw new Error(getSyncErrorMessage(null, response));
      }

      await deleteOfflineQueueItems(ids);
      syncedCount += items.length;
      onProgress?.({ current: syncedCount, total: totalCount, type: queueType });
    } catch (error: any) {
      const errorMessage = getSyncErrorMessage(error);
      await updateOfflineQueueItemsError(ids, errorMessage);
      throw new Error(errorMessage);
    }
  }

  return { syncedCount, totalCount };
}

let activeSyncPromise: Promise<OfflineSyncResult> | null = null;

export function syncPendingOfflineQueue(
  onProgress?: (progress: OfflineSyncProgress) => void
): Promise<OfflineSyncResult> {
  if (activeSyncPromise) {
    return activeSyncPromise;
  }

  activeSyncPromise = runSyncPendingOfflineQueue(onProgress).finally(() => {
    activeSyncPromise = null;
  });

  return activeSyncPromise;
}
