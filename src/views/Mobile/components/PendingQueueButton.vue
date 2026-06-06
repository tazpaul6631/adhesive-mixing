<template>
  <div v-if="shouldShowText" class="pending-queue-host" :class="`pending-queue-host--${props.placement}`">
    <button type="button" class="pending-queue-text-button" @click="openSummaryModal">
      {{ t('mobile.offlineQueue.pendingData') }} ({{ pendingCount }})
    </button>

    <ion-modal
      :is-open="isSummaryModalOpen"
      class="pending-queue-summary-modal"
      @didDismiss="closeSummaryModal"
    >
      <div class="pending-queue-summary">
        <div class="pending-queue-summary__header">
          <h2>{{ t('mobile.offlineQueue.title') }}</h2>
          <button type="button" class="pending-queue-summary__close" @click="closeSummaryModal">
            {{ t('mobile.offlineQueue.close') }}
          </button>
        </div>

        <p class="pending-queue-summary__description">
          {{ t('mobile.offlineQueue.description') }}
        </p>

        <div class="pending-queue-summary__list">
          <div
            v-for="item in summaryItems"
            :key="item.queueType"
            class="pending-queue-summary__row"
          >
            <span class="pending-queue-summary__label">{{ item.label }}</span>
            <span class="pending-queue-summary__count">{{ item.count }}</span>
          </div>
        </div>

        <!--
          Accordion/detail UI intentionally removed from display.
          If detailed pending records are needed again later, restore it here by using:
          - listPendingQueueItems(queueType)
          - OfflineQueueItem
          - OfflineQueueType
        -->
      </div>
    </ion-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonModal } from '@ionic/vue';
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

const isSummaryModalOpen = ref(false);

const pendingCount = computed(() => {
  if (props.queueType) {
    return offlineStore.getPendingQueueCount(props.queueType);
  }

  return offlineStore.totalPendingQueueCount;
});

const shouldShowText = computed(() => !authStore.isOnline && pendingCount.value > 0);

const summaryItems = computed(() => [
  {
    queueType: 'ReceiveGlue' as OfflineQueueType,
    label: t('mobile.offlineQueue.receiveGlue'),
    count: offlineStore.getPendingQueueCount('ReceiveGlue'),
  },
  {
    queueType: 'ReturnGlue' as OfflineQueueType,
    label: t('mobile.offlineQueue.returnGlue'),
    count: offlineStore.getPendingQueueCount('ReturnGlue'),
  },
  {
    queueType: 'GlueCheckList' as OfflineQueueType,
    label: t('mobile.offlineQueue.glueCheckList'),
    count: offlineStore.getPendingQueueCount('GlueCheckList'),
  },
]);

async function openSummaryModal() {
  await offlineStore.refreshQueueCounts();
  isSummaryModalOpen.value = true;
}

function closeSummaryModal() {
  isSummaryModalOpen.value = false;
}

onMounted(() => {
  void offlineStore.refreshQueueCounts();
});
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

.pending-queue-text-button {
  display: inline-flex;
  align-items: center;
  justify-content: flex-start;
  width: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: #d97706;
  font: inherit;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
  cursor: pointer;
  appearance: none;
}

.pending-queue-text-button:active {
  color: #b45309;
}

.pending-queue-summary-modal {
  --width: min(90vw, 420px);
  --height: auto;
  --border-radius: 24px;
  --box-shadow: 0 22px 70px rgba(15, 23, 42, 0.28);
}

.pending-queue-summary {
  width: 100%;
  padding: 26px 22px 24px;
  background: #ffffff;
  border-radius: 24px;
}

.pending-queue-summary__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 12px;
}

.pending-queue-summary__header h2 {
  margin: 0;
  color: #0f172a;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.25;
}

.pending-queue-summary__close {
  margin: 0;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #2563eb;
  font-size: 0.95rem;
  font-weight: 700;
}

.pending-queue-summary__description {
  margin: 0 0 18px;
  color: #64748b;
  font-size: 0.95rem;
  line-height: 1.55;
}

.pending-queue-summary__list {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 18px;
  background: #f8fafc;
}

.pending-queue-summary__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 16px;
  border-bottom: 1px solid #e2e8f0;
}

.pending-queue-summary__row:last-child {
  border-bottom: 0;
}

.pending-queue-summary__label {
  color: #0f172a;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.35;
}

.pending-queue-summary__count {
  min-width: 34px;
  color: #d97706;
  font-size: 1rem;
  font-weight: 800;
  line-height: 1;
  text-align: right;
}
</style>
