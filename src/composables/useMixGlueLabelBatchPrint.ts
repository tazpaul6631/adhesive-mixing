import { computed, ref } from 'vue';
import {
  printMixGlueLabelsSequential,
  type MixGlueFailedPrintItem,
  type MixGluePrintFailureReason,
  type MixGluePrintItem,
  type MixGluePrintSequentialResult,
} from '@/services/mixGlueLabelPrint';
import {
  clearMixGluePrintPending,
  loadMixGluePrintPending,
  saveMixGluePrintPending,
  type MixGluePrintPendingState,
} from '@/services/mixPrintPendingStorage';

export interface MixGluePrintJobContext {
  workOrderMasterId: string;
  workOrderMasterName?: string;
  confirmBy: string;
  lastPrintTotal: number;
}

export interface MixGlueBatchPrintRuntimeOptions {
  isConnected?: () => boolean;
}

export function useMixGlueLabelBatchPrint() {
  const isPrinting = ref(false);
  const progress = ref({ current: 0, total: 0 });
  const failedItems = ref<MixGlueFailedPrintItem[]>([]);
  const lastErrorReason = ref<MixGluePrintFailureReason | null>(null);
  const printJobContext = ref<MixGluePrintJobContext | null>(null);

  const hasPendingPrint = computed(() => failedItems.value.length > 0);
  const pendingCount = computed(() => failedItems.value.length);

  const resetProgress = () => {
    progress.value = { current: 0, total: 0 };
  };

  const persistPendingState = async () => {
    const ctx = printJobContext.value;
    if (!ctx || !failedItems.value.length) return;

    await saveMixGluePrintPending({
      workOrderMasterId: ctx.workOrderMasterId,
      workOrderMasterName: ctx.workOrderMasterName,
      confirmBy: ctx.confirmBy,
      failedItems: failedItems.value,
      lastPrintTotal: ctx.lastPrintTotal,
      updatedAt: new Date().toISOString(),
    });
  };

  const clearPendingStorage = async () => {
    printJobContext.value = null;
    await clearMixGluePrintPending();
  };

  const applyBatchResult = async (result: MixGluePrintSequentialResult) => {
    failedItems.value = result.failedItems;
    lastErrorReason.value = result.stoppedReason ?? null;

    if (result.failedItems.length > 0) {
      await persistPendingState();
    } else {
      await clearPendingStorage();
    }

    return result;
  };

  const startPrint = async (
    queue: MixGluePrintItem[],
    writeFn: (tspl: string) => Promise<boolean>,
    factoryId: string,
    jobContext: MixGluePrintJobContext,
    runtimeOptions?: MixGlueBatchPrintRuntimeOptions
  ): Promise<MixGluePrintSequentialResult> => {
    if (isPrinting.value) {
      return { ok: false, printedCount: 0, failedItems: failedItems.value };
    }

    isPrinting.value = true;
    failedItems.value = [];
    lastErrorReason.value = null;
    printJobContext.value = jobContext;
    progress.value = { current: 0, total: queue.length };

    try {
      const result = await printMixGlueLabelsSequential(
        writeFn,
        queue,
        factoryId,
        jobContext.confirmBy,
        (current, total) => {
          progress.value = { current, total };
        },
        {
          isConnected: runtimeOptions?.isConnected,
        }
      );

      return await applyBatchResult(result);
    } catch (error) {
      console.error('[useMixGlueLabelBatchPrint] startPrint failed:', error);
      const printedCount = progress.value.current;
      const failed = queue.slice(printedCount).map((item, offset) => ({
        item,
        reason: (offset === 0 ? 'bluetooth_disconnect' : 'skipped_after_error') as MixGluePrintFailureReason,
        message: offset === 0
          ? 'Mất kết nối Bluetooth với máy in.'
          : 'Chưa in do lỗi ở tem trước đó.',
      }));

      failedItems.value = failed;
      lastErrorReason.value = 'bluetooth_disconnect';
      if (failed.length > 0) {
        await persistPendingState();
      }

      return {
        ok: false,
        printedCount,
        failedItems: failed,
        stoppedReason: 'bluetooth_disconnect',
      };
    } finally {
      isPrinting.value = false;
    }
  };

  const retryFailed = async (
    writeFn: (tspl: string) => Promise<boolean>,
    factoryId: string,
    runtimeOptions?: MixGlueBatchPrintRuntimeOptions
  ): Promise<MixGluePrintSequentialResult> => {
    const ctx = printJobContext.value;
    if (!failedItems.value.length || !ctx || isPrinting.value) {
      return { ok: false, printedCount: 0, failedItems: failedItems.value };
    }

    const retryQueue = failedItems.value.map((entry) => entry.item);
    isPrinting.value = true;
    lastErrorReason.value = null;
    progress.value = { current: 0, total: retryQueue.length };

    try {
      const result = await printMixGlueLabelsSequential(
        writeFn,
        retryQueue,
        factoryId,
        ctx.confirmBy,
        (current, total) => {
          progress.value = { current, total };
        },
        {
          isConnected: runtimeOptions?.isConnected,
        }
      );

      return await applyBatchResult(result);
    } catch (error) {
      console.error('[useMixGlueLabelBatchPrint] retryFailed failed:', error);
      const printedCount = progress.value.current;
      const failed = retryQueue.slice(printedCount).map((item, offset) => ({
        item,
        reason: (offset === 0 ? 'bluetooth_disconnect' : 'skipped_after_error') as MixGluePrintFailureReason,
        message: offset === 0
          ? 'Mất kết nối Bluetooth với máy in.'
          : 'Chưa in do lỗi ở tem trước đó.',
      }));

      failedItems.value = failed;
      lastErrorReason.value = 'bluetooth_disconnect';
      if (failed.length > 0) {
        await persistPendingState();
      }

      return {
        ok: false,
        printedCount,
        failedItems: failed,
        stoppedReason: 'bluetooth_disconnect',
      };
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

  const restorePendingFromStorage = async (): Promise<MixGluePrintPendingState | null> => {
    const saved = await loadMixGluePrintPending();
    if (!saved) return null;

    failedItems.value = saved.failedItems;
    printJobContext.value = {
      workOrderMasterId: saved.workOrderMasterId,
      workOrderMasterName: saved.workOrderMasterName,
      confirmBy: saved.confirmBy,
      lastPrintTotal: saved.lastPrintTotal,
    };
    lastErrorReason.value = saved.failedItems[0]?.reason ?? null;
    progress.value = {
      current: saved.lastPrintTotal - saved.failedItems.length,
      total: saved.lastPrintTotal,
    };

    return saved;
  };

  return {
    isPrinting,
    progress,
    failedItems,
    lastErrorReason,
    printJobContext,
    hasPendingPrint,
    pendingCount,
    clearFailedItems,
    restorePendingFromStorage,
    startPrint,
    retryFailed,
  };
}
