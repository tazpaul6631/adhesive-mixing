<template>
  <div v-if="showScalePicker" class="scale-device-picker">
    <Select v-model="selectedScaleDeviceId" :options="availableScales" option-label="label" option-value="id"
      :placeholder="t('electronicScale.selectScalePlaceholder')" class="scale-device-picker__select"
      :disabled="isScaleSelectConnecting" append-to="body" @change="handleScaleSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useScaleManager } from '@/composables/useScaleManager';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  sessionId: string | number | symbol;
}>();

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');

const {
  availableScales,
  selectScaleDevice,
  isSessionPendingSelection,
  isSessionActive,
  getSessionSelectedDeviceId,
} = useScaleManager();

const selectedScaleDeviceId = ref<string | null>(null);
const isScaleSelectConnecting = ref(false);

const showScalePicker = computed(
  () => availableScales.value.length > 1 && isSessionActive(props.sessionId)
);

const needsScaleSelection = computed(
  () => showScalePicker.value && isSessionPendingSelection(props.sessionId)
);

watch(
  () => [availableScales.value.length, getSessionSelectedDeviceId(props.sessionId)] as const,
  () => {
    const saved = getSessionSelectedDeviceId(props.sessionId);
    if (saved) {
      selectedScaleDeviceId.value = saved;
      return;
    }
    if (availableScales.value.length === 1) {
      selectedScaleDeviceId.value = availableScales.value[0].id;
    }
  },
  { immediate: true }
);

const handleScaleSelect = async () => {
  if (!selectedScaleDeviceId.value || isScaleSelectConnecting.value) return;

  isScaleSelectConnecting.value = true;
  try {
    await selectScaleDevice(props.sessionId, selectedScaleDeviceId.value);
  } catch (error) {
    console.error('[ScaleDevicePicker] scale select failed:', error);
    toast.add({
      severity: 'warn',
      summary: t('electronicScale.toast.connectFailed'),
      detail: t('electronicScale.toast.connectFailedDetail'),
      life: 6000,
    });
  } finally {
    isScaleSelectConnecting.value = false;
  }
};
</script>

<style scoped>
.scale-device-picker {
  min-width: 220px;
  max-width: 320px;
}

.scale-device-picker__select {
  width: 100%;
}
</style>
