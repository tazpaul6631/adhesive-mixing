<template>
  <ConfirmDialog />
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import ConfirmDialog from 'primevue/confirmdialog';
import { useConfirm } from 'primevue/useconfirm';
import { registerAppConfirm, unregisterAppConfirm } from '@/services/confirmBridge';

const confirm = useConfirm();
const requireConfirm = (options: Parameters<typeof confirm.require>[0]) => {
  confirm.require(options);
};

onMounted(() => {
  registerAppConfirm(requireConfirm);
});

onUnmounted(() => {
  unregisterAppConfirm(requireConfirm);
});
</script>
