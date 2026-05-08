import { defineStore } from 'pinia';

export const useMixGlueDraftStore = defineStore('mixGlueDraft', {
  state: () => ({
    // Lưu draft theo workOrderMasterId làm key để có thể lưu nhiều đơn đang dở dang
    drafts: {} as Record<string, any>
  }),
  actions: {
    saveDraft(workOrderMasterId: string, data: any) {
      this.drafts[workOrderMasterId] = data;
    },
    clearDraft(workOrderMasterId: string) {
      delete this.drafts[workOrderMasterId];
    },
    getDraft(workOrderMasterId: string) {
      return this.drafts[workOrderMasterId];
    }
  },
  // Kích hoạt plugin persistedstate để dữ liệu không mất khi kill app
  persist: true,
});