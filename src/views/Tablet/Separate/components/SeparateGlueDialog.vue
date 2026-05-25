<template>
  <Dialog :visible="visible" @update:visible="$emit('update:visible', $event)" modal class="chiet-dialog"
    :style="{ width: '98vw', maxWidth: '1200px', height: '75vh' }" :draggable="false">
    <template #header>
      <div class="chiet-dialog-header">
        <span class="chiet-dialog-header__title">{{ t('separateMixedGlue.chietDialog.title') }}</span>
        <Button v-if="!isViewMode" icon="pi pi-check-circle" severity="success" size="large" @click="handleConfirm" />
      </div>
    </template>

    <div class="chiet-dialog-body">
      <div class="chiet-summary-grid">
        <div class="chiet-summary-card chiet-summary-card--glue">
          <div class="chiet-summary-card__head">
            <span class="chiet-summary-card__icon"><i class="pi pi-box"></i></span>
            <span class="chiet-summary-card__tag">{{ t('separateMixedGlue.chietDialog.currentGlue') }}</span>
            <p class="chiet-summary-card__value">{{ chemical?.materialName || '—' }}</p>
          </div>
        </div>

        <div class="chiet-summary-card chiet-summary-card--weight">
          <div class="chiet-summary-card__head">
            <span class="chiet-summary-card__icon"><i class="pi pi-chart-bar"></i></span>
            <span class="chiet-summary-card__tag">{{ t('separateMixedGlue.chietDialog.weighedWeight') }}</span>
            <p class="chiet-summary-card__value">{{ weighedWeightLabel }}</p>
          </div>
        </div>
      </div>

      <div class="chiet-table-panel">
        <div class="chiet-table-panel__header">
          <div>
            <h3 class="chiet-table-panel__title">
              <i class="pi pi-list"></i>
              {{ t('separateMixedGlue.chietDialog.capacityMustMatch') }}
              <strong>{{ weighedWeightLabel }}</strong>
            </h3>
          </div>
          <Tag v-if="isViewMode" severity="info" :value="t('separateMixedGlue.chietDialog.viewOnly')" icon="pi pi-eye" />
        </div>

        <div class="chiet-table-panel__content">
          <ChietGlueTable v-if="visible" ref="chietGlueTableRef" :order-details="orderDetails"
            :request-details="requestDetails" :weighed-weight="targetWeight" :weighed-weight-unit="targetWeightUnit"
            :is-view-mode="isViewMode" @update-bucket="$emit('update-bucket')" @add-row="$emit('add-row')"
            @delete-row="$emit('delete-row', $event)" />
        </div>
      </div>
    </div>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Dialog from 'primevue/dialog';
import Button from 'primevue/button';
import Tag from 'primevue/tag';
import { useToast } from 'primevue/usetoast';
import ChietGlueTable from '@/views/Tablet/Separate/components/ChietGlueTable.vue';
import { formatTargetWeightLabel } from '@/views/Tablet/Separate/separateGlue.bucket';
import { useAppLocale } from '@/composables/useAppLocale';

interface OrderDetails {
  workOrderDetailId?: string;
  factoryName?: string;
  workOrderMasterName?: string;
  requestDetailName?: string;
  styleName?: string;
  requestTime?: string;
  operator?: string;
  selectedBucketId?: any;
  selectedRequestDetailIds?: string[];
  chemicalId?: string;
}

interface ChemicalComponent {
  materialCode?: string;
  materialName?: string;
  actualWeight?: number | string;
  weightUnit?: string;
}

const props = defineProps<{
  visible: boolean;
  chemical: ChemicalComponent | null;
  orderDetails: OrderDetails[];
  requestDetails: any[];
  isViewMode?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'update-bucket'): void;
  (e: 'confirm'): void;
  (e: 'add-row'): void;
  (e: 'delete-row', row: OrderDetails): void;
}>();

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');
const chietGlueTableRef = ref<InstanceType<typeof ChietGlueTable> | null>(null);

const targetWeight = computed(() => props.chemical?.actualWeight ?? '');
const targetWeightUnit = computed(() => props.chemical?.weightUnit || 'Kg');
const weighedWeightLabel = computed(() =>
  formatTargetWeightLabel(targetWeight.value, targetWeightUnit.value) || '—'
);

