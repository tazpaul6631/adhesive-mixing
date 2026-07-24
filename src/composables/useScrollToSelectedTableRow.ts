import { nextTick, type Ref } from 'vue';

interface UseScrollToSelectedTableRowOptions {
  scrollDelayMs?: number;
  block?: ScrollLogicalPosition;
}

/**
 * Scroll DataTable tới row đang selected (match theo dataKey) nếu row đó
 * nằm trong danh sách đang hiển thị trên trang hiện tại.
 */
export function useScrollToSelectedTableRow(
  tableWrapperRef: Ref<HTMLElement | null>,
  options: UseScrollToSelectedTableRowOptions = {}
) {
  const {
    scrollDelayMs = 120,
    block = 'center',
  } = options;

  const scrollToRowByDataKey = async (
    rows: Array<Record<string, unknown> | { [key: string]: unknown }>,
    selectedId: string | number | null | undefined,
    dataKey = 'workOrderMasterId'
  ) => {
    if (selectedId == null || selectedId === '') return;

    await nextTick();
    setTimeout(() => {
      const wrapper = tableWrapperRef.value;
      if (!wrapper) return;

      const targetId = String(selectedId);
      const index = rows.findIndex(
        (row) => String(row?.[dataKey] ?? '') === targetId
      );
      if (index < 0) return;

      const tbody =
        wrapper.querySelector('.p-datatable-scrollable-body tbody')
        || wrapper.querySelector('.p-datatable-tbody');
      const row = tbody?.querySelectorAll('tr')?.[index] as HTMLElement | undefined;
      row?.scrollIntoView({ behavior: 'smooth', block });
    }, scrollDelayMs);
  };

  return { scrollToRowByDataKey };
}
