<template>
  <div v-if="visible" class="page-content-loading" aria-live="polite" aria-busy="true">
    <div class="page-content-loading__content">
      <ProgressSpinner style="width: 2.25rem; height: 2.25rem" strokeWidth="4" />
      <p class="page-content-loading__text">{{ t('common.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
import { useAppLocale } from '@/composables/useAppLocale';

defineProps<{
  visible: boolean;
}>();

const { t } = useAppLocale();
</script>

<style scoped>
.page-content-loading {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(1px);
  pointer-events: all;
}

.page-content-loading__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.625rem;
  padding: 1.25rem 1.5rem;
  border-radius: 0.75rem;
  background: #ffffff;
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.12);
}

.page-content-loading__text {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: #374151;
}
</style>
