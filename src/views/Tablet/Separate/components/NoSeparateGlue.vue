<template>

  <div ref="tableWrapperRef" class="overflow-x-auto border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : noMixChemicals" scrollable scrollHeight="200px" stripedRows
      class="modern-table auto-columns-table" tableStyle="width: 100%;" @row-click="(e) => $emit('row-click', e)"
      selectionMode="single" dataKey="materialCode" :selection="selectedItem"
      @update:selection="$emit('update:selectedItem', $event)">

      <template #empty>
        <div style="text-align: center; height: 100px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <template #footer>
        <div v-if="!isNoMixGlue" class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" :disabled="disabled"
            @click="handleOpenNew" />
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
          <span v-else>{{ data.glueWeight || '' }} {{ data.weightUnit }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.actualWeight')" headerClass="dt-col-weight"
        bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>
            {{ format.formatDisplayWeight(data.actualWeight) }}{{ data.actualWeight ? ` ${data.weightUnit}` : '' }}
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
            <Button v-if="!data.isChietCompleted" icon="pi pi-plus" severity="success" text :disabled="disabled"
              :aria-label="t('separateMixedGlue.table.addAriaLabel')" @click.stop="$emit('chiet-row', data)" />

            <Button v-if="data.isChietCompleted" icon="pi pi-eye" severity="primary" text
              :aria-label="t('separateMixedGlue.table.viewAriaLabel')" @click.stop="$emit('view-row', data)" />

            <Button v-if="data.glueExtra" icon="pi pi-trash" severity="danger" text :disabled="disabled"
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
import { useScrollToNewTableRow } from '@/composables/useScrollToNewTableRow';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  isLoading: boolean;
  noMixChemicals: any[];
  headerTotalWeight: string | number;
  selectedItem: any;
  disabled?: boolean;
  isNoMixGlue?: boolean;
}>();

const emit = defineEmits([
  'row-click',
  'open-new',
  'delete-row',
  'update:selectedItem',
  'chiet-row',
  'view-row'
]);

const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(5).fill({}));
const tableWrapperRef = ref<HTMLElement | null>(null);

const { markPendingScrollToNewRow } = useScrollToNewTableRow(
  tableWrapperRef,
  () => props.noMixChemicals.length
);

const handleOpenNew = () => {
  markPendingScrollToNewRow();
  emit('open-new');
};
</script>
