import { computed, ref } from 'vue';
import {
  fetchSeparatePrintBatchFromWorkOrder,
  printSeparateLabelsSequential,
  type FailedPrintItem,
  type FetchSeparatePrintBatchOptions,
  type PrintFailureReason,
  type SeparatePrintBatchResult,
  type SeparatePrintItem,
} from '@/services/separateMixedGlueLabelPrint';
import {
  clearSeparatePrintPending,
  loadSeparatePrintPending,
  saveSeparatePrintPending,
  type SeparatePrintPendingState,
} from '@/services/separatePrintPendingStorage';

export interface PrintJobContext {
  workOrderMasterId: string;
  workOrderMasterName?: string;
  confirmBy: string;
  isSeparateGlue: boolean;
  lastPrintTotal: number;
}

export interface SeparateBatchPrintRuntimeOptions {
  isConnected?: () => boolean;
}

export function useSeparateLabelBatchPrint() {
  const isPrinting = ref(false);
  const progress = ref({ current: 0, total: 0 });
  const failedItems = ref<FailedPrintItem[]>([]);
  const lastErrorReason = ref<PrintFailureReason | null>(null);
  const abortRequested = ref(false);
  const printJobContext = ref<PrintJobContext | null>(null);

  const hasPendingPrint = computed(() => failedItems.value.length > 0);
  const pendingCount = computed(() => failedItems.value.length);

  const resetProgress = () => {
    progress.value = { current: 0, total: 0 };
  };

  const cancelPrint = () => {
    abortRequested.value = true;
  };

  const persistPendingState = async () => {
    const ctx = printJobContext.value;
    if (!ctx || !failedItems.value.length) return;

    await saveSeparatePrintPending({
      workOrderMasterId: ctx.workOrderMasterId,
      workOrderMasterName: ctx.workOrderMasterName,
      confirmBy: ctx.confirmBy,
      isSeparateGlue: ctx.isSeparateGlue,
      failedItems: failedItems.value,
      lastPrintTotal: ctx.lastPrintTotal,
      updatedAt: new Date().toISOString(),
    });
  };

  const clearPendingStorage = async () => {
    printJobContext.value = null;
    await clearSeparatePrintPending();
  };

  const applyBatchResult = async (result: SeparatePrintBatchResult) => {
    failedItems.value = result.failedItems;
    lastErrorReason.value = result.stoppedReason ?? null;

    if (result.failedItems.length > 0) {
      await persistPendingState();
    } else {
      await clearPendingStorage();
    }

    return result;
  };

  const preparePrintBatch = (options: FetchSeparatePrintBatchOptions) =>
    fetchSeparatePrintBatchFromWorkOrder(options);

  const restorePendingFromStorage = async (): Promise<SeparatePrintPendingState | null> => {
    const saved = await loadSeparatePrintPending();
    if (!saved) return null;

    failedItems.value = saved.failedItems;
    printJobContext.value = {
      workOrderMasterId: saved.workOrderMasterId,
      workOrderMasterName: saved.workOrderMasterName,
      confirmBy: saved.confirmBy,
      isSeparateGlue: saved.isSeparateGlue,
      lastPrintTotal: saved.lastPrintTotal,
    };
    lastErrorReason.value = saved.failedItems[0]?.reason ?? null;
    progress.value = {
      current: saved.lastPrintTotal - saved.failedItems.length,
      total: saved.lastPrintTotal,
    };

    return saved;
  };

  const startPrint = async (
    queue: SeparatePrintItem[],
    writeFn: (tspl: string) => Promise<boolean>,
    factoryId: string,
    jobContext: PrintJobContext,
    runtimeOptions?: SeparateBatchPrintRuntimeOptions
  ): Promise<SeparatePrintBatchResult> => {
    if (isPrinting.value) {
      return { ok: false, printedCount: 0, failedItems: failedItems.value };
    }

    isPrinting.value = true;
    abortRequested.value = false;
    failedItems.value = [];
    lastErrorReason.value = null;
    printJobContext.value = jobContext;
    progress.value = { current: 0, total: queue.length };

    try {
      const result = await printSeparateLabelsSequential({
        writeFn,
        items: queue,
        factoryId,
        shouldAbort: () => abortRequested.value,
        isConnected: runtimeOptions?.isConnected,
        onProgress: (current, total) => {
          progress.value = { current, total };
        },
      });

      return await applyBatchResult(result);
    } finally {
      isPrinting.value = false;
    }
  };

  const retryFailed = async (
    writeFn: (tspl: string) => Promise<boolean>,
    factoryId: string,
    runtimeOptions?: SeparateBatchPrintRuntimeOptions
  ): Promise<SeparatePrintBatchResult> => {
    if (!failedItems.value.length || isPrinting.value) {
      return { ok: false, printedCount: 0, failedItems: failedItems.value };
    }

    const retryQueue = failedItems.value.map((entry) => entry.item);
    isPrinting.value = true;
    abortRequested.value = false;
    lastErrorReason.value = null;
    progress.value = { current: 0, total: retryQueue.length };

    try {
      const result = await printSeparateLabelsSequential({
        writeFn,
        items: retryQueue,
        factoryId,
        shouldAbort: () => abortRequested.value,
        isConnected: runtimeOptions?.isConnected,
        onProgress: (current, total) => {
          progress.value = { current, total };
        },
      });

      return await applyBatchResult(result);
    } finally {
      isPrinting.value = false;
    }
  };

  const clearFailedItems = async () => {
    failedItems.value = [];
    lastErrorReason.value = null;
    resetProgress();
    await clearPendingStorage();
  };

  return {
    isPrinting,
    progress,
    failedItems,
    lastErrorReason,
    printJobContext,
    hasPendingPrint,
    pendingCount,
    cancelPrint,
    clearFailedItems,
    restorePendingFromStorage,
    preparePrintBatch,
    startPrint,
    retryFailed,
  };
}
