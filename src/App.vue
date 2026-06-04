<template>
  <ion-app>
    <ion-router-outlet />
    <RouteLoadingOverlay />
    <AppToast />
  </ion-app>
</template>

<script setup lang="ts">
import { IonApp, IonRouterOutlet, useBackButton, useIonRouter } from '@ionic/vue';
import { App } from '@capacitor/app';
import { onMounted } from 'vue';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { useAuthStore } from './store/auth';
import RouteLoadingOverlay from '@/components/RouteLoadingOverlay.vue';

const authStore = useAuthStore();
const ionRouter = useIonRouter();

// Xử lý nút Back vật lý trên Android
useBackButton(-1, () => {
  if (!ionRouter.canGoBack()) {
    App.exitApp();
  }
});

const applyNetworkStatus = (connected: boolean) => {
  authStore.setNetworkStatus(connected);
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
  }

  // Tự động ẩn Splash Screen sau khi app đã load xong
  await SplashScreen.hide();

  // Cấu hình Status Bar (ví dụ: nền trắng, chữ đen)
  const info = await Device.getInfo();
  if (info.platform !== 'web') {
    await StatusBar.setStyle({ style: Style.Light });
  }
});
</script>