<template>
  <AppPage>
    <AppHeader no-border class="app-menu-header">
      <template #start>
        <div class="header-start">
          <h1 class="header-title">{{ t('appMenu.title') }}</h1>
        </div>
      </template>
      <template #end>
        <div class="header-end">
          <component :is="networkStatusIconComp" v-if="networkStatusIconComp" />
          <LocaleSelect :device-scope="isTablet ? 'tablet' : 'mobile'" />
          <button type="button" class="logout-btn" :aria-label="t('appMenu.logout')" @click="handleLogout">
            <i class="pi pi-sign-out" aria-hidden="true" />
          </button>
        </div>
      </template>
      <template #after>
        <component :is="MobileOfflineNotice" v-if="!isTablet && MobileOfflineNotice" />
      </template>
    </AppHeader>

    <AppContent class="custom-content" :scroll="true" :padding="true">
      <div class="menu-container">
        <div class="welcome-banner animate__animated animate__fadeInDown">
          <div class="welcome-text">
            <h2 v-if="isTablet">{{ t('appMenu.tabletH2title', { name: authStore.user?.employeeName }) }}</h2>
            <h2 v-else>{{ t('mobile.appMenu.hello', { name: authStore.user?.employeeName }) }}</h2>
            <p v-if="isTablet">{{ t('appMenu.tabletSubtitle') }}</p>
            <p v-else>{{ t('mobile.appMenu.system') }}</p>
            <component :is="PendingQueueButton" v-if="!isTablet && PendingQueueButton" placement="appMenu" />
          </div>
        </div>

        <div class="feature-grid animate__animated animate__fadeInUp">

          <template v-if="isTablet">
            <div v-for="(feature, index) in tabletFeatures" :key="index" class="feature-card shadow-sm"
              :class="{ 'feature-card--disabled': isNavigating }" @click="navigate(feature.path)">
              <div class="icon-wrapper" :style="{ background: feature.bgLight }">
                <i :class="feature.icon" :style="{ color: feature.color }" aria-hidden="true" />
              </div>
              <div class="card-content">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
              </div>
            </div>
          </template>

          <template v-if="!isTablet">
            <div v-for="(feature, index) in mobileFeatures" :key="index" class="feature-card-mobile shadow-sm"
              :class="{ 'feature-card--disabled': feature.disabled || isNavigating }" @click="navigateFeature(feature)">
              <div class="icon-wrapper" :style="{ background: feature.bgLight }">
                <i :class="feature.icon" :style="{ color: feature.color }" aria-hidden="true" />
              </div>
              <div class="card-content">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
                <p v-if="feature.disabledMessage" class="card-content__offline-note">{{ feature.disabledMessage }}</p>
              </div>
            </div>
          </template>
        </div>
      </div>
    </AppContent>
  </AppPage>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import { useOfflineLoginStore } from '@/store/offlineLogin';
import { ref, computed, onMounted, onUnmounted, shallowRef, type Component, type ShallowRef } from 'vue';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { AppPage, AppHeader, AppContent } from '@/components/layout';
import { resolveAppMenuMobileShell } from '@/views/AppMenu/appMenuMobileShell';
import { clearGlueOfflineData } from '@/services/glueOfflineData.service';
import { useAppLocale } from '@/composables/useAppLocale';
import { showAppConfirm } from '@/services/confirmBridge';
import { startRouteLoadingVisible } from '@/router/loading';
import { preloadMenuRouteChunk, preloadMenuRouteChunks } from '@/views/AppMenu/menuRouteChunks';
import { warmNativeMenuChunks } from '@/router/routeChunks';

const router = useRouter();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const offlineLoginStore = useOfflineLoginStore();

// --- LOGIC NHẬN DIỆN THIẾT BỊ ---
const isTablet = ref(window.innerWidth >= 768);
const isNavigating = ref(false);

const networkStatusIconComp: ShallowRef<Component | null> = shallowRef(null);
const MobileOfflineNotice: ShallowRef<Component | null> = shallowRef(null);
const PendingQueueButton: ShallowRef<Component | null> = shallowRef(null);

