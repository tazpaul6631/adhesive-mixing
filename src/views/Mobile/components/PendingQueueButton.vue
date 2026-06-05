<template>
  <div v-if="shouldShowText" class="pending-queue-host" :class="`pending-queue-host--${props.placement}`">
    <span class="pending-queue-text">
      {{ t('mobile.offlineQueue.pendingData') }} ({{ pendingCount }})
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import type { OfflineQueueType } from '@/services/offlineQueue.service';
import { useAppLocale } from '@/composables/useAppLocale';

const props = withDefaults(defineProps<{
  queueType?: OfflineQueueType;
  placement?: 'page' | 'appMenu';
}>(), {
  placement: 'appMenu',
});

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { t } = useAppLocale(() => 'mobile');

const pendingCount = computed(() => {
  if (props.queueType) {
    return offlineStore.getPendingQueueCount(props.queueType);
  }

  return offlineStore.totalPendingQueueCount;
});

const shouldShowText = computed(() => !authStore.isOnline && pendingCount.value > 0);

onMounted(() => {
  void offlineStore.refreshQueueCounts();
});

/*
  Pending queue detail modal / accordion is intentionally disabled for now.
  Previous behavior opened a modal and grouped queue items by queue type.
  Keep the service functions available so the accordion can be restored later if needed:
  - listPendingQueueItems(queueType)
  - OfflineQueueItem
  - OfflineQueueType
*/
</script>

<style scoped lang="scss">
.pending-queue-host {
  width: 100%;
}

.pending-queue-host--appMenu {
  margin-top: 14px;
}

.pending-queue-host--page {
  margin: 12px 0;
  padding: 0 16px;
}

.pending-queue-text {
  display: block;
  color: #d97706;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
}
</style>
