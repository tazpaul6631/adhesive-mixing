<template>
  <div class="scale-device-picker">
    <Select :key="scaleListKey" v-model="selectedScaleDeviceId" :options="availableScales" option-label="label"
      option-value="id" :placeholder="t('electronicScale.selectScalePlaceholder')" class="scale-device-picker__select"
      :disabled="isBusy || isSingleScale" append-to="body" @change="handleScaleSelect" />
    <Button icon="pi pi-refresh" severity="secondary" outlined rounded size="small"
      class="scale-device-picker__refresh ml-2" :title="t('electronicScale.refreshTitle')" :loading="isRefreshing"
      :disabled="isBusy" :aria-label="t('electronicScale.refreshAriaLabel')" @click="handleRefresh" />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed, onMounted, onActivated } from 'vue';
import { useToast } from 'primevue/usetoast';
import { useScaleManager } from '@/composables/useScaleManager';
import { useAppLocale } from '@/composables/useAppLocale';

const props = withDefaults(defineProps<{
  sessionId: string | number | symbol;
  /** false = chỉ hiển thị dropdown, không tự kết nối (tránh 2 picker cùng session race). */
  autoConnect?: boolean;
}>(), {
  autoConnect: true,
});

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');

const {
  availableScales,
  selectScaleDevice,
  refreshScaleDevices,
  getSessionSelectedDeviceId,
  isScaleConnecting,
  connectedScaleDeviceId,
  isGlobalConnected,
  ensureSessionReady,
} = useScaleManager();

const selectedScaleDeviceId = ref<string | null>(null);
const isScaleSelectConnecting = ref(false);
const isRefreshing = ref(false);
const isSingleScale = computed(() => availableScales.value.length === 1);
const scaleListKey = computed(() => availableScales.value.map((device) => device.id).join('|'));

const isBusy = computed(
  () => isRefreshing.value || isScaleSelectConnecting.value || isScaleConnecting.value
);

const syncSelectedFromSession = () => {
  const devices = availableScales.value;
  if (devices.length === 0) {
    selectedScaleDeviceId.value = null;
    return;
  }

  const saved = getSessionSelectedDeviceId(props.sessionId);
  if (saved && devices.some((device) => device.id === saved)) {
    selectedScaleDeviceId.value = saved;
    return;
  }

  if (connectedScaleDeviceId.value && devices.some((device) => device.id === connectedScaleDeviceId.value)) {
    selectedScaleDeviceId.value = connectedScaleDeviceId.value;
    return;
  }

  if (devices.length === 1) {
    selectedScaleDeviceId.value = devices[0].id;
    return;
  }
  selectedScaleDeviceId.value = null;
};

watch(
  () => [availableScales.value, getSessionSelectedDeviceId(props.sessionId), connectedScaleDeviceId.value] as const,
  syncSelectedFromSession,
  { immediate: true, deep: true }
);

const ensureScaleConnected = async () => {
  syncSelectedFromSession();

  if (!props.autoConnect) return;

  await ensureSessionReady(props.sessionId);
  syncSelectedFromSession();

  const deviceId = selectedScaleDeviceId.value;
  if (!deviceId || isBusy.value) return;
  if (isGlobalConnected.value && connectedScaleDeviceId.value === deviceId) return;

  isScaleSelectConnecting.value = true;
  try {
    await selectScaleDevice(props.sessionId, deviceId);
  } catch (error) {
    console.error('[ScaleDevicePicker] auto reconnect failed:', error);
  } finally {
    isScaleSelectConnecting.value = false;
  }
};

onMounted(() => {
  void ensureScaleConnected();
});

onActivated(() => {
  void ensureScaleConnected();
});

const handleScaleSelect = async () => {
  if (!selectedScaleDeviceId.value || isBusy.value || isSingleScale.value) return;

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

const handleRefresh = async () => {
  if (isBusy.value) return;

  isRefreshing.value = true;
  try {
    const result = await refreshScaleDevices(props.sessionId);
    syncSelectedFromSession();

    if (result.devices.length === 0) {
      toast.add({
        severity: 'warn',
        summary: t('electronicScale.toast.connectFailed'),
        detail: t('electronicScale.toast.connectFailedDetail'),
        life: 6000,
      });
      return;
    }

    if (result.needsSelection) {
      toast.add({
        severity: 'info',
        summary: t('electronicScale.toast.reconnecting'),
        detail: t('electronicScale.toast.reconnectingMultiScale'),
        life: 6000,
      });
      return;
    }

    toast.add({
      severity: 'info',
      summary: t('electronicScale.toast.reconnecting'),
      detail: t('electronicScale.toast.reconnectingDetail'),
      life: 6000,
    });
  } catch (error) {
    console.error('[ScaleDevicePicker] refresh failed:', error);
    toast.add({
      severity: 'warn',
      summary: t('electronicScale.toast.connectFailed'),
      detail: t('electronicScale.toast.connectFailedDetail'),
      life: 6000,
    });
  } finally {
    isRefreshing.value = false;
  }
};
</script>

<style scoped>
.scale-device-picker {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 220px;
  max-width: 360px;
}

.scale-device-picker__select {
  flex: 1;
  min-width: 0;
}

.scale-device-picker__refresh {
  flex-shrink: 0;
  min-width: 2.25rem;
  min-height: 2.25rem;
  padding: 0;
  border-color: var(--p-surface-400) !important;
}
</style>