const isRowComplete = (row: OrderDetails) => {
  // const hasRequest = Array.isArray(row.selectedRequestDetailIds) && row.selectedRequestDetailIds.length > 0;
  const hasBucket = !!row.selectedBucketId;
  return hasBucket;
};

const handleConfirm = () => {
  const rows = props.orderDetails || [];

  if (rows.length === 0) {
    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.incomplete'),
      detail: t('separateMixedGlue.toast.addRowMin'),
      life: 4000,
    });
    return;
  }

  if (!targetWeight.value || Number(targetWeight.value) <= 0) {
    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.notWeighed'),
      detail: t('separateMixedGlue.toast.notWeighedForChiet', { name: props.chemical?.materialName || '' }),
      life: 4000,
    });
    return;
  }

  const incompleteIndex = rows.findIndex((row) => !isRowComplete(row));
  if (incompleteIndex !== -1) {
    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.incomplete'),
      detail: t('separateMixedGlue.toast.selectBucketRowShort', { row: incompleteIndex + 1 }),
      life: 4000,
    });
    return;
  }

  const allocationError = chietGlueTableRef.value?.validateAllocation?.();
  if (allocationError) {
    toast.add({
      severity: 'warn',
      summary: t('separateMixedGlue.toast.invalid'),
      detail: allocationError,
      life: 5000,
    });
    return;
  }

  emit('confirm');
};
</script>

<style scoped>
.chiet-dialog-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.chiet-summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

.chiet-summary-card {
  padding: 0.5rem;
  border-radius: 14px;
  border: 1px solid transparent;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05);
}

.chiet-summary-card--glue {
  background: linear-gradient(145deg, #eff6ff 0%, #f8fbff 100%);
  border-color: #bfdbfe;
}

.chiet-summary-card--weight {
  background: linear-gradient(145deg, #ecfdf5 0%, #f7fef9 100%);
  border-color: #bbf7d0;
}

.chiet-summary-card__head {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.chiet-summary-card__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 8px;
  font-size: 0.95rem;
}

.chiet-summary-card--glue .chiet-summary-card__icon {
  background: #dbeafe;
  color: #1d4ed8;
}

.chiet-summary-card--weight .chiet-summary-card__icon {
  background: #dcfce7;
  color: #15803d;
}

.chiet-summary-card__tag {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #64748b;
}

.chiet-summary-card__value {
  margin: 0;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.35;
  word-break: break-word;
}

.chiet-summary-card--glue .chiet-summary-card__value {
  color: #1d4ed8;
}

.chiet-summary-card--weight .chiet-summary-card__value {
  color: #15803d;
}

.chiet-table-panel {
  overflow: hidden;
  border: 1px solid var(--surface-border);
  border-radius: 14px;
  background: var(--surface-card);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

.chiet-table-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  background: var(--surface-100);
  border-bottom: 1px solid var(--surface-border);
  padding: 0 1rem;
}

.chiet-table-panel__title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--text-color);
  margin: 1rem 0 0.5rem;
}

.chiet-table-panel__title i {
  color: var(--primary-color);
}

.chiet-table-panel__title strong {
  color: #15803d;
  font-weight: 700;
}

.chiet-table-panel__content {
  padding: 0.25rem 0 0;
}

.chiet-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  flex: 1;
  min-width: 0;
  padding-right: 0.5rem;
}

.chiet-dialog-header__title {
  font-size: 1.15rem;
  font-weight: 700;
  color: var(--text-color);
}

.chiet-dialog-header__confirm-button {
  font-size: 1.4rem !important;
  color: #fff;
  border-radius: 0.5rem;
}

@media (max-width: 768px) {
  .chiet-summary-grid {
    grid-template-columns: 1fr;
  }

  .chiet-table-panel__header {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>

<style>
.chiet-dialog .p-dialog-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--surface-border);
}

.chiet-dialog .p-dialog-content {
  padding: 0 1rem 1rem 1rem;
  background: var(--surface-ground);
}
</style>
