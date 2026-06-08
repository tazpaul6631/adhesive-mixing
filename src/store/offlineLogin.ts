import { defineStore } from 'pinia';
import storageService from '@/services/storage.service';
import type { UserData } from '@/store/auth';

export type OfflineLoginUserData = UserData & Record<string, any>;

type OfflineLoginStoragePayload = {
  savedLoginCode?: string;
  savedUser?: OfflineLoginUserData | null;
  savedAt?: string;
};

const OFFLINE_LOGIN_STORAGE_KEY = 'mobile_offline_login_storage';

function normalizeLoginCode(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function cloneUserData(userData: OfflineLoginUserData | null) {
  if (!userData) {
    return null;
  }

  try {
    return JSON.parse(JSON.stringify(userData)) as OfflineLoginUserData;
  } catch {
    return { ...userData };
  }
}

export const useOfflineLoginStore = defineStore('offlineLogin', {
  state: () => ({
    savedLoginCode: '',
    savedUser: null as OfflineLoginUserData | null,
    savedAt: '',
    isOfflineLoginSession: false,
    hydrated: false,
  }),

  getters: {
    hasSavedLogin: (state) => !!state.savedLoginCode && !!state.savedUser,
  },

  actions: {
    async ensureHydrated() {
      if (this.hydrated) {
        return;
      }

      try {
        const raw = await storageService.get(OFFLINE_LOGIN_STORAGE_KEY, false, true);
        if (raw) {
          const parsed = JSON.parse(raw) as OfflineLoginStoragePayload;
          this.savedLoginCode = normalizeLoginCode(parsed?.savedLoginCode);
          this.savedUser = cloneUserData(parsed?.savedUser ?? null);
          this.savedAt = normalizeLoginCode(parsed?.savedAt);
        }
      } catch (error) {
        console.error('[offlineLogin] ensureHydrated failed:', error);
      }

      this.hydrated = true;
    },

    async persistToDisk() {
      await storageService.set(
        OFFLINE_LOGIN_STORAGE_KEY,
        JSON.stringify({
          savedLoginCode: this.savedLoginCode,
          savedUser: this.savedUser,
          savedAt: this.savedAt,
        }),
        true
      );
    },

    async saveOnlineLogin(loginCode: string, userData: OfflineLoginUserData) {
      const normalizedLoginCode = normalizeLoginCode(loginCode);

      if (!normalizedLoginCode || !userData) {
        return;
      }

      await this.ensureHydrated();
      this.savedLoginCode = normalizedLoginCode;
      this.savedUser = cloneUserData(userData);
      this.savedAt = new Date().toISOString();
      this.isOfflineLoginSession = false;
      await this.persistToDisk();
    },

    async getMatchedOfflineUser(loginCode: string) {
      await this.ensureHydrated();
      const normalizedLoginCode = normalizeLoginCode(loginCode);

      if (!normalizedLoginCode || !this.savedLoginCode || !this.savedUser) {
        return null;
      }

      if (normalizedLoginCode !== this.savedLoginCode) {
        return null;
      }

      return cloneUserData(this.savedUser);
    },

    markOfflineLoginSession() {
      this.isOfflineLoginSession = true;
    },

    markOnlineSession() {
      this.isOfflineLoginSession = false;
    },

    async clearOfflineLogin() {
      this.savedLoginCode = '';
      this.savedUser = null;
      this.savedAt = '';
      this.isOfflineLoginSession = false;
      this.hydrated = true;
      await storageService.remove(OFFLINE_LOGIN_STORAGE_KEY);
    },
  },
});
