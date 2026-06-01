<template>
  <Toast position="top-center">
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
import Toast from 'primevue/toast';

const severityIcons: Record<string, string> = {
  info: 'pi pi-info-circle',
  success: 'pi pi-check-circle',
  warn: 'pi pi-exclamation-triangle',
  error: 'pi pi-times-circle',
};

const getToastIcon = (message: { icon?: string; severity?: string }) =>
  message?.icon || (message?.severity ? severityIcons[message.severity] : undefined);
</script>
