import { defineStore } from 'pinia';

import storageService from '@/services/storage.service';

const STORAGE_KEY = 'glue_return_log_pending_storage';

export type GlueReturnLogPendingEntry = {
  glueReturnLogId: string;
  returnGlueId?: string;
  lineChemicalId?: string;
  factoryId?: string;
  returnWeight: string | number;
  returnWeightUnit: string;
  updaterId: string;
  weightTime: string;
  scaleConfirmed: true;
};

export const useGlueReturnLogPendingStore = defineStore('glueReturnLogPending', {
  state: () => ({
    pendingById: {} as Record<string, GlueReturnLogPendingEntry>,
    hydrated: false,
  }),

  actions: {
    async ensureHydrated() {
      if (this.hydrated) return;

      try {
        const raw = await storageService.get(STORAGE_KEY, false, true);
        if (raw) {
          const parsed = JSON.parse(raw);
          const pendingById = parsed?.pendingById ?? parsed;
          if (pendingById && typeof pendingById === 'object' && !Array.isArray(pendingById)) {
            this.pendingById = pendingById;
          }
        }
      } catch (error) {
        console.error('[glueReturnLogPending] ensureHydrated failed:', error);
      }

      this.hydrated = true;
    },

    async persistToDisk() {
      await storageService.set(
        STORAGE_KEY,
        JSON.stringify({ pendingById: this.pendingById }),
        true
      );
    },

    getPending(glueReturnLogId: string) {
      return this.pendingById[String(glueReturnLogId)];
    },

    async savePending(entry: GlueReturnLogPendingEntry) {
      await this.ensureHydrated();
      this.pendingById[String(entry.glueReturnLogId)] = entry;
      await this.persistToDisk();
    },

    async clearPending(glueReturnLogId: string) {
      await this.ensureHydrated();
      delete this.pendingById[String(glueReturnLogId)];
      await this.persistToDisk();
    },
  },
});
