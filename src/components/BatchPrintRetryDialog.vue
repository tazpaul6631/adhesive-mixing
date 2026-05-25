<template>
  <Dialog
    :visible="visible"
    modal
    :draggable="false"
    :closable="false"
    class="batch-print-retry-dialog"
    :style="{ width: '95vw', maxWidth: '640px' }"
    @update:visible="$emit('update:visible', $event)"
  >
    <template #header>
      <span class="font-bold text-lg">{{ t(`${localeScope}.print.retryTitle`) }}</span>
    </template>

    <p class="batch-print-retry-dialog__message">
      {{ t(`${localeScope}.print.retryMessage`, { count: failedItems.length }) }}
    </p>

    <ul class="batch-print-retry-dialog__list">
      <li v-for="entry in failedItems" :key="entry.item.id" class="batch-print-retry-dialog__item">
        <span class="batch-print-retry-dialog__label">
          {{ t(`${localeScope}.print.labelItem`, { index: entry.item.labelIndex }) }}
        </span>
        <span class="batch-print-retry-dialog__reason">
          {{ reasonLabel(entry.reason) }}
        </span>
      </li>
    </ul>

    <template #footer>
      <Button
        :label="t(`${localeScope}.print.retryClose`)"
        severity="secondary"
        text
        @click="handleClose"
      />
      <Button
        :label="t(`${localeScope}.print.retryConfirm`)"
        icon="pi pi-print"
        severity="success"
        :loading="loading"
        @click="$emit('retry')"
      />
    </template>
  </Dialog>
</template>

<script setup lang="ts">
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import { useAppLocale } from '@/composables/useAppLocale';

export interface BatchPrintFailedEntry {
  item: { id: string; labelIndex: number };
  reason: string;
}

const props = withDefaults(
  defineProps<{
    visible: boolean;
    failedItems: BatchPrintFailedEntry[];
    loading?: boolean;
    localeScope?: 'listSeparateMixedGlue' | 'listMixGlue';
  }>(),
  {
    localeScope: 'listSeparateMixedGlue',
  }
);

const emit = defineEmits<{
  'update:visible': [value: boolean];
  retry: [];
}>();

const { t } = useAppLocale(() => 'tablet');

const reasonLabel = (reason: string) =>
  t(`${props.localeScope}.print.reasons.${reason}`);

const handleClose = () => {
  emit('update:visible', false);
};
</script>

<style scoped>
.batch-print-retry-dialog__message {
  margin: 0 0 1rem;
  color: #374151;
}

.batch-print-retry-dialog__list {
  margin: 0;
  padding: 0;
  list-style: none;
  max-height: 280px;
  overflow-y: auto;
}

.batch-print-retry-dialog__item {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.75rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.batch-print-retry-dialog__item:last-child {
  border-bottom: none;
}

.batch-print-retry-dialog__label {
  font-weight: 600;
  color: #111827;
}

.batch-print-retry-dialog__reason {
  text-align: right;
  color: #b45309;
}
</style>
