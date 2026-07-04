import { ref, computed } from 'vue';
import { isAwaitingGapConfirm } from '@/services/labelPrintSession';

export interface PrintQueueEntry<TRow> {
  id: string;
  row: TRow;
}

export interface PrintJobResult {
  success: boolean;
  /** Số tem đã in — dùng để tính delay sau khi xong trước khi khởi đơn tiếp. */
  labelCount?: number;
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Generic print queue — không gọi API khi push, chỉ lưu row.
 * Consumer tự gọi `executeFn` khi đến lượt.
 */
export function usePrintQueue<TRow extends { workOrderMasterId?: string }>() {
  const queue = ref<Array<{ id: string; row: TRow }>>([]);
  const activeId = ref<string | null>(null);
  const isRunning = ref(false);

  const queuedIds = computed(() =>
    new Set(queue.value.map((e) => e.id))
  );

  const isQueued = (workOrderMasterId?: string) =>
    Boolean(workOrderMasterId && queuedIds.value.has(workOrderMasterId));

  const isActive = (workOrderMasterId?: string) =>
    Boolean(workOrderMasterId && activeId.value === workOrderMasterId && isRunning.value);

  const enqueue = (row: TRow): boolean => {
    const id = row.workOrderMasterId;
    if (!id) return false;
    if (isActive(id) || isQueued(id)) return false;
    queue.value = [...queue.value, { id, row }] as Array<{ id: string; row: TRow }>;
    return true;
  };

  const dequeue = (): PrintQueueEntry<TRow> | null => {
    if (queue.value.length === 0) return null;
    const [next, ...rest] = queue.value;
    queue.value = rest as Array<{ id: string; row: TRow }>;
    return next as PrintQueueEntry<TRow>;
  };

  const clearQueue = () => {
    queue.value = [];
  };

  /**
   * Chạy executor tuần tự: lấy job tiếp theo từ queue, chạy executeFn, lặp lại.
   * Gọi khi đã xong job hiện tại hoặc sau retry thành công.
   * Nếu executeFn trả false (lỗi) thì dừng queue — caller xử lý retry trước.
   */
  const runNext = async (
    executeFn: (entry: PrintQueueEntry<TRow>) => Promise<PrintJobResult>
  ): Promise<void> => {
    if (isRunning.value) return;
    if (isAwaitingGapConfirm()) return;

    const entry = dequeue();
    if (!entry) return;

    isRunning.value = true;
    activeId.value = entry.id;

    let result: PrintJobResult = { success: false };
    try {
      result = await executeFn(entry);
      if (!result.success) {
        return;
      }
    } finally {
      isRunning.value = false;
      activeId.value = null;
    }

    if (queue.value.length === 0) return;
    if (isAwaitingGapConfirm()) return;

    const INTER_ORDER_DELAY_MS = 2000;

    await sleep(INTER_ORDER_DELAY_MS);
    void runNext(executeFn);
  };

  /**
   * Sau khi retry thành công, tiếp tục queue.
   */
  const continueAfterRetry = (executeFn: (entry: PrintQueueEntry<TRow>) => Promise<PrintJobResult>) => {
    void runNext(executeFn);
  };

  return {
    queue,
    activeId,
    isRunning,
    isQueued,
    isActive,
    enqueue,
    dequeue,
    clearQueue,
    runNext,
    continueAfterRetry,
  };
}
