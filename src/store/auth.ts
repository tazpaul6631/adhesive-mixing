import { defineStore } from 'pinia';
import storageService from '@/services/storage.service';
import router from '@/router';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as any,
    token: localStorage.getItem('web_token_backup') || '',
    isOnline: true,
    lastSync: null as string | null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    getUserName: (state) => state.user?.name || 'Guest',
  },

  actions: {
    setToken(token: string) {
      this.token = token;
      localStorage.setItem('web_token_backup', token);
    },
    setNetworkStatus(status: boolean) {
      this.isOnline = status;
    },
    async logout() {
      this.token = '';
      this.user = null;

      localStorage.removeItem('web_token_backup');

      await storageService.clear();

      router.push('/login');
    }
  },

  persist: {
    key: 'patrol_auth_storage',
    storage: {
      getItem: (key: string) => storageService.get(key, false, true),
      setItem: (key: string, value: string) => storageService.set(key, value, true),
    } as any,
    pick: ['token', 'user', 'lastSync'],
  },
});