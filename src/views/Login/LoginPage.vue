<template>
  <AppPage>
    <AppContent :scroll="true" :padding="false">
      <LoginMobile v-if="isNative" />
      <LoginDesktop v-else />
    </AppContent>
  </AppPage>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core';
import AppPage from '@/components/layout/AppPage.vue';
import AppContent from '@/components/layout/AppContent.vue';
import LoginMobile from './parts/LoginMobile.vue';
import LoginDesktop from './parts/LoginDesktop.vue';

const isNative = Capacitor.isNativePlatform();
</script>
