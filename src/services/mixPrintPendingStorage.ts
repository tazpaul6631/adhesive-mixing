import storageService from '@/services/storage.service';
import type { MixGlueFailedPrintItem } from '@/services/mixGlueLabelPrint';

const STORAGE_KEY = 'mix_glue_print_pending_storage';

export interface MixGluePrintPendingState {
  workOrderMasterId: string;
  workOrderMasterName?: string;
  confirmBy: string;
  failedItems: MixGlueFailedPrintItem[];
  lastPrintTotal: number;
  updatedAt: string;
}

export async function loadMixGluePrintPending(): Promise<MixGluePrintPendingState | null> {
  try {
    const raw = await storageService.get(STORAGE_KEY, true, false);
    if (!raw || typeof raw !== 'object') return null;
    const state = raw as MixGluePrintPendingState;
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
    console.error('[mixGluePrintPending] load failed:', error);
    return null;
  }
}

export async function saveMixGluePrintPending(state: MixGluePrintPendingState): Promise<void> {
  await storageService.set(STORAGE_KEY, state, false);
}

export async function clearMixGluePrintPending(): Promise<void> {
  await storageService.remove(STORAGE_KEY);
}