const loadNetworkStatusIcon = async () => {
  if (networkStatusIconComp.value) return;
  const mod = await import('@/views/Mobile/components/NetworkStatusIcon.vue');
  networkStatusIconComp.value = mod.default;
};

const loadMobileShell = async () => {
  if (isTablet.value) return;

  const shell = await resolveAppMenuMobileShell();
  networkStatusIconComp.value = shell.NetworkStatusIcon;
  MobileOfflineNotice.value = shell.MobileOfflineNotice;
  PendingQueueButton.value = shell.PendingQueueButton;
};

const { t, syncLocaleForDevice } = useAppLocale(() => (isTablet.value ? 'tablet' : 'mobile'));

const updateDeviceType = () => {
  const nextTablet = window.innerWidth >= 768;
  if (nextTablet !== isTablet.value) {
    isTablet.value = nextTablet;
    void syncLocaleForDevice();
    void loadNetworkStatusIcon();
    if (!nextTablet) {
      void loadMobileShell();
    }
  }
};

onMounted(() => {
  window.addEventListener('resize', updateDeviceType);

  void loadNetworkStatusIcon();
  if (!isTablet.value) {
    void loadMobileShell();
    void offlineStore.refreshQueueCounts();
  }

  // Preload ngay khi vào menu (không đợi idle) — lần bấm sau gần như warm.
  void warmNativeMenuChunks(isTablet.value);
  const paths = isTablet.value
    ? tabletFeatures.value.map((f) => f.path)
    : mobileFeatures.value.map((f) => f.path);
  void preloadMenuRouteChunks(paths);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
});
// --------------------------------

// --- TABLET FEATURES (chỉ hiện khi isMixGlueRoom === true) ---
const tabletFeatures = computed(() => {
  if (!authStore.canUseMixGlueRoom) return [];

  return [
    {
      path: '/list-mix-glue',
      title: t('appMenu.features.mixGlue.title'),
      description: t('appMenu.features.mixGlue.description'),
      icon: 'pi pi-box',
      color: '#0ea5e9',
      bgLight: '#e0f2fe'
    },
    {
      path: '/list-separate-mixed-glue-management',
      title: t('appMenu.features.separateMixedGlue.title'),
      description: t('appMenu.features.separateMixedGlue.description'),
      icon: 'pi pi-sitemap',
      color: '#f59e0b',
      bgLight: '#fef3c7'
    },
    {
      path: '/glue-return-log',
      title: t('appMenu.features.glueReturnLog.title'),
      description: t('appMenu.features.glueReturnLog.description'),
      icon: 'pi pi-book',
      color: '#8b5cf6',
      bgLight: '#ede9fe'
    },
  ];
});

// --- DATA CHO MOBILE FEATURES ---
const mobileFeatures = computed(() => {
  const features = [];

  if (authStore.canUseMixGluePhone) {
    features.push(
      {
        path: '/mobile',
        title: t('mobile.appMenu.glueConfirm'),
        description: t('mobile.appMenu.description'),
        icon: 'pi pi-arrow-right-arrow-left',
        color: '#f59e0b',
        bgLight: '#fef3c7'
      },
      {
        path: '/mobile/glue-return',
        title: t('mobile.appMenu.glueReturn'),
        description: t('mobile.appMenu.glueReturnDescription'),
        icon: 'pi pi-qrcode',
        color: '#8b5cf6',
        bgLight: '#ede9fe'
      },
      {
        path: '/mobile/glue-return-in-room',
        title: t('mobile.appMenu.glueReturnInRoom'),
        description: t('mobile.appMenu.glueReturnInRoomDescription'),
        icon: 'pi pi-qrcode',
        color: '#ec4899',
        bgLight: '#fce7f3'
      },
      {
        path: '/mobile/glue-info-check',
        title: t('mobile.appMenu.glueInfoCheck'),
        description: t('mobile.appMenu.glueInfoCheckDescription'),
        icon: 'pi pi-search',
        color: '#0ea5e9',
        bgLight: '#e0f2fe',
        disabled: !authStore.isOnline,
        disabledMessage: !authStore.isOnline ? t('mobile.appMenu.onlineOnly') : '',
      }
    );
  }

  if (authStore.canUseQip) {
    features.push({
      path: '/mobile/glue-check-list',
      title: t('mobile.appMenu.glueCheckList'),
      description: t('mobile.appMenu.glueCheckListDescription'),
      icon: 'pi pi-check-circle',
      color: '#10b981',
      bgLight: '#d1fae5'
    });
  }

  return features;
});

