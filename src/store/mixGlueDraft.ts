import { defineStore } from 'pinia';

import storageService from '@/services/storage.service';

const STORAGE_KEY = 'mix_glue_drafts_storage';
/** Gộp nhiều saveDraft liên tiếp thành 1 lần encrypt+Preferences — giảm peak CPU/RAM máy yếu. */
const PERSIST_DEBOUNCE_MS = 600;

let persistTimer: ReturnType<typeof setTimeout> | null = null;
let persistWaiters: Array<{ resolve: () => void; reject: (error: unknown) => void }> = [];

export type MixGlueDraftPayload = Record<string, unknown>;

export const normalizeDraftWorkOrderId = (
  workOrderMasterId: string | number | undefined | null
): string => {
  if (workOrderMasterId === undefined || workOrderMasterId === null) return '';
  return String(workOrderMasterId).trim();
};

const hasSeparateGlueTableProgress = (items: unknown): boolean =>
  Array.isArray(items) &&
  items.some((row: any) => !!row?.selectedBucketId || !!row?.bucketId);

/** Draft có dòng bảng chiết keo trộn / không trộn. */
export const hasDraftSeparateTableData = (draft: MixGlueDraftPayload | undefined | null): boolean => {
  if (!draft) return false;
  if (Array.isArray(draft.separateGlueDetails) && draft.separateGlueDetails.length > 0) return true;
  if (Array.isArray(draft.noMixSeparateGlueDetails) && draft.noMixSeparateGlueDetails.length > 0) return true;
  if (Array.isArray(draft.apiNoSeparateGlues) && draft.apiNoSeparateGlues.length > 0) return true;
  return (
    hasSeparateGlueTableProgress(draft.separateGlueDetails)
    || hasSeparateGlueTableProgress(draft.noMixSeparateGlueDetails)
  );
};

const hasMixTableProgress = (items: unknown): boolean =>
  Array.isArray(items) &&
  items.some(
    (item: any) =>
      item.weighingTime ||
      (item.actualWeight && Number(item.actualWeight) > 0) ||
      item.glueExtra
  );

const hasNoMixDraftProgress = (draft: MixGlueDraftPayload): boolean => {
  const weighed = (items: unknown) =>
    Array.isArray(items) &&
    items.some(
      (item: any) =>
        item.weighingTime ||
        (item.actualWeight && Number(item.actualWeight) > 0) ||
        (item.glueExtra && item.requiredWeight && Number(item.requiredWeight) > 0)
    );

  return weighed(draft.noMixComponents) || weighed(draft.noMixChemicalsFull);
};

/** Draft còn tiến độ chưa gửi chính thức (Mix Glue). */
export const isMixGlueDraftRestorable = (draft: MixGlueDraftPayload | undefined | null): boolean => {
  if (!draft) return false;
  return hasMixTableProgress(draft.componentDetailsFull) || hasNoMixDraftProgress(draft);
};

/** Draft còn tiến độ chưa gửi chính thức (Separate). */
export const isSeparateDraftRestorable = (draft: MixGlueDraftPayload | undefined | null): boolean => {
  if (!draft) return false;

  if (Array.isArray(draft.separateGlueDetails) && draft.separateGlueDetails.length > 0) {
    return true;
  }
  if (Array.isArray(draft.noMixSeparateGlueDetails) && draft.noMixSeparateGlueDetails.length > 0) {
    return true;
  }
  if (Array.isArray(draft.orderDetails) && draft.orderDetails.some((o: any) =>
    !!o.selectedBucketId || (Array.isArray(o.selectedRequestDetailIds) && o.selectedRequestDetailIds.length > 0)
  )) {
    return true;
  }
  return hasNoMixDraftProgress(draft);
};

export const useMixGlueDraftStore = defineStore('mixGlueDraft', {
  state: () => ({
    drafts: {} as Record<string, MixGlueDraftPayload>,
    hydrated: false,
  }),
  actions: {
    /** Đọc draft từ Capacitor Preferences (chống race khi mở app cold start). */
    async ensureHydrated() {
      if (this.hydrated) return;

      try {
        const raw = await storageService.get(STORAGE_KEY, false, true);
        if (raw) {
          const parsed = JSON.parse(raw);
          const drafts = parsed?.drafts ?? parsed;
          if (drafts && typeof drafts === 'object' && !Array.isArray(drafts)) {
            this.drafts = drafts;
          }
        }
      } catch (error) {
        console.error('[mixGlueDraft] ensureHydrated failed:', error);
      }

      this.hydrated = true;
    },

    async persistToDisk() {
      await storageService.set(STORAGE_KEY, JSON.stringify({ drafts: this.drafts }), true);
    },

    /**
     * Debounce ghi disk — RAM vẫn cập nhật ngay trong saveDraft.
     * flushPersist() dùng khi clear / cần chắc chắn đã ghi.
     */
    schedulePersist(): Promise<void> {
      return new Promise((resolve, reject) => {
        persistWaiters.push({ resolve, reject });

        if (persistTimer) {
          clearTimeout(persistTimer);
        }

        persistTimer = setTimeout(() => {
          void this.flushPersist();
        }, PERSIST_DEBOUNCE_MS);
      });
    },

    async flushPersist() {
      if (persistTimer) {
        clearTimeout(persistTimer);
        persistTimer = null;
      }

      const waiters = persistWaiters.splice(0, persistWaiters.length);

      try {
        await this.persistToDisk();
        waiters.forEach((waiter) => waiter.resolve());
      } catch (error) {
        waiters.forEach((waiter) => waiter.reject(error));
        throw error;
      }
    },

    async saveDraft(workOrderMasterId: string, data: MixGlueDraftPayload) {
      const key = normalizeDraftWorkOrderId(workOrderMasterId);
      if (!key) return;

      await this.ensureHydrated();
      this.drafts[key] = data;
      await this.schedulePersist();
    },

    async clearDraft(workOrderMasterId: string) {
      const key = normalizeDraftWorkOrderId(workOrderMasterId);
      if (!key) return;

      await this.ensureHydrated();
      delete this.drafts[key];
      await this.flushPersist();
    },

    async clearAll() {
      await this.ensureHydrated();
      this.drafts = {};
      await this.flushPersist();
    },

    getDraft(workOrderMasterId: string) {
      const key = normalizeDraftWorkOrderId(workOrderMasterId);
      if (!key) return undefined;
      return this.drafts[key];
    },

    async getDraftAsync(workOrderMasterId: string) {
      await this.ensureHydrated();
      const key = normalizeDraftWorkOrderId(workOrderMasterId);
      if (!key) return undefined;
      return this.drafts[key];
    },
  },
});
