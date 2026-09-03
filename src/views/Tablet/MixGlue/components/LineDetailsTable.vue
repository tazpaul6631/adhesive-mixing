<template>
  <div ref="tableWrapperRef" class="line-details-table border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : lineDetails" scrollable :scrollHeight="tableScrollHeight"
      tableStyle="width: 100%" class="line-details-datatable">
      <template #empty>
        <div class="line-details-table__empty" :style="{ minHeight: emptyStateMinHeight }">
          <i class="pi pi-inbox" aria-hidden="true"></i>
          <p>{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <Column header="#" headerClass="ldt-col-index" bodyClass="ldt-col-index">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" class="mx-auto" />
          <span v-else class="ldt-cell ldt-cell--center">{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="workOrderMasterName" :header="t('mixGlueManagement.lineDetailsTable.columns.requestOrder')"
        headerClass="ldt-col-order" bodyClass="ldt-col-order">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else class="ldt-cell ldt-cell--wrap">{{ data.workOrderMasterName }}</span>
        </template>
      </Column>

      <Column field="styleName" :header="t('mixGlueManagement.lineDetailsTable.columns.style')"
        headerClass="ldt-col-style" bodyClass="ldt-col-style">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70%" height="1rem" />
          <span v-else class="ldt-cell" :title="data.styleName">{{ data.styleName }}</span>
        </template>
      </Column>

      <Column field="requestDetailName" :header="t('mixGlueManagement.lineDetailsTable.columns.line')"
        headerClass="ldt-col-line" bodyClass="ldt-col-line">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <span v-else class="ldt-cell ldt-cell--tag" :title="data.productLineName">{{ data.productLineName }}</span>
        </template>
      </Column>

      <Column field="workOrderWeight" :header="t('mixGlueManagement.lineDetailsTable.columns.weight')"
        headerClass="ldt-col-weight" bodyClass="ldt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else class="ldt-cell ldt-cell--center">
            {{ data.workOrderWeight }} {{ data.workOrderWeightUnit }}
          </span>
        </template>
      </Column>

      <Column field="requestTime" :header="t('mixGlueManagement.lineDetailsTable.columns.requestTime')"
        headerClass="ldt-col-time" bodyClass="ldt-col-time">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="ldt-cell ldt-cell--wrap ldt-cell--muted">
            <i class="pi pi-clock text-xs mr-1" aria-hidden="true"></i>{{ format.formatDate(data.requestTime) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import format from '@/mixins/format';
import { useAppLocale } from '@/composables/useAppLocale';
import { useAdaptiveTableScrollHeight } from '@/composables/useAdaptiveTableScrollHeight';

defineProps<{
  isLoading: boolean;
  lineDetails: any[];
}>();

const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(5).fill({}));
const tableWrapperRef = ref<HTMLElement | null>(null);

const { tableScrollHeight, emptyStateMinHeight } = useAdaptiveTableScrollHeight(tableWrapperRef, {
  minPx: 160,
  getReservedPx: () => 56,
  fallbackViewportRatio: 0.42,
});
</script>

<style scoped>
.line-details-table {
  flex: 1 1 auto;
  width: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.line-details-table :deep(.line-details-datatable),
.line-details-table :deep(.p-datatable-wrapper) {
  flex: 1 1 auto;
  min-height: 0;
}

.line-details-table__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem 1rem;
  text-align: center;
  color: #6b7280;
}

.line-details-table__empty .pi {
  font-size: 2rem;
  color: #9ca3af;
  margin-bottom: 0.75rem;
}

.line-details-table__empty p {
  margin: 0;
}

.line-details-datatable :deep(.p-datatable-table) {
  width: 100%;
  table-layout: fixed;
}

.line-details-datatable :deep(.p-datatable-thead > tr > th),
.line-details-datatable :deep(.p-datatable-tbody > tr > td) {
  min-height: 56px;
  height: auto;
  vertical-align: middle;
  padding: 0.5rem 0.75rem;
}

.line-details-datatable :deep(.ldt-col-index) {
  width: 6%;
  text-align: center;
}

.line-details-datatable :deep(th.ldt-col-index .p-datatable-column-header-content) {
  justify-content: center;
}

.line-details-datatable :deep(.ldt-col-order) {
  width: 22%;
}

.line-details-datatable :deep(.ldt-col-style) {
  width: 15%;
}

.line-details-datatable :deep(.ldt-col-line) {
  width: 15%;
}

.line-details-datatable :deep(.ldt-col-weight) {
  width: 15%;
  text-align: center;
}

.line-details-datatable :deep(th.ldt-col-weight .p-datatable-column-header-content) {
  justify-content: center;
}

.line-details-datatable :deep(.ldt-col-time) {
  width: 22%;
}

.ldt-cell {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ldt-cell--wrap {
  overflow: visible;
  text-overflow: clip;
  white-space: normal;
  word-break: break-word;
  line-height: 1.35;
}

.ldt-cell--center {
  text-align: center;
}

.ldt-cell--muted {
  color: #6b7280;
}

.ldt-cell--tag {
  display: inline-block;
  max-width: 100%;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
  background: #eff6ff;
  color: #1d4ed8;
  font-size: 0.875rem;
  font-weight: 500;
  vertical-align: middle;
}
</style>
