import { defineStore } from 'pinia';
import {
  downloadAndSaveGlueOfflineData,
  type GlueOfflineDownloadCounts,
  type GlueOfflineDownloadProgress,
} from '@/services/glueOfflineData.service';

export const useOfflineStore = defineStore('offline', {
  state: () => ({
    isDownloadingOfflineData: false,
    downloadCurrent: 0,
    downloadTotal: 0,
    downloadMessage: '',
    downloadError: '',
    lastDownloadCounts: null as GlueOfflineDownloadCounts | null,
  }),

  getters: {
    downloadPercent: (state) => {
      if (!state.downloadTotal) return 0;
      return Math.min(100, Math.round((state.downloadCurrent / state.downloadTotal) * 100));
    },
  },

  actions: {
    resetDownloadState() {
      this.isDownloadingOfflineData = false;
      this.downloadCurrent = 0;
      this.downloadTotal = 0;
      this.downloadMessage = '';
      this.downloadError = '';
      this.lastDownloadCounts = null;
    },

    setDownloadProgress(progress: GlueOfflineDownloadProgress) {
      this.downloadCurrent = progress.current;
      this.downloadTotal = progress.total;
      this.downloadMessage = progress.type || '';
    },

    async downloadOfflineQrData(factoryId: string) {
      this.isDownloadingOfflineData = true;
      this.downloadError = '';
      this.downloadCurrent = 0;
      this.downloadTotal = 0;
      this.lastDownloadCounts = null;

      try {
        this.lastDownloadCounts = await downloadAndSaveGlueOfflineData(factoryId, (progress) => {
          this.setDownloadProgress(progress);
        });

        return this.lastDownloadCounts;
      } catch (error: any) {
        this.downloadError = error?.message || 'Không thể tải dữ liệu offline.';
        throw error;
      } finally {
        this.isDownloadingOfflineData = false;
      }
    },
  },
});
