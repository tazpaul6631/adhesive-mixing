<template>
  <ion-app>
    <ion-router-outlet />
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

const authStore = useAuthStore();
const ionRouter = useIonRouter();

// Xử lý nút Back vật lý trên Android
useBackButton(-1, () => {
  if (!ionRouter.canGoBack()) {
    App.exitApp();
  }
});

Network.addListener('networkStatusChange', status => {
  console.log('Mạng thay đổi:', status.connected);
  // Cập nhật vào Pinia/Vuex store tại đây
  authStore.setNetworkStatus(status.connected);
});

onMounted(async () => {
  // Tự động ẩn Splash Screen sau khi app đã load xong
  await SplashScreen.hide();

  // Cấu hình Status Bar (ví dụ: nền trắng, chữ đen)
  const info = await Device.getInfo();
  if (info.platform !== 'web') {
    await StatusBar.setStyle({ style: Style.Light });
  }
});
</script>