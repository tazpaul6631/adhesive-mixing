<template>
  <Toast :class="toastDeviceClass" position="top-center">
    <template #message="slotProps">
      <div class="app-toast-body">
        <span v-if="getToastIcon(slotProps.message)" class="p-toast-message-icon">
          <i :class="getToastIcon(slotProps.message)" />
        </span>
        <div class="p-toast-message-text">
          <span v-if="slotProps.message.summary" class="p-toast-summary">{{ slotProps.message.summary }}</span>
          <div v-if="slotProps.message.detail" class="p-toast-detail" v-html="slotProps.message.detail" />
        </div>
      </div>
    </template>
  </Toast>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Toast from 'primevue/toast';

const TABLET_MIN_WIDTH = 768;
const isTablet = ref(typeof window !== 'undefined' ? window.innerWidth >= TABLET_MIN_WIDTH : true);
const toastDeviceClass = computed(() => (isTablet.value ? 'app-toast--tablet' : 'app-toast--mobile'));

const severityIcons: Record<string, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle',
};

const getToastIcon = (message: { icon?: string; severity?: string }) =>
  message?.icon || (message?.severity ? severityIcons[message.severity] : undefined);

const updateDeviceType = () => {
  if (typeof window === 'undefined') return;
  isTablet.value = window.innerWidth >= TABLET_MIN_WIDTH;
};

onMounted(() => {
  updateDeviceType();
  window.addEventListener('resize', updateDeviceType);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
});
</script>
