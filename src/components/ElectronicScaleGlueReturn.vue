<template>
  <div class="electronic-scale-glue-return">
    <ElectronicScale
      :weight-unit="weightUnit"
      :enforce-tolerance="false"
      :locked-weight="lockedWeight"
      :disable-confirm="disableConfirm"
      @update:weight="$emit('update:weight', $event)"
      @connection-status="$emit('connection-status', $event)"
      @confirm-weight="$emit('confirm-weight', $event)"
    />
  </div>
</template>

<script setup lang="ts">
import ElectronicScale from '@/components/ElectronicScale.vue';

defineProps({
  weightUnit: { type: [Number, String], default: 'Kg' },
  lockedWeight: { type: [Number, String], default: '' },
  disableConfirm: { type: Boolean, default: false },
});

defineEmits<{
  (e: 'update:weight', value: string): void;
  (e: 'connection-status', value: boolean): void;
  (e: 'confirm-weight', value: string): void;
}>();
</script>

<style scoped>
.electronic-scale-glue-return :deep(> .col-12) {
  width: 100%;
  max-width: 100%;
  padding: 0;
  margin: 0;
}
</style>
