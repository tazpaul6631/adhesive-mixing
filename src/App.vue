<template>
  <div class="app-shell">
    <!--
      keep-alive theo meta.keepAlive (không dùng :include tên SFC).
      Lazy route async wrapper không mang tên ListMixGlue → :include trước đây không cache.
    -->
    <router-view v-slot="{ Component, route: viewRoute }">
      <keep-alive :max="5">
        <component
          :is="Component"
          v-if="Component && viewRoute.meta.keepAlive"
          :key="String(viewRoute.name || viewRoute.path)"
        />
      </keep-alive>
      <component
        :is="Component"
        v-if="Component && !viewRoute.meta.keepAlive"
        :key="String(viewRoute.name || viewRoute.path)"
      />
    </router-view>
    <RouteLoadingOverlay />
    <AppToast />
    <AppConfirm />
    <OfflineDataLoading v-if="shouldShowMobileOfflineLoading" :is-open="shouldShowMobileOfflineLoading"
      :title="mobileOfflineLoadingTitle" :note="mobileOfflineLoadingNote" :current="mobileOfflineLoadingCurrent"
      :total="mobileOfflineLoadingTotal" />
  </div>
</template>

<script setup lang="ts">
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
import { useAppBackButton } from '@/composables/useAppBackButton';
import RouteLoadingOverlay from '@/components/RouteLoadingOverlay.vue';
import OfflineDataLoading from '@/views/Mobile/components/OfflineDataLoading.vue';
import AppConfirm from '@/components/AppConfirm.vue';

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const route = useRoute();
const { t } = useI18n();
const isTablet = ref(typeof window !== 'undefined' ? window.innerWidth >= 768 : false);

const isMobilePhone = computed(() => !isTablet.value);
const shouldShowMobileOfflineLoading = computed(() => {
  return isMobilePhone.value
    && route.path !== '/login'
    && (offlineStore.isSyncingQueue || offlineStore.isDownloadingOfflineData);
});
const isMobileOfflineSyncStep = computed(() => offlineStore.isSyncingQueue);
const isMobileOfflineDownloadStep = computed(() => offlineStore.isDownloadingOfflineData);
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

// Fallback thấp nhất: có history → back; hết stack → thoát app.
useAppBackButton(-1, (_processNextHandler, canGoBack) => {
  if (canGoBack) {
    window.history.back();
    return;
  }
  void App.exitApp();
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

const resolveCurrentDepartmentId = () => {
  const userData = authStore.user;
  const candidates = [
    userData?.departmentId,
    userData?.departmentID,
    userData?.departmentCode,
    userData?.department,
    getNestedValue(userData, ['department', 'departmentId']),
    getNestedValue(userData, ['employee', 'departmentId']),
    getNestedValue(userData, ['user', 'departmentId']),
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
      offlineStore.resetSyncState();
    }

    const factoryId = resolveCurrentFactoryId();
    const departmentId = resolveCurrentDepartmentId();

    offlineStore.resetDownloadState();
    await offlineStore.downloadOfflineQrData(factoryId, departmentId);
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

  // Cấu hình Status Bar — overlay để WebView nhận safe-area-inset
  const info = await Device.getInfo();
  if (info.platform !== 'web') {
    try {
      await StatusBar.setOverlaysWebView({ overlay: true });
    } catch {
      // Một số máy/OS có thể không hỗ trợ overlay
    }
/* Style.Dark = chữ/icon sáng trên nền header primary xanh */
    await StatusBar.setStyle({ style: Style.Dark });
    try {
      await StatusBar.setBackgroundColor({ color: '#0b56d9' });
    } catch {
      // iOS có thể bỏ qua background color
    }
  }
});

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', updateDeviceType);
  }
});
</script>

<style>
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
}

.app-shell {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background: var(--app-shell-bg, #ffffff);
}
</style>
