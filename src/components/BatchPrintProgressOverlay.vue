<template>
  <div v-if="visible" class="batch-print-overlay">
    <div class="batch-print-overlay__content">
      <ProgressSpinner style="width: 3rem; height: 3rem" strokeWidth="4" />
      <p class="batch-print-overlay__title">{{ t(`${localeScope}.print.overlayTitle`) }}</p>
      <p class="batch-print-overlay__progress">
        {{ t(`${localeScope}.print.overlayProgress`, { current, total }) }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import ProgressSpinner from 'primevue/progressspinner';
import { useAppLocale } from '@/composables/useAppLocale';

withDefaults(
  defineProps<{
    visible: boolean;
    current: number;
    total: number;
    localeScope?: 'listSeparateMixedGlue' | 'listMixGlue';
  }>(),
  {
    localeScope: 'listSeparateMixedGlue',
  }
);

const { t } = useAppLocale(() => 'tablet');
</script>

<style scoped>
.batch-print-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.72);
  backdrop-filter: blur(2px);
}

.batch-print-overlay__content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
  padding: 2rem 2.5rem;
  border-radius: 1rem;
  background: #ffffff;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  min-width: 280px;
}

.batch-print-overlay__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
  color: #1f2937;
}

.batch-print-overlay__progress {
  margin: 0;
  font-size: 1rem;
  color: #4b5563;
}
</style>
