import { defineStore } from 'pinia';
import {
  downloadAndSaveGlueOfflineData,
  type GlueOfflineDownloadCounts,
  type GlueOfflineDownloadProgress,
} from '@/services/glueOfflineData.service';
import {
  getPendingQueueCounts,
  type OfflineQueueCounts,
  type OfflineQueueType,
} from '@/services/offlineQueue.service';
import {
  syncPendingOfflineQueue,
  type OfflineSyncProgress,
  type OfflineSyncResult,
} from '@/services/offlineSync.service';

const emptyQueueCounts = (): OfflineQueueCounts => ({
  ReceiveGlue: 0,
  ReturnGlue: 0,
  GlueCheckList: 0,
});

export const useOfflineStore = defineStore('offline', {
  state: () => ({
    isDownloadingOfflineData: false,
    downloadCurrent: 0,
    downloadTotal: 0,
    downloadMessage: '',
    downloadError: '',
    lastDownloadCounts: null as GlueOfflineDownloadCounts | null,
    queueCounts: emptyQueueCounts(),
    isLoadingQueueCounts: false,
    isSyncingQueue: false,
    syncCurrent: 0,
    syncTotal: 0,
    syncMessage: '',
    syncError: '',
  }),

  getters: {
    downloadPercent: (state) => {
      if (!state.downloadTotal) return 0;
      return Math.min(100, Math.round((state.downloadCurrent / state.downloadTotal) * 100));
    },
    totalPendingQueueCount: (state) => {
      return state.queueCounts.ReceiveGlue + state.queueCounts.ReturnGlue + state.queueCounts.GlueCheckList;
    },
    syncPercent: (state) => {
      if (!state.syncTotal) return 0;
      return Math.min(100, Math.round((state.syncCurrent / state.syncTotal) * 100));
    },
    getPendingQueueCount: (state) => {
      return (queueType: OfflineQueueType) => state.queueCounts[queueType] ?? 0;
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

    resetSyncState() {
      this.isSyncingQueue = false;
      this.syncCurrent = 0;
      this.syncTotal = 0;
      this.syncMessage = '';
      this.syncError = '';
    },

    setSyncProgress(progress: OfflineSyncProgress) {
      this.syncCurrent = progress.current;
      this.syncTotal = progress.total;
      this.syncMessage = progress.type || '';
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

    async refreshQueueCounts() {
      this.isLoadingQueueCounts = true;

      try {
        this.queueCounts = await getPendingQueueCounts();
      } catch (error) {
        console.error('Không thể đếm dữ liệu chờ đồng bộ:', error);
      } finally {
        this.isLoadingQueueCounts = false;
      }
    },

    async syncPendingQueue(): Promise<OfflineSyncResult> {
      if (this.isSyncingQueue) {
        return {
          syncedCount: this.syncCurrent,
          totalCount: this.syncTotal,
        };
      }

      this.isSyncingQueue = true;
      this.syncError = '';
      this.syncCurrent = 0;
      this.syncTotal = 0;

      try {
        const result = await syncPendingOfflineQueue((progress) => {
          this.setSyncProgress(progress);
        });

        await this.refreshQueueCounts();
        return result;
      } catch (error: any) {
        this.syncError = error?.message || 'Không thể đồng bộ dữ liệu offline.';
        await this.refreshQueueCounts();
        throw error;
      } finally {
        this.isSyncingQueue = false;
      }
    },
  },
});
