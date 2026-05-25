import storageService from '@/services/storage.service';
import type { FailedPrintItem } from '@/services/separateMixedGlueLabelPrint';

const STORAGE_KEY = 'separate_print_pending_storage';

export interface SeparatePrintPendingState {
  workOrderMasterId: string;
  workOrderMasterName?: string;
  confirmBy: string;
  isSeparateGlue: boolean;
  failedItems: FailedPrintItem[];
  lastPrintTotal: number;
  updatedAt: string;
}

export async function loadSeparatePrintPending(): Promise<SeparatePrintPendingState | null> {
  try {
    const raw = await storageService.get(STORAGE_KEY, true, false);
    if (!raw || typeof raw !== 'object') return null;
    const state = raw as SeparatePrintPendingState;
    if (
      !state.workOrderMasterId ||
      !state.confirmBy ||
      !Array.isArray(state.failedItems) ||
      !state.failedItems.length
    ) {
      return null;
    }
    return state;
  } catch (error) {
    console.error('[separatePrintPending] load failed:', error);
    return null;
  }
}

export async function saveSeparatePrintPending(state: SeparatePrintPendingState): Promise<void> {
  await storageService.set(STORAGE_KEY, state, false);
}

export async function clearSeparatePrintPending(): Promise<void> {
  await storageService.remove(STORAGE_KEY);
}
