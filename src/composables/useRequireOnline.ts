import { useToast } from 'primevue/usetoast';
import { useAuthStore } from '@/store/auth';
import { useAppLocale } from '@/composables/useAppLocale';

const isAxiosNetworkError = (error: unknown): boolean => {
  const err = error as { response?: unknown; code?: string; message?: string };
  if (!err?.response) return true;
  if (err.code === 'ERR_NETWORK' || err.code === 'ECONNABORTED') return true;
  const msg = String(err.message || '').toLowerCase();
  return msg.includes('network error') || msg.includes('network');
};

/**
 * Kiểm tra online trước khi gửi dữ liệu lên server (Tablet).
 * Không xóa store/draft khi offline — caller chỉ clear sau khi API/ in thành công.
 */
export function useRequireOnline() {
  const authStore = useAuthStore();
  const toast = useToast();
  const { t } = useAppLocale(() => 'tablet');

  const showOfflineToast = () => {
    toast.add({
      severity: 'warn',
      summary: t('common.networkOffline'),
      detail: t('common.checkNetwork'),
      life: 6000,
    });
  };

  const syncNetworkFromDevice = async (): Promise<boolean> => {
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      authStore.setNetworkStatus(false);
      return false;
    }

    try {
      const { Network } = await import('@capacitor/network');
      const status = await Network.getStatus();
      authStore.setNetworkStatus(status.connected);
      return status.connected;
    } catch {
      const online = typeof navigator === 'undefined' ? true : navigator.onLine;
      authStore.setNetworkStatus(online);
      return online;
    }
  };

  const requireOnline = async (): Promise<boolean> => {
    const connected = await syncNetworkFromDevice();
    if (!connected) {
      showOfflineToast();
      return false;
    }
    return true;
  };

  /** Gọi trong catch sau API submit — hiện toast mạng nếu lỗi do mất kết nối. */
  const notifyOfflineFromError = (error: unknown): boolean => {
    if (!isAxiosNetworkError(error)) {
      return false;
    }
    authStore.setNetworkStatus(false);
    showOfflineToast();
    return true;
  };

  return {
    requireOnline,
    notifyOfflineFromError,
    isAxiosNetworkError,
    showOfflineToast,
    syncNetworkFromDevice,
  };
}
