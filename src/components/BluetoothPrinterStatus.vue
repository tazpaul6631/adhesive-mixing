<template>
  <div class="flex align-items-center gap-2 flex-wrap">
    <span v-if="status === 'connected'" class="text-green-600 font-medium text-sm">
      <i class="pi pi-check-circle"></i> {{ t('bluetoothPrinter.connected') }}
    </span>
    <span v-else-if="status === 'scanning'" class="text-orange-500 font-medium text-sm">
      <i class="pi pi-spin pi-spinner"></i> {{ scanningLabel }}
    </span>
    <span v-else class="text-red-500 font-medium text-sm fade-blink">
      <i class="pi pi-bluetooth"></i> {{ t('bluetoothPrinter.disconnected') }}
    </span>

    <Button v-if="status === 'connected'" icon="pi pi-times" severity="secondary" text rounded size="small"
      :title="t('bluetoothPrinter.disconnect')" :aria-label="t('bluetoothPrinter.disconnect')" @click="disconnect" />

    <Button v-else-if="status === 'scanning'" :label="t('common.cancel')" icon="pi pi-times" severity="secondary" text size="small"
      @click="cancelConnection" />

    <Button v-else icon="pi pi-refresh" severity="primary" text outlined size="large" class="bt-refresh-btn"
      :title="t('bluetoothPrinter.reconnectTitle')" :aria-label="t('bluetoothPrinter.reconnectAriaLabel')"
      @click="refreshScan" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, onActivated } from 'vue';
import { Button } from 'primevue';
import { useBluetoothPrinter, type UseBluetoothPrinterOptions } from '@/composables/useBluetoothPrinter';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<UseBluetoothPrinterOptions>();

const { t } = useAppLocale(() => 'tablet');

const {
  status,
  scanPhase,
  initBluetooth,
  pauseBluetooth,
  cleanupBluetooth,
  refreshScan,
  disconnect,
  cancelConnection,
  isConnected,
  verifyHardwareConnected,
  setPrintInProgress,
  writeTspl,
} = useBluetoothPrinter(props);

const scanningLabel = computed(() =>
  scanPhase.value === 'saved-mac'
    ? t('bluetoothPrinter.connectingSaved')
    : t('bluetoothPrinter.searching')
);

onMounted(() => {
  void initBluetooth();
});

onActivated(() => {
  void initBluetooth();
});

onUnmounted(() => {
  cleanupBluetooth(true);
});

defineExpose({
  initBluetooth,
  pauseBluetooth,
  cleanupBluetooth,
  refreshScan,
  isConnected,
  verifyHardwareConnected,
  setPrintInProgress,
  writeTspl,
});
</script>

<style scoped>
.fade-blink {
  animation: fadeBlink 1.5s infinite;
}

@keyframes fadeBlink {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}

.bt-refresh-btn {
  width: 2rem;
  height: 2rem;
  padding: 0;
}
</style>
