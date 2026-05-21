import { defineStore } from 'pinia';

import storageService from '@/services/storage.service';

const STORAGE_KEY = 'mix_glue_drafts_storage';

export type MixGlueDraftPayload = Record<string, unknown>;

/** Draft còn tiến độ chưa gửi chính thức (Mix Glue). */
export const isMixGlueDraftRestorable = (draft: MixGlueDraftPayload | undefined | null): boolean => {
  if (!draft) return false;
  const components = draft.componentDetailsFull;
  if (!Array.isArray(components) || components.length === 0) return false;
  return components.some(
    (item: any) =>
      item.weighingTime ||
      (item.actualWeight && Number(item.actualWeight) > 0) ||
      item.glueExtra
  );
};

/** Draft còn tiến độ chưa gửi chính thức (Separate). */
export const isSeparateDraftRestorable = (draft: MixGlueDraftPayload | undefined | null): boolean => {
  if (!draft) return false;

  if (Array.isArray(draft.separateGlueDetails) && draft.separateGlueDetails.length > 0) {
    return true;
  }
  if (Array.isArray(draft.orderDetails) && draft.orderDetails.some((o: any) =>
    !!o.selectedBucketId || (Array.isArray(o.selectedRequestDetailIds) && o.selectedRequestDetailIds.length > 0)
  )) {
    return true;
  }
  if (Array.isArray(draft.extraChietList) && draft.extraChietList.length > 0) {
    return true;
  }

  const pendingByMaterial = draft.chietPendingByMaterial;
  if (pendingByMaterial && typeof pendingByMaterial === 'object') {
    const hasPendingChiet = Object.values(pendingByMaterial as Record<string, unknown>).some(
      (rows) => Array.isArray(rows) && rows.length > 0
    );
    if (hasPendingChiet) return true;
  }

  const weighed = (items: any[]) =>
    Array.isArray(items) &&
    items.some(
      (item: any) =>
        item.weighingTime ||
        (item.actualWeight && Number(item.actualWeight) > 0) ||
        item.isChietCompleted ||
        (item.glueExtra && item.requiredWeight && Number(item.requiredWeight) > 0)
    );

  return weighed(draft.noMixComponents as any[]) || weighed(draft.noMixChemicalsFull as any[]);
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

    async saveDraft(workOrderMasterId: string, data: MixGlueDraftPayload) {
      await this.ensureHydrated();
      this.drafts[workOrderMasterId] = data;
      await this.persistToDisk();
    },

    async clearDraft(workOrderMasterId: string) {
      await this.ensureHydrated();
      delete this.drafts[workOrderMasterId];
      await this.persistToDisk();
    },

    getDraft(workOrderMasterId: string) {
      return this.drafts[workOrderMasterId];
    },

    async getDraftAsync(workOrderMasterId: string) {
      await this.ensureHydrated();
      return this.drafts[workOrderMasterId];
    },
  },
});
