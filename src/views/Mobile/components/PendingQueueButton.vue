<template>
  <div v-if="shouldShowButton" class="pending-queue">
    <button type="button" class="pending-queue__button" @click="openPendingModal">
      {{ t('mobile.offlineQueue.pendingData') }} ({{ pendingCount }})
    </button>
  </div>

  <ion-modal
    :is-open="isModalOpen"
    class="pending-queue-modal"
    :backdrop-dismiss="true"
    @didDismiss="closePendingModal"
  >
    <div class="pending-queue-dialog">
      <div class="pending-queue-dialog__header">
        <h2>{{ t('mobile.offlineQueue.title') }}</h2>
        <button type="button" class="pending-queue-dialog__close" @click="closePendingModal">
          {{ t('mobile.offlineQueue.close') }}
        </button>
      </div>

      <p class="pending-queue-dialog__subtitle">
        {{ t('mobile.offlineQueue.description') }}
      </p>

      <div v-if="queueGroups.length" class="pending-queue-dialog__groups">
        <div
          v-for="group in queueGroups"
          :key="group.type"
          class="pending-queue-group"
        >
          <button
            type="button"
            class="pending-queue-group__header"
            @click="toggleGroup(group.type)"
          >
            <span>{{ getQueueTypeLabel(group.type) }}</span>
            <span>({{ group.items.length }})</span>
          </button>

          <div v-if="activeQueueType === group.type" class="pending-queue-group__body">
            <div
              v-for="item in group.items"
              :key="item.id"
              class="pending-queue-card"
            >
              <div class="pending-queue-card__row">
                <span>{{ t('mobile.offlineQueue.createdAt') }}</span>
                <strong>{{ formatQueueDate(item.createdAt) }}</strong>
              </div>
              <div
                v-for="row in getPayloadRows(item.payload)"
                :key="`${item.id}-${row.label}`"
                class="pending-queue-card__row"
              >
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="pending-queue-dialog__empty">
        {{ t('mobile.offlineQueue.noData') }}
      </div>
    </div>
  </ion-modal>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { IonModal } from '@ionic/vue';
import { useAuthStore } from '@/store/auth';
import { useOfflineStore } from '@/store/offline';
import {
  listPendingQueueItems,
  type OfflineQueueItem,
  type OfflineQueueType,
} from '@/services/offlineQueue.service';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  queueType?: OfflineQueueType;
}>();

const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { t } = useAppLocale(() => 'mobile');

const isModalOpen = ref(false);
const pendingItems = ref<OfflineQueueItem[]>([]);
const activeQueueType = ref<OfflineQueueType | ''>('');

const pendingCount = computed(() => {
  if (props.queueType) {
    return offlineStore.getPendingQueueCount(props.queueType);
  }

  return offlineStore.totalPendingQueueCount;
});

const shouldShowButton = computed(() => !authStore.isOnline && pendingCount.value > 0);

const queueGroups = computed(() => {
  const groupedItems = new Map<OfflineQueueType, OfflineQueueItem[]>();

  for (const item of pendingItems.value) {
    if (!groupedItems.has(item.queueType)) {
      groupedItems.set(item.queueType, []);
    }

    groupedItems.get(item.queueType)?.push(item);
  }

  return Array.from(groupedItems.entries()).map(([type, items]) => ({ type, items }));
});

onMounted(() => {
  void offlineStore.refreshQueueCounts();
});

async function openPendingModal() {
  await loadPendingItems();
  isModalOpen.value = true;
}

function closePendingModal() {
  isModalOpen.value = false;
}

async function loadPendingItems() {
  pendingItems.value = await listPendingQueueItems(props.queueType);

  if (props.queueType) {
    activeQueueType.value = props.queueType;
    return;
  }

  activeQueueType.value = '';
}

function toggleGroup(queueType: OfflineQueueType) {
  activeQueueType.value = activeQueueType.value === queueType ? '' : queueType;
}

function getQueueTypeLabel(queueType: OfflineQueueType) {
  const labelMap: Record<OfflineQueueType, string> = {
    ReceiveGlue: t('mobile.offlineQueue.receiveGlue'),
    ReturnGlue: t('mobile.offlineQueue.returnGlue'),
    GlueCheckList: t('mobile.offlineQueue.glueCheckList'),
  };

  return labelMap[queueType];
}

function normalizeValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function formatQueueDate(value: string) {
  const normalizedValue = normalizeValue(value);

  if (!normalizedValue) {
    return '-';
  }

  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    return normalizedValue;
  }

  return date.toLocaleString();
}

function getPayloadRows(payload: any) {
  const displayFields = [
    'factoryId',
    'mixGlueMasterId',
    'separateGlueId',
    'noSeparateGlueId',
    'returnGlueId',
    'lineChemicalId',
    'productLineId',
    'recordStatus',
    'updaterId',
    'createrId',
  ];

  return displayFields
    .filter((field) => normalizeValue(payload?.[field]))
    .map((field) => ({
      label: field,
      value: normalizeValue(payload?.[field]),
    }));
}
</script>

<style scoped lang="scss">
.pending-queue {
  width: 100%;
  padding: 8px 16px 0;
  background: transparent;

  &__button {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    width: auto;
    max-width: 100%;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: #d97706;
    font-size: 0.9rem;
    font-weight: 700;
    line-height: 1.35;
    text-align: left;
    text-decoration: none;
  }

  &__button:active {
    color: #b45309;
    text-decoration: underline;
  }
}

.pending-queue-modal {
  --width: min(92vw, 420px);
  --height: auto;
  --border-radius: 22px;
  --box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);
}

.pending-queue-dialog {
  max-height: 76vh;
  padding: 22px 18px 18px;
  overflow-y: auto;
  border-radius: 22px;
  background: #ffffff;

  &__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;

    h2 {
      margin: 0;
      color: #0f172a;
      font-size: 18px !important;
      font-weight: 800;
    }
  }

  &__close {
    border: 0;
    background: transparent;
    color: #0b72ed;
    font-size: 14px !important;
    font-weight: 700;
  }

  &__subtitle {
    margin: 10px 0 16px;
    color: #64748b;
    font-size: 14px !important;
    line-height: 1.45;
  }

  &__groups {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  &__empty {
    padding: 20px 12px;
    border-radius: 16px;
    background: #f8fafc;
    color: #64748b;
    font-size: 14px !important;
    text-align: center;
  }
}

.pending-queue-group {
  overflow: hidden;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  background: #ffffff;

  &__header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 13px 14px;
    border: 0;
    background: #f8fafc;
    color: #0f172a;
    font-size: 14px !important;
    font-weight: 800;
    text-align: left;
  }

  &__body {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 12px;
  }
}

.pending-queue-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  border-radius: 14px;
  background: #fff7f7;
  border: 1px solid rgba(248, 113, 113, 0.25);

  &__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    color: #64748b;
    font-size: 13px !important;
    line-height: 1.35;

    span {
      flex-shrink: 0;
      font-weight: 600;
    }

    strong {
      color: #0f172a;
      font-weight: 800;
      text-align: right;
      word-break: break-word;
    }
  }
}
</style>
