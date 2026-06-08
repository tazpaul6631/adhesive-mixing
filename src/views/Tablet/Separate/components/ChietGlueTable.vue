<template>
  <div ref="tableWrapperRef" class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="orderDetails" scrollable scrollHeight="320px" tableStyle="width: 100%;" stripedRows
      class="modern-table auto-columns-table">

      <template #empty>
        <div style="text-align: center; height: 240px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <template #footer>
        <div v-if="!isViewMode" class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="handleAddRow" />
        </div>
      </template>

      <Column header="#" headerClass="dt-col-index" bodyClass="dt-col-index">
        <template #body="{ index }">
          <span>{{ index + 1 }}</span>
        </template>
      </Column>

      <!-- Tạm ẩn: chọn đơn yêu cầu
      <Column header="Đơn yêu cầu" headerClass="dt-col-input" bodyClass="dt-col-input">
        <template #body="{ data }">
          <MultiSelect v-model="data.selectedRequestDetailIds" :options="getAvailableRequestDetails(data)"
            :maxSelectedLabels="1" optionLabel="label" optionValue="requestDetailId" filter
            selectedItemsLabel="{0} đơn yêu cầu" placeholder="Chọn đơn yêu cầu" class="w-full" appendTo="body"
            :disabled="isViewMode" @change="handleRequestDetailChange(data)" />
        </template>
      </Column>
      -->

      <Column :header="t('separateMixedGlue.table.columns.bucket')" headerClass="dt-col-input" bodyClass="dt-col-input">
        <template #body="{ data, index }">
          <Select :key="`chiet-bucket-${index}-${bucketSelectResetKeys[index] ?? 0}`" v-model="data.selectedBucketId"
            :options="getBucketOptionsForRow(data)" optionLabel="label" optionValue="bucketId"
            :placeholder="t('separateMixedGlue.table.placeholders.selectBucket')" class="w-full" appendTo="body"
            :disabled="isViewMode" @change="handleBucketChange(data, index)" />
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.operator')" headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data }">
          <span class="dt-cell-ellipsis">{{ data.operator || '' }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.completedTime')" headerClass="dt-col-datetime"
        bodyClass="dt-col-datetime">
        <template #body="{ data }">
          <span class="text-500 dt-cell-ellipsis">
            <i v-if="data.confirmTime" class="pi pi-clock text-xs mr-1"></i>{{ data.confirmTime }}
          </span>
        </template>
      </Column>

      <Column v-if="!isViewMode" :header="t('separateMixedGlue.table.columns.action')" :exportable="false"
        headerClass="dt-col-action" bodyClass="dt-col-action">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button v-if="orderDetails.length > 0" icon="pi pi-trash" severity="danger" text rounded
              :aria-label="t('separateMixedGlue.table.deleteAriaLabel')" @click.stop="handleDeleteRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue';
import { useToast } from 'primevue/usetoast';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import bucketApi from '@/api/bucket';
import dayjs from 'dayjs';
import {
  sortBucketsByClosestCapacity,
  sumSelectedBucketCapacityKg,
  validateChietBucketCapacity,
  formatEffectiveChietTargetLabel,
  formatChietCapacityBlockMessage,
  resolveChietTargetCapacityKg,
  getCapacityMatchToleranceKg,
  isChietCapacityComplete,
  type BucketOption,
} from '@/views/Tablet/Separate/separateGlue.bucket';
import { useScrollToNewTableRow } from '@/composables/useScrollToNewTableRow';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  orderDetails: any[];
  requestDetails: any[];
  weighedWeight?: number | string;
  weighedWeightUnit?: string;
  isViewMode?: boolean;
}>();

const emit = defineEmits(['update-bucket', 'add-row', 'delete-row']);

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');
const authStore = useAuthStore();
const bucketList = ref<BucketOption[]>([]);
const bucketSelectResetKeys = ref<Record<number, number>>({});
const tableWrapperRef = ref<HTMLElement | null>(null);

const { markPendingScrollToNewRow } = useScrollToNewTableRow(
  tableWrapperRef,
  () => props.orderDetails.length,
  { focusSelector: '.p-select' }
);

const getWeighedWeightKg = () =>
  resolveChietTargetCapacityKg(props.weighedWeight ?? 0, props.weighedWeightUnit || 'Kg');

const getWeighedWeightLabel = () =>
  formatEffectiveChietTargetLabel(props.weighedWeight, props.weighedWeightUnit || 'Kg');

const getSelectedBucketTotalKg = () =>
  sumSelectedBucketCapacityKg(props.orderDetails, bucketList.value);

const orderDetailsSelectionKey = computed(() =>
  props.orderDetails.map((row) =>
    String(row.selectedBucketId ?? row.bucketId ?? '')
  ).join('|')
);

// const hasRequestSelection = (rowData: any) =>
//   Array.isArray(rowData.selectedRequestDetailIds) && rowData.selectedRequestDetailIds.length > 0;

const hasBucketSelection = (rowData: any) => !!rowData.selectedBucketId;

const isRowComplete = (rowData: any) => hasBucketSelection(rowData);

