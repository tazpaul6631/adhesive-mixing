<template>
  <ion-page>
    <ion-content>
      <LoginMobile v-if="isNative" />
      <LoginDesktop v-else />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { Capacitor } from '@capacitor/core';

import LoginMobile from './parts/LoginMobile.vue';
import LoginDesktop from './parts/LoginDesktop.vue';

// Biến kiểm tra môi trường chạy (trả về true nếu là iOS/Android, false nếu là Web)
const isNative = Capacitor.isNativePlatform();
</script>