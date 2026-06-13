<template>
  <div ref="tableWrapperRef" class="border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : components" scrollable scrollHeight="290px" stripedRows
      class="modern-table auto-columns-table" tableStyle="width: 100%;" @row-click="(e) => $emit('row-click', e)"
      selectionMode="single" dataKey="materialCode" :selection="selectedItem"
      @update:selection="$emit('update:selectedItem', $event)">

      <template #empty>
        <div style="text-align: center; height: 100%; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="handleOpenNew"
            :disabled="disabled" />
        </div>
      </template>

      <Column header="#" headerClass="dt-col-index" bodyClass="dt-col-index">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" class="mx-auto" />
          <span v-else>{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="materialName" :header="t('mixGlueManagement.componentsTable.columns.name')"
        headerClass="dt-col-primary" bodyClass="dt-col-primary">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else class="font-medium dt-cell-wrap">{{ data.materialName }}</span>
        </template>
      </Column>

      <Column :header="t('mixGlueManagement.componentsTable.columns.requiredWeight')" headerClass="dt-col-weight"
        bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ data.glueWeight || '' }} {{ data.weightUnit }}</span>
        </template>
      </Column>

      <Column :header="t('mixGlueManagement.componentsTable.columns.actualWeight')" headerClass="dt-col-weight"
        bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>
            {{ format.formatDisplayWeight(data.actualWeight) }}{{ data.actualWeight ? ` ${data.weightUnit}` : '' }}
          </span>
        </template>
      </Column>

      <Column :header="t('mixGlueManagement.componentsTable.columns.operator')" headerClass="dt-col-text"
        bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ data.operator }}</span>
        </template>
      </Column>

      <Column :header="t('mixGlueManagement.componentsTable.columns.weighingTime')" headerClass="dt-col-datetime"
        bodyClass="dt-col-datetime">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.weighingTime" class="pi pi-clock text-xs mr-1"></i>
            {{ data.weighingTime ? format.formatDate(data.weighingTime) : '' }}
          </span>
        </template>
      </Column>

      <Column :header="t('mixGlueManagement.componentsTable.columns.action')" :exportable="false"
        headerClass="dt-col-action" bodyClass="dt-col-action">
        <template #body="slotProps">
          <div class="flex justify-content-center">
            <Button v-if="slotProps.data.glueExtra && !slotProps.data.actualWeight" icon="pi pi-trash" severity="danger"
              text :aria-label="t('mixGlueManagement.componentsTable.deleteAriaLabel')" :disabled="disabled"
              class="button-lg" @click.stop="$emit('delete-row', slotProps.data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import format from '@/mixins/format';
import { ref } from 'vue';
import { useScrollToNewTableRow } from '@/composables/useScrollToNewTableRow';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  isLoading: boolean;
  components: any[];
  headerTotalWeight: string | number;
  selectedItem: any;
  disabled?: boolean;
}>();

const emit = defineEmits(['row-click', 'open-new', 'delete-row', 'update:selectedItem']);

const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(5).fill({}));
const tableWrapperRef = ref<HTMLElement | null>(null);

const { markPendingScrollToNewRow } = useScrollToNewTableRow(
  tableWrapperRef,
  () => props.components.length
);

const handleOpenNew = () => {
  markPendingScrollToNewRow();
  emit('open-new');
};
</script>
