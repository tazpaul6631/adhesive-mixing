import storageService from '@/services/storage.service';
import type { FailedPrintItem, SeparatePrintItem } from '@/services/separateMixedGlueLabelPrint';

const STORAGE_KEY = 'separate_print_pending_storage';

export interface SeparatePrintPendingState {
  workOrderMasterId: string;
  workOrderMasterName?: string;
  confirmBy: string;
  isNoMixGlue: boolean;
  failedItems: FailedPrintItem[];
  lastPrintTotal: number;
  updatedAt: string;
}

type LegacySeparatePrintPendingState = SeparatePrintPendingState & {
  isSeparateGlue?: boolean;
};

type LegacySeparatePrintItem = SeparatePrintItem & {
  isSeparateGlue?: boolean;
};

const normalizePendingPrintItem = (item: LegacySeparatePrintItem): SeparatePrintItem => {
  if (typeof item.isNoMixGlue === 'boolean') {
    return item;
  }
  if (typeof item.isSeparateGlue === 'boolean') {
    return {
      ...item,
      isNoMixGlue: !item.isSeparateGlue,
    };
  }
  return {
    ...item,
    isNoMixGlue: false,
  };
};

const normalizePendingState = (raw: LegacySeparatePrintPendingState): SeparatePrintPendingState | null => {
  let isNoMixGlue = raw.isNoMixGlue;
  if (typeof isNoMixGlue !== 'boolean' && typeof raw.isSeparateGlue === 'boolean') {
    isNoMixGlue = !raw.isSeparateGlue;
  }
  if (typeof isNoMixGlue !== 'boolean') {
    return null;
  }

  return {
    workOrderMasterId: raw.workOrderMasterId,
    workOrderMasterName: raw.workOrderMasterName,
    confirmBy: raw.confirmBy,
    isNoMixGlue,
    failedItems: (raw.failedItems ?? []).map((entry) => ({
      ...entry,
      item: normalizePendingPrintItem(entry.item as LegacySeparatePrintItem),
    })),
    lastPrintTotal: raw.lastPrintTotal,
    updatedAt: raw.updatedAt,
  };
};

export async function loadSeparatePrintPending(): Promise<SeparatePrintPendingState | null> {
  try {
    const raw = await storageService.get(STORAGE_KEY, true, false);
    if (!raw || typeof raw !== 'object') return null;
    const state = normalizePendingState(raw as LegacySeparatePrintPendingState);
    if (
      !state?.workOrderMasterId ||
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
