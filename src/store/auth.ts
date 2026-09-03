import { defineStore } from 'pinia';
import storageService from '@/services/storage.service';
import router from '@/router';
import { useMixingDevicesStore } from '@/store/mixingDevices';

export interface UserData {
  employeeId: string;
  name?: string;
  isMixGlueRoom?: boolean;
  isMixGluePhone?: boolean;
  isQip?: boolean;
  mixingDevices?: unknown[];
  [key: string]: any;
}

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as UserData | null,
    token: '',
    isOnline: true,
    lastSync: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    getUserName: (state) => state.user?.name || state.user?.employeeId || 'Guest',
    canUseMixGlueRoom: (state) => Boolean(state.user?.isMixGlueRoom),
    canUseMixGluePhone: (state) => Boolean(state.user?.isMixGluePhone),
    canUseQip: (state) => Boolean(state.user?.isQip),
  },

  actions: {
    setAuthData(userData: UserData) {
      this.token = userData.employeeId;
      this.user = userData;

      localStorage.setItem('web_token_backup', userData.employeeId);

      useMixingDevicesStore().setFromLogin(userData?.mixingDevices);
    },

    setNetworkStatus(status: boolean) {
      this.isOnline = status;
    },

    async logout() {
      this.token = '';
      this.user = null;
      this.lastSync = null;

      localStorage.removeItem('web_token_backup');
      useMixingDevicesStore().clear();

      // Tạm thời comment await storageService.clear() nếu không muốn mất dữ liệu drafts của user hiện tại
      // Hoặc chỉ gọi localStorage.clear(), sessionStorage.clear() 
      // await storageService.clear();

      router.push('/login');
    }
  },

  persist: {
    key: 'patrol_auth_storage',
    storage: {
      getItem: async (key: string) => await storageService.get(key, false, true),
      setItem: async (key: string, value: string) => await storageService.set(key, value, true),
    } as any,
    pick: ['token', 'user', 'lastSync'],
  },
});
