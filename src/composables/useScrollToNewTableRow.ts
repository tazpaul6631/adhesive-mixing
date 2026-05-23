import { ref, watch, nextTick, type Ref } from 'vue';

export interface UseScrollToNewTableRowOptions {
  focusSelector?: string;
  highlightClass?: string;
  highlightMs?: number;
  scrollDelayMs?: number;
}

export function useScrollToNewTableRow(
  tableWrapperRef: Ref<HTMLElement | null>,
  getRowCount: () => number,
  options: UseScrollToNewTableRowOptions = {}
) {
  const {
    focusSelector = '',
    highlightClass = 'table-row-active',
    highlightMs = 2500,
    scrollDelayMs = 120,
  } = options;

  const pendingScrollToNewRow = ref(false);
  let activeRowHighlightTimer: ReturnType<typeof setTimeout> | null = null;

  const clearActiveRowHighlight = () => {
    tableWrapperRef.value
      ?.querySelectorAll(`.${highlightClass}`)
      .forEach((el) => el.classList.remove(highlightClass));
  };

  const scrollToRowIndex = async (index: number) => {
    await nextTick();
    setTimeout(() => {
      const wrapper = tableWrapperRef.value;
      if (!wrapper || index < 0) return;

      const tbody = wrapper.querySelector('.p-datatable-scrollable-body tbody')
        || wrapper.querySelector('.p-datatable-tbody');
      const row = tbody?.querySelectorAll('tr')?.[index] as HTMLElement | undefined;
      if (!row) return;

      clearActiveRowHighlight();
      row.classList.add(highlightClass);
      if (activeRowHighlightTimer) clearTimeout(activeRowHighlightTimer);
      activeRowHighlightTimer = setTimeout(() => {
        row.classList.remove(highlightClass);
      }, highlightMs);

      row.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

      if (focusSelector) {
        const focusTarget = row.querySelector(focusSelector) as HTMLElement | null;
        focusTarget?.focus?.();
      }
    }, scrollDelayMs);
  };

  const markPendingScrollToNewRow = () => {
    pendingScrollToNewRow.value = true;
  };

  watch(
    () => getRowCount(),
    (newLen, oldLen) => {
      if (!pendingScrollToNewRow.value || oldLen === undefined || newLen <= oldLen) return;
      pendingScrollToNewRow.value = false;
      void scrollToRowIndex(newLen - 1);
    }
  );

  return {
    markPendingScrollToNewRow,
    scrollToRowIndex,
  };
}
