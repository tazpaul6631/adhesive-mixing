<template>
  <ion-app>
    <ion-router-outlet />
    <RouteLoadingOverlay />
    <AppToast />
    <OfflineDataLoading
      v-if="shouldShowMobileSyncLoading"
      :is-open="offlineStore.isSyncingQueue"
      :title="t('mobile.offlineSync.title')"
      :note="t('mobile.offlineSync.note')"
      :current="offlineStore.syncCurrent"
      :total="offlineStore.syncTotal"
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
const shouldShowMobileSyncLoading = computed(() => {
  return isMobilePhone.value && route.path !== '/login' && offlineStore.isSyncingQueue;
});

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

const startMobileOfflineSyncIfNeeded = async () => {
  if (!isMobilePhone.value || route.path === '/login' || !authStore.isAuthenticated || offlineStore.isSyncingQueue) {
    return;
  }

  try {
    await offlineStore.refreshQueueCounts();

    if (offlineStore.totalPendingQueueCount <= 0) {
      return;
    }

    await offlineStore.syncPendingQueue();
  } catch (error) {
    console.error('Không thể đồng bộ dữ liệu offline:', error);
  } finally {
    if (!offlineStore.isSyncingQueue) {
      offlineStore.resetSyncState();
    }
  }
};

const applyNetworkStatus = (connected: boolean) => {
  authStore.setNetworkStatus(connected);

  if (connected) {
    void startMobileOfflineSyncIfNeeded();
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
