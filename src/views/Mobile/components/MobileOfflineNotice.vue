<template>
  <div v-if="!isOnline" class="mobile-offline-notice" role="status">
    {{ t('mobile.common.offlineLocalData') }}
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { Network } from '@capacitor/network';
import { useAuthStore } from '@/store/auth';
import { useAppLocale } from '@/composables/useAppLocale';

const authStore = useAuthStore();
const { t } = useAppLocale(() => 'mobile');

const isOnline = computed(() => authStore.isOnline);

onMounted(async () => {
  try {
    const status = await Network.getStatus();
    authStore.setNetworkStatus(status.connected);
  } catch (error) {
    console.warn('Không thể đọc trạng thái mạng:', error);
  }
});
</script>

<style scoped>
.mobile-offline-notice {
  width: 100%;
  padding: 7px 14px;
  text-align: center;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.25;
  color: #991b1b;
  background: #fef2f2;
  border-top: 1px solid rgba(248, 113, 113, 0.25);
  border-bottom: 1px solid rgba(248, 113, 113, 0.35);
  box-shadow: 0 2px 8px rgba(153, 27, 27, 0.08);
}
</style>
