<template>
  <span class="network-status-icon" :class="statusClass" :title="statusLabel" :aria-label="statusLabel">
    <ion-icon :icon="statusIcon"></ion-icon>
  </span>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted } from 'vue';
import { IonIcon } from '@ionic/vue';
import { cloudOfflineOutline, wifiOutline, wifi } from 'ionicons/icons';
import { Network } from '@capacitor/network';
import type { PluginListenerHandle } from '@capacitor/core';
import { useAuthStore } from '@/store/auth';

const authStore = useAuthStore();
let networkListener: PluginListenerHandle | null = null;

const isOnline = computed(() => authStore.isOnline);
const statusIcon = computed(() => (isOnline.value ? wifi : wifi));
const statusClass = computed(() => (isOnline.value ? 'network-status-icon--online' : 'network-status-icon--offline'));
const statusLabel = computed(() => (isOnline.value ? 'Online' : 'Offline'));

onMounted(async () => {
  try {
    const status = await Network.getStatus();
    authStore.setNetworkStatus(status.connected);

    networkListener = await Network.addListener('networkStatusChange', (nextStatus) => {
      authStore.setNetworkStatus(nextStatus.connected);
    });
  } catch (error) {
    console.warn('Không thể đọc trạng thái mạng:', error);
  }
});

onUnmounted(() => {
  void networkListener?.remove();
  networkListener = null;
});
</script>

<style scoped>
.network-status-icon {
  width: 34px;
  height: 34px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  /* background: rgb(255, 255, 255); */
  flex-shrink: 0;
}

.network-status-icon ion-icon {
  font-size: 1.35rem;
}

.network-status-icon--online {
  color: #22c55e;
}

.network-status-icon--offline {
  color: #ef4444;
}
</style>