const isWeighedCapacityComplete = () =>
  isChietCapacityComplete(
    getSelectedBucketTotalKg(),
    props.weighedWeight,
    props.weighedWeightUnit || 'Kg'
  );

const shouldBlockAddRow = () => {
  void orderDetailsSelectionKey.value;
  void bucketList.value.length;

  const rows = props.orderDetails || [];
  if (rows.length === 0) return false;
  if (rows.some((row) => !isRowComplete(row))) return false;

  return isWeighedCapacityComplete();
};

// const getSelectedIdsInOtherRows = (currentRow: any) => {
//   const selectedIds = new Set<string>();
//   props.orderDetails.forEach((row) => {
//     if (row === currentRow) return;
//     (row.selectedRequestDetailIds ?? []).forEach((id: string) => selectedIds.add(String(id)));
//   });
//   return selectedIds;
// };

// const getAvailableRequestDetails = (currentRow: any) => {
//   const selectedInOtherRows = getSelectedIdsInOtherRows(currentRow);
//   const currentSelected = new Set((currentRow.selectedRequestDetailIds ?? []).map((id: string) => String(id)));
//   return props.requestDetails.filter((item) => {
//     const id = String(item.requestDetailId);
//     return currentSelected.has(id) || !selectedInOtherRows.has(id);
//   });
// };

const getBucketOptionsForRow = (currentRow: any) => {
  const targetKg = getWeighedWeightKg();
  if (targetKg <= 0 || bucketList.value.length === 0) {
    return bucketList.value;
  }

  const remainingKg = targetKg - sumSelectedBucketCapacityKg(
    props.orderDetails,
    bucketList.value,
    currentRow
  );

  return sortBucketsByClosestCapacity(bucketList.value, remainingKg);
};

const updateRowCompletionInfo = (rowData: any) => {
  if (hasBucketSelection(rowData)) {
    rowData.operator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || t('mixGlueManagement.unknownOperator');
    rowData.operatorId = authStore.user?.employeeId || '';
    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    rowData.confirmTime = format.formatDate(now);
    rowData.confirmDate = now;
  } else {
    rowData.operator = '';
    rowData.operatorId = '';
    rowData.confirmTime = null;
    rowData.confirmDate = null;
  }
};

const clearRowBucketSelection = async (rowData: any, rowIndex: number) => {
  rowData.selectedBucketId = null;
  rowData.bucketId = undefined;
  updateRowCompletionInfo(rowData);
  bucketSelectResetKeys.value[rowIndex] = (bucketSelectResetKeys.value[rowIndex] ?? 0) + 1;
  await nextTick();
};

// const handleRequestDetailChange = (rowData: any) => {
//   updateRowCompletionInfo(rowData);
//   emit('update-bucket');
// };

const handleAddRow = () => {
  const rows = props.orderDetails || [];
  const blocked = shouldBlockAddRow();

  if (rows.length > 0) {
    const incompleteIndex = rows.findIndex((row) => !isRowComplete(row));
    if (incompleteIndex !== -1) {
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.incomplete'),
        detail: t('separateMixedGlue.toast.selectBucketRow', { row: incompleteIndex + 1 }),
        life: 6000,
      });
      return;
    }

    if (blocked) {
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.allocationComplete'),
        detail: formatChietCapacityBlockMessage(props.weighedWeight, props.weighedWeightUnit || 'Kg'),
        life: 6000,
      });
      return;
    }
  }

  markPendingScrollToNewRow();
  emit('add-row');
};

const handleDeleteRow = (rowData: any) => {
  emit('delete-row', rowData);
};

const handleBucketChange = async (rowData: any, rowIndex: number) => {
  const targetKg = getWeighedWeightKg();
  if (targetKg > 0 && rowData.selectedBucketId) {
    const totalKg = getSelectedBucketTotalKg();
    const tolerance = getCapacityMatchToleranceKg(props.weighedWeight, props.weighedWeightUnit || 'Kg');

    if (totalKg > targetKg + tolerance) {
      await clearRowBucketSelection(rowData, rowIndex);
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.weightExceeded'),
        detail: t('separateMixedGlue.toast.bucketCapacityExceeded', { label: getWeighedWeightLabel() }),
        life: 6000,
      });
      return;
    }
  }

  updateRowCompletionInfo(rowData);
  emit('update-bucket');
};

const loadBucketList = async () => {
  try {
    const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success && data.data) {
      bucketList.value = data.data.map((item: any) => ({
        ...item,
        label: `${item.capacity} ${item.capacityUnit || 'Kg'}`,
      }));
    }
  } catch (error) {
    console.error('[ChietGlueTable] Lỗi khi tải danh sách thùng chứa', error);
  }
};

defineExpose({
  shouldBlockAddRow,
  validateAllocation: () => {
    const result = validateChietBucketCapacity(
      props.orderDetails,
      bucketList.value,
      props.weighedWeight,
      props.weighedWeightUnit || 'Kg'
    );
    return result.ok ? null : result.message || t('separateMixedGlue.validation.capacityMismatchWeighed');
  },
});

onMounted(() => {
  void loadBucketList();
});
</script>
