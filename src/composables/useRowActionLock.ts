import { ref } from 'vue';

export type RowActionKind = 'confirm' | 'noMix' | 'print';

/**
 * Khóa thao tác theo dòng — tránh double-click khi chờ API / BLE / quét thẻ.
 * Một thời điểm chỉ cho phép một dòng một action.
 */
export function useRowActionLock() {
  const busyRowId = ref<string | null>(null);
  const busyAction = ref<RowActionKind | null>(null);

  const isRowActionBusy = (workOrderMasterId?: string, action?: RowActionKind): boolean => {
    if (!busyRowId.value || !workOrderMasterId) return false;
    if (busyRowId.value !== workOrderMasterId) return false;
    if (action && busyAction.value !== action) return false;
    return true;
  };

  const isAnyRowBusy = (): boolean => busyRowId.value != null;

  const lockRow = (workOrderMasterId: string, action: RowActionKind): boolean => {
    if (busyRowId.value) return false;
    busyRowId.value = workOrderMasterId;
    busyAction.value = action;
    return true;
  };

  const unlockRow = (): void => {
    busyRowId.value = null;
    busyAction.value = null;
  };

  return {
    busyRowId,
    busyAction,
    isRowActionBusy,
    isAnyRowBusy,
    lockRow,
    unlockRow,
  };
}
