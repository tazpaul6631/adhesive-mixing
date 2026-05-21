<template>
  <Toast position="top-right">
    <template #message="slotProps">
      <div class="p-toast-message-content">
        <span v-if="slotProps.message.icon" class="p-toast-message-icon">
          <i :class="slotProps.message.icon" />
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
</script>
