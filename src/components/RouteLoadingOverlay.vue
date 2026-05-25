<template>
  <div v-if="isRouteLoading" class="route-loading-overlay" aria-live="polite" aria-busy="true">
    <div class="route-loading-overlay__content">
      <ProgressSpinner style="width: 2.75rem; height: 2.75rem" strokeWidth="4" />
      <p class="route-loading-overlay__text">{{ t('common.loading') }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
import { isRouteLoading } from '@/router/loading';
import { useAppLocale } from '@/composables/useAppLocale';

const { t } = useAppLocale();
</script>

<style scoped>
.route-loading-overlay {
  position: fixed;
  inset: 0;
  z-index: 99998;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.28);
  backdrop-filter: blur(1px);
  pointer-events: all;
}

.route-loading-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  padding: 1.5rem 2rem;
  border-radius: 0.875rem;
  background: #ffffff;
  box-shadow: 0 16px 32px rgba(15, 23, 42, 0.18);
}

.route-loading-overlay__text {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: #374151;
}
</style>
