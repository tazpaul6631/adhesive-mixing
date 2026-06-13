<template>
  <div class="electronic-scale-glue-return">
    <ElectronicScale :scale-session-id="scaleSessionId" :hide-scale-picker="hideScalePicker"
      :weight-unit="weightUnit" :enforce-tolerance="false" :locked-weight="lockedWeight"
      :disable-confirm="disableConfirm" @update:weight="$emit('update:weight', $event)"
      @connection-status="$emit('connection-status', $event)" @confirm-weight="$emit('confirm-weight', $event)" />
  </div>
</template>

<script setup lang="ts">
import ElectronicScale from '@/components/ElectronicScale.vue';

defineProps({
  scaleSessionId: { type: [String, Number, Symbol], default: undefined },
  hideScalePicker: { type: Boolean, default: false },
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