type AppMenuFeature = {
  path: string;
  disabled?: boolean;
};

// Bật overlay → paint → push ngay (preload chạy nền, không chặn click).
const navigate = async (path: string) => {
  if (isNavigating.value || router.currentRoute.value.path === path) {
    return;
  }

  isNavigating.value = true;
  try {
    await startRouteLoadingVisible();
    void preloadMenuRouteChunk(path);
    await router.push(path);
  } catch (error) {
    console.error('[AppMenu] navigate failed:', path, error);
    isNavigating.value = false;
  }
};

const navigateFeature = (feature: AppMenuFeature) => {
  if (feature.disabled || isNavigating.value) {
    return;
  }

  void navigate(feature.path);
};


const showLogoutBlockedAlert = async () => {
  await showAppConfirm({
    header: t('mobile.offlineQueue.logoutBlockedTitle'),
    message: t('mobile.offlineQueue.logoutBlockedMessage'),
    acceptLabel: t('mobile.offlineQueue.close'),
    alertOnly: true,
  });
};

const handleLogout = async () => {
  if (!isTablet.value) {
    await offlineStore.refreshQueueCounts();

    if (offlineStore.totalPendingQueueCount > 0) {
      await showLogoutBlockedAlert();
      return;
    }
  }

  if (!isTablet.value) {
    await clearGlueOfflineData();
    await offlineLoginStore.clearOfflineLogin();
    offlineStore.resetDownloadState();
    offlineStore.resetSyncState();
  }

  await authStore.logout();
};
</script>

<style scoped>
.app-menu-header :deep(.app-header__toolbar) {
  padding-inline: 20px;
}

.header-start {
  display: flex;
  align-items: center;
  min-width: 0;
  max-width: calc(100vw - 180px);
}

.header-title {
  margin: 0;
  min-width: 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: left;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-end {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 100%;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0;
  width: 44px;
  height: 44px;
  min-width: 44px;
  padding: 0;
  border: none;
  border-radius: 999px;
  color: #fff;
  background: transparent;
  cursor: pointer;
}

.logout-btn:hover,
.logout-btn:focus-visible {
  background: rgba(255, 255, 255, 0.12);
  outline: none;
}

.logout-btn .pi {
  font-size: 1.75rem;
}

.custom-content {
  background: #f4f7f9;
}

.menu-container {
  max-width: 1000px;
  margin: 0 auto;
}

.welcome-banner {
  background: white;
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
}

.welcome-text h2 {
  font-size: 1.4rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.welcome-text p {
  color: #64748b;
  margin: 0;
  font-size: 1rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.feature-card-mobile {
  background: white;
  border-radius: 20px;
  padding: 10px;
  display: flex;
  align-items: center;
  gap: 20px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.feature-card:active {
  transform: scale(0.97);
}


.feature-card--disabled {
  cursor: not-allowed;
  opacity: 0.62;
  filter: grayscale(0.12);
}

.feature-card--disabled:active {
  transform: none;
}

.card-content__offline-note {
  margin-top: 6px !important;
  color: #dc2626 !important;
  font-size: 0.82rem !important;
  font-weight: 700;
}

.icon-wrapper {
  background: #f0f4ff;
  min-width: 65px;
  height: 65px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper .pi {
  font-size: 32px;
}

.card-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 5px 0;
}

.card-content p {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

@media (min-width: 768px) {
  .welcome-text h2 {
    font-size: 1.5rem;
  }

  .welcome-text p {
    font-size: 1.1rem;
  }

  .feature-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 25px;
  }

  .feature-card {
    padding: 25px;
    align-items: flex-start;
    gap: 15px;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(56, 128, 255, 0.1) !important;
    border-color: rgba(56, 128, 255, 0.2);
  }
}

@media (max-width: 480px) {
  .header-title {
    font-size: 18px;
  }

  .logout-btn {
    width: 40px;
    height: 40px;
    min-width: 40px;
  }
}
</style>