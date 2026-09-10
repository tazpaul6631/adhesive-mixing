<template>

  <div ref="tableWrapperRef" class="overflow-x-auto border-round-bottom-xl no-separate-glue-table">
    <DataTable :value="isLoading ? skeletons : noMixChemicals" scrollable :scrollHeight="scrollHeight"
      class="modern-table auto-columns-table" tableStyle="width: 100%;" @row-click="(e) => $emit('row-click', e)"
      selectionMode="single" dataKey="materialCode" :selection="selectedItem"
      @update:selection="$emit('update:selectedItem', $event)">

      <template #empty>
        <div style="text-align: center; height: 100px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <Column field="materialName" :header="t('separateMixedGlue.table.columns.glue')" headerClass="dt-col-primary"
        bodyClass="dt-col-primary">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else class="font-medium dt-cell-wrap">{{ data.materialName }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.glueWeight')" headerClass="dt-col-weight"
        bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ format.formatDisplayWeight(data.glueWeight) }}{{ data.glueWeight ? `
            ${normalizeWeightUnit(data.weightUnit)}` : '' }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.actualWeight')" headerClass="dt-col-weight"
        bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>
            {{ format.formatDisplayWeight(data.actualWeight) }}{{ data.actualWeight ? `
            ${normalizeWeightUnit(data.weightUnit)}` : '' }}
          </span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.operator')" headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ data.operator }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.weighingTime')" headerClass="dt-col-datetime"
        bodyClass="dt-col-datetime">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.weighingTime" class="pi pi-clock text-xs mr-1"></i>
            {{ data.weighingTime ? format.formatDate(data.weighingTime) : '' }}
          </span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.action')" :exportable="false" headerClass="dt-col-action"
        bodyClass="dt-col-action">
        <template #body="{ data }">
          <div class="flex justify-content-center">
            <Button icon="pi pi-plus" severity="success"
              :disabled="disabled || isSubmitting"
              :loading="isSubmitting"
              :aria-label="t('separateMixedGlue.table.addAriaLabel')" @click.stop="$emit('chiet-row', data)" />

            <Button v-if="data.glueExtra" icon="pi pi-trash" severity="danger" :disabled="disabled || isSubmitting"
              :aria-label="t('separateMixedGlue.table.deleteAriaLabel')" @click.stop="$emit('delete-row', data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import format from '@/mixins/format';
import { normalizeWeightUnit } from '@/utils/weightUnit';
import { useAppLocale } from '@/composables/useAppLocale';

withDefaults(defineProps<{
  isLoading: boolean;
  noMixChemicals: any[];
  headerTotalWeight: string | number;
  selectedItem: any;
  disabled?: boolean;
  /** Đang gửi API complete / chiết — chặn spam nút gọi BE. */
  isSubmitting?: boolean;
  /** Chiều cao vùng scroll body DataTable (px string). */
  scrollHeight?: string;
}>(), {
  disabled: false,
  isSubmitting: false,
  scrollHeight: '200px',
});

const emit = defineEmits([
  'row-click',
  'delete-row',
  'update:selectedItem',
  'chiet-row',
]);

const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(5).fill({}));
const tableWrapperRef = ref<HTMLElement | null>(null);
</script>

<style scoped>
.no-separate-glue-table :deep(.p-datatable-table-container),
.no-separate-glue-table :deep(.p-datatable-wrapper),
.no-separate-glue-table :deep(.p-datatable-scrollable-body) {
  overflow-y: scroll !important;
  scrollbar-gutter: stable;
  scrollbar-width: thin;
  scrollbar-color: #64748b #e2e8f0;
}

.no-separate-glue-table :deep(.p-datatable-table-container::-webkit-scrollbar),
.no-separate-glue-table :deep(.p-datatable-wrapper::-webkit-scrollbar),
.no-separate-glue-table :deep(.p-datatable-scrollable-body::-webkit-scrollbar) {
  width: 10px;
}

.no-separate-glue-table :deep(.p-datatable-table-container::-webkit-scrollbar-track),
.no-separate-glue-table :deep(.p-datatable-wrapper::-webkit-scrollbar-track),
.no-separate-glue-table :deep(.p-datatable-scrollable-body::-webkit-scrollbar-track) {
  background: #e2e8f0;
  border-radius: 8px;
}

.no-separate-glue-table :deep(.p-datatable-table-container::-webkit-scrollbar-thumb),
.no-separate-glue-table :deep(.p-datatable-wrapper::-webkit-scrollbar-thumb),
.no-separate-glue-table :deep(.p-datatable-scrollable-body::-webkit-scrollbar-thumb) {
  background: #64748b;
  border-radius: 8px;
  border: 2px solid #e2e8f0;
}
</style>
