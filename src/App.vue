<template>
  <ion-app>
    <ion-router-outlet />
    <RouteLoadingOverlay />
    <AppToast />
    <OfflineDataLoading
      v-if="shouldShowMobileOfflineLoading"
      :is-open="shouldShowMobileOfflineLoading"
      :title="mobileOfflineLoadingTitle"
      :note="mobileOfflineLoadingNote"
      :current="mobileOfflineLoadingCurrent"
      :total="mobileOfflineLoadingTotal"
    />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { App } from '@capacitor/app';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from './store/auth';
import { useOfflineStore } from '@/store/offline';
import RouteLoadingOverlay from '@/components/RouteLoadingOverlay.vue';
import OfflineDataLoading from '@/views/Mobile/components/OfflineDataLoading.vue';

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const ionRouter = useIonRouter();
const route = useRoute();
const { t } = useI18n();
const isTablet = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

const isMobilePhone = computed(() => !isTablet.value);
const shouldShowMobileOfflineLoading = computed(() => {
  return isMobilePhone.value
    && route.path !== '/login'
    && (offlineStore.isSyncingQueue || offlineStore.isDownloadingOfflineData);
});
const isMobileOfflineSyncStep = computed(() => offlineStore.isSyncingQueue || offlineStore.syncTotal > 0);
const isMobileOfflineDownloadStep = computed(() => offlineStore.isDownloadingOfflineData || offlineStore.downloadTotal > 0);
const mobileOfflineLoadingTitle = computed(() => {
  if (isMobileOfflineSyncStep.value) return t('mobile.offlineSync.title');
  if (isMobileOfflineDownloadStep.value) return t('login.offlineDownloadTitle');
  return t('login.loadingTitle');
});
const mobileOfflineLoadingNote = computed(() => {
  if (isMobileOfflineSyncStep.value) return t('mobile.offlineSync.note');
  if (isMobileOfflineDownloadStep.value) return t('login.offlineDownloadNote');
  return t('login.loadingNote');
});
const mobileOfflineLoadingCurrent = computed(() => (
  isMobileOfflineSyncStep.value ? offlineStore.syncCurrent : offlineStore.downloadCurrent
));
const mobileOfflineLoadingTotal = computed(() => (
  isMobileOfflineSyncStep.value ? offlineStore.syncTotal : offlineStore.downloadTotal
));

// Xử lý nút Back vật lý trên Android
useBackButton(-1, () => {
  if (!ionRouter.canGoBack()) {
    App.exitApp();
  }
});

const updateDeviceType = () => {
  if (typeof window === 'undefined') return;
  isTablet.value = window.innerWidth >= 768;
};

const normalizeAppValue = (value: any) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const getNestedValue = (source: any, path: string[]) => {
  return path.reduce((current, key) => current?.[key], source);
};

const resolveCurrentFactoryId = () => {
  const userData = authStore.user;
  const candidates = [
    userData?.factoryId,
    userData?.factoryID,
    userData?.factoryCode,
    userData?.factory,
    getNestedValue(userData, ['factory', 'factoryId']),
    getNestedValue(userData, ['employee', 'factoryId']),
    getNestedValue(userData, ['user', 'factoryId']),
  ];

  return candidates.map(normalizeAppValue).find(Boolean) || '';
};

let activeReconnectRefreshPromise: Promise<void> | null = null;

const startMobileOfflineRefreshAfterReconnect = async () => {
  if (!isMobilePhone.value || route.path === '/login' || !authStore.isAuthenticated) {
    return;
  }

  if (activeReconnectRefreshPromise) {
    return activeReconnectRefreshPromise;
  }

  activeReconnectRefreshPromise = (async () => {
    await offlineStore.refreshQueueCounts();

    if (offlineStore.totalPendingQueueCount > 0) {
      await offlineStore.syncPendingQueue();
    }

    const factoryId = resolveCurrentFactoryId();
    if (!factoryId) {
      console.warn('Không tìm thấy factoryId để tải lại dữ liệu offline sau khi có mạng.');
      return;
    }

    offlineStore.resetDownloadState();
    await offlineStore.downloadOfflineQrData(factoryId);
  })()
    .catch((error) => {
      console.error('Không thể đồng bộ hoặc tải lại dữ liệu offline:', error);
    })
    .finally(() => {
      if (!offlineStore.isSyncingQueue) {
        offlineStore.resetSyncState();
      }

      if (!offlineStore.isDownloadingOfflineData) {
        offlineStore.resetDownloadState();
      }

      activeReconnectRefreshPromise = null;
    });

  return activeReconnectRefreshPromise;
};

const applyNetworkStatus = (connected: boolean) => {
  const wasOnline = authStore.isOnline;
  authStore.setNetworkStatus(connected);

  if (connected && !wasOnline) {
    void startMobileOfflineRefreshAfterReconnect();
  }
};

Network.addListener('networkStatusChange', (status) => {
  applyNetworkStatus(status.connected);
});

onMounted(async () => {
  try {
    const status = await Network.getStatus();
    applyNetworkStatus(status.connected);
  } catch {
    applyNetworkStatus(typeof navigator !== 'undefined' ? navigator.onLine : true);
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => applyNetworkStatus(true));
    window.addEventListener('offline', () => applyNetworkStatus(false));
    window.addEventListener('resize', updateDeviceType);
  }

  // Tự động ẩn Splash Screen sau khi app đã load xong
  await SplashScreen.hide();

  // Cấu hình Status Bar (ví dụ: nền trắng, chữ đen)
  const info = await Device.getInfo();
  if (info.platform !== 'web') {
    await StatusBar.setStyle({ style: Style.Light });
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateDeviceType);
  }
});
</script>
