<template>
  <div ref="tableWrapperRef" class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="isLoading ? skeletons : orderDetails" scrollable scrollHeight="380px" tableStyle="width: 100%;"
      stripedRows class="modern-table auto-columns-table">

      <template #empty>
        <div style="text-align: center; height: 240px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <template #footer>
        <div v-if="!isViewMode" class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" :disabled="disableAddRow"
            @click="handleAddRow" />
        </div>
      </template>

      <Column field="requestDetailName" header="#" headerClass="dt-col-index" bodyClass="dt-col-index">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ index + 1 }}</span>
        </template>
      </Column>

      <!-- Tạm ẩn: chọn đơn yêu cầu
      <Column field="productLineName" header="Đơn yêu cầu" headerClass="dt-col-input" bodyClass="dt-col-input">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <MultiSelect v-else v-model="data.selectedRequestDetailIds" :options="getAvailableRequestDetails(data)"
            :maxSelectedLabels="1" optionLabel="label" optionValue="requestDetailId" filter
            selectedItemsLabel="{0} đơn yêu cầu" placeholder="Chọn đơn yêu cầu" class="w-full" appendTo="body"
            :disabled="isViewMode" @change="handleRequestDetailChange(data)" />
        </template>
      </Column>
      -->

      <Column :header="t('separateMixedGlue.table.columns.bucket')" headerClass="dt-col-input" bodyClass="dt-col-input">
        <template #body="{ data, index }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <Select v-else :key="`bucket-${index}-${bucketSelectResetKeys[index] ?? 0}`" v-model="data.selectedBucketId"
            :options="getBucketOptionsForRow(data)" optionLabel="label" optionValue="bucketId" scrollHeight="210px"
            :placeholder="t('separateMixedGlue.table.placeholders.selectBucket')" class="w-full" appendTo="body"
            :loading="isLoadingBuckets" :disabled="isViewMode || disabled || isLoadingBuckets" filter
            @show="handleBucketSelectShow" @change="handleBucketChange(data, index)" />
        </template>
      </Column>

      <Column field="operator" :header="t('separateMixedGlue.table.columns.operator')" headerClass="dt-col-text"
        bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ data.operator || '' }}</span>
        </template>
      </Column>

      <Column :header="t('separateMixedGlue.table.columns.completedTime')" headerClass="dt-col-datetime"
        bodyClass="dt-col-datetime">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500 dt-cell-ellipsis">
            <i v-if="data.confirmTime" class="pi pi-clock text-xs mr-1"></i>{{ data.confirmTime }}
          </span>
        </template>
      </Column>

      <Column v-if="!isViewMode" :header="t('separateMixedGlue.table.columns.action')" :exportable="false"
        headerClass="dt-col-action" bodyClass="dt-col-action">
        <template #body="{ data }">
          <div class="flex justify-content-center">
            <Button v-if="!isLoading && orderDetails.length > 0" icon="pi pi-trash" severity="danger" text
              :disabled="disabled" :aria-label="t('separateMixedGlue.table.deleteAriaLabel')" class="button-lg"
              @click.stop="handleDeleteRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useToast } from 'primevue/usetoast';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import bucketApi from '@/api/bucket';
import dayjs from "dayjs";
import { useScrollToNewTableRow } from '@/composables/useScrollToNewTableRow';
import { useAppLocale } from '@/composables/useAppLocale';
import {
  normalizeWeightToKg,
  sortBucketsByClosestCapacity,
  sumSelectedBucketCapacityKg,
  validateSeparateGlueAllocation,
  validateChietBucketCapacity,
  formatTargetWeightLabel,
  formatEffectiveChietTargetLabel,
  formatChietCapacityBlockMessage,
  resolveChietTargetCapacityKg,
  getActualWeighedKg,
  filterChietBucketOptionsForRow,
  shouldBlockChietAddRow,
  hasChietTotalExceededActual,
  formatWeightKg,
  WEIGHT_EPSILON,
  findBucketOptionById,
  normalizeBucketIdForSelect,
  mapBucketOptions,
  getRowActiveBucketId,
  pruneStaleBucketIds,
  type BucketOption,
} from '@/views/Tablet/Separate/separateGlue.bucket';

const props = defineProps<{
  isLoading: boolean;
  orderDetails: any[];
  requestDetails: any[];
  targetWeight?: number | string;
  targetWeightUnit?: string;
  requireAllRequestDetails?: boolean;
  isViewMode?: boolean;
  disabled?: boolean;
  /** Khóa nút +; không liên quan separateGlueComplete trừ khi parent truyền vào. */
  disableAddRow?: boolean;
  /** Dùng quy tắc khớp dung tích thùng giống ChietGlueTable (TL thực tế). */
  useChietCapacityValidation?: boolean;
}>();

const emit = defineEmits(['update-bucket', 'add-row', 'delete-row']);

const toast = useToast();
const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(1).fill({}));
const authStore = useAuthStore();
const bucketList = ref<BucketOption[]>([]);
const isLoadingBuckets = ref(false);
let bucketLoadPromise: Promise<void> | null = null;
const bucketSelectResetKeys = ref<Record<number, number>>({});
const tableWrapperRef = ref<HTMLElement | null>(null);

const { markPendingScrollToNewRow } = useScrollToNewTableRow(
  tableWrapperRef,
  () => props.orderDetails.length,
  { focusSelector: '.p-select' }
);

const clearRowBucketSelection = async (rowData: any, rowIndex: number) => {
  rowData.selectedBucketId = null;
  rowData.bucketId = undefined;
  updateRowCompletionInfo(rowData);
  bucketSelectResetKeys.value[rowIndex] = (bucketSelectResetKeys.value[rowIndex] ?? 0) + 1;
  await nextTick();
};

const getTargetWeightKg = () =>
  normalizeWeightToKg(props.targetWeight ?? 0, props.targetWeightUnit || 'Kg');

const getEffectiveTargetWeightKg = () => (
  props.useChietCapacityValidation
    ? resolveChietTargetCapacityKg(props.targetWeight ?? 0, props.targetWeightUnit || 'Kg')
    : getTargetWeightKg()
);

const getTargetWeightLabel = () => (
  props.useChietCapacityValidation
    ? formatEffectiveChietTargetLabel(props.targetWeight, props.targetWeightUnit || 'Kg')
    : formatTargetWeightLabel(props.targetWeight, props.targetWeightUnit || 'Kg')
);

const orderDetailsSelectionKey = computed(() =>
  props.orderDetails.map((row) => String(getRowActiveBucketId(row) ?? '')).join('|')
);

const getSelectedBucketTotalKg = () =>
  sumSelectedBucketCapacityKg(props.orderDetails, bucketList.value);

const shouldBlockAddRow = () => {
  if (!props.useChietCapacityValidation) {
    return isAllocationComplete();
  }

  void orderDetailsSelectionKey.value;
  void bucketList.value.length;

  return shouldBlockChietAddRow(
    props.orderDetails,
    bucketList.value,
    props.targetWeight,
    props.targetWeightUnit || 'Kg'
  );
};

const syncStoredBucketIdTypes = () => {
  if (bucketList.value.length === 0) return;

  props.orderDetails.forEach((row) => {
    const raw = row.selectedBucketId ?? row.bucketId;
    if (raw == null || raw === '') return;

    const normalized = normalizeBucketIdForSelect(raw, bucketList.value);
    if (normalized != null && normalized !== row.selectedBucketId) {
      row.selectedBucketId = normalized;
    }
  });
};

const getBucketOptionsForRow = (currentRow: any) => {
  if (bucketList.value.length === 0) {
    return bucketList.value;
  }

  if (props.useChietCapacityValidation) {
    const actualKg = getActualWeighedKg(props.targetWeight, props.targetWeightUnit || 'Kg');
    if (actualKg > 0) {
      return filterChietBucketOptionsForRow(
        bucketList.value,
        actualKg,
        props.orderDetails,
        currentRow
      );
    }
  }

  const targetWeightKg = getEffectiveTargetWeightKg();
  let options = bucketList.value;

  if (targetWeightKg > 0) {
    const remainingKg = targetWeightKg - sumSelectedBucketCapacityKg(
      props.orderDetails,
      bucketList.value,
      currentRow
    );
    options = sortBucketsByClosestCapacity(bucketList.value, remainingKg);
  }

  const selectedId = currentRow?.selectedBucketId ?? currentRow?.bucketId;
  if (selectedId == null || selectedId === '') return options;

  const selectedOption = findBucketOptionById(bucketList.value, selectedId);
  if (
    selectedOption
    && !options.some((item) => String(item.bucketId) === String(selectedOption.bucketId))
  ) {
    return [selectedOption, ...options];
  }

  return options;
};

const hasStoredBucketSelection = () =>
  props.orderDetails.some((row) => {
    const id = row.selectedBucketId ?? row.bucketId;
    return id != null && id !== '';
  });

const isAllocationComplete = () => {
  const targetWeightKg = getTargetWeightKg();

  if (targetWeightKg <= 0) {
    return true;
  }

  const totalKg = sumSelectedBucketCapacityKg(props.orderDetails, bucketList.value);
  return Math.abs(totalKg - targetWeightKg) <= WEIGHT_EPSILON;

  // const requireAllRequestDetails = props.requireAllRequestDetails ?? true;
  // if (targetWeightKg <= 0) {
  //   return !requireAllRequestDetails || areAllRequestDetailsUsed();
  // }
  // const capacityMatched = Math.abs(totalKg - targetWeightKg) <= WEIGHT_EPSILON;
  // const requestsMatched = !requireAllRequestDetails || areAllRequestDetailsUsed();
  // return capacityMatched && requestsMatched;
};

// const areAllRequestDetailsUsed = () => {
//   const assignedIds = new Set<string>();
//   props.orderDetails.forEach((row) => {
//     (row.selectedRequestDetailIds ?? []).forEach((id: string) => assignedIds.add(String(id)));
//   });
//   return props.requestDetails.every((item) => assignedIds.has(String(item.requestDetailId)));
// };

// const getSelectedIdsInOtherRows = (currentRow: any) => {
//   const selectedIds = new Set<string>();
//   props.orderDetails.forEach((row) => {
//     if (row === currentRow) return;
//     (row.selectedRequestDetailIds ?? []).forEach((id: string) => {
//       selectedIds.add(String(id));
//     });
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

// const hasRequestSelection = (rowData: any) => {
//   return Array.isArray(rowData.selectedRequestDetailIds) && rowData.selectedRequestDetailIds.length > 0;
// };

const hasBucketSelection = (rowData: any) => getRowActiveBucketId(rowData) != null;

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

// const handleRequestDetailChange = (rowData: any) => {
//   updateRowCompletionInfo(rowData);
//   emit('update-bucket');
// };

const isRowComplete = (rowData: any) => hasBucketSelection(rowData);

const handleAddRow = () => {
  const rows = props.orderDetails || [];

  if (props.useChietCapacityValidation && rows.length > 0) {
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

    if (shouldBlockAddRow()) {
      const actualLabel = formatTargetWeightLabel(props.targetWeight, props.targetWeightUnit || 'Kg');
      const totalKg = getSelectedBucketTotalKg();
      const exceeded = hasChietTotalExceededActual(
        props.orderDetails,
        bucketList.value,
        props.targetWeight,
        props.targetWeightUnit || 'Kg'
      );
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.allocationComplete'),
        detail: exceeded
          ? t('separateMixedGlue.validation.chietTotalExceededBlock', {
            total: formatWeightKg(totalKg),
            target: actualLabel,
          })
          : formatChietCapacityBlockMessage(props.targetWeight, props.targetWeightUnit || 'Kg'),
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

const fetchBucketList = async () => {
  if (bucketLoadPromise) {
    await bucketLoadPromise;
    return;
  }

  bucketLoadPromise = (async () => {
    isLoadingBuckets.value = true;
    try {
      const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
      if (data?.success && data.data) {
        bucketList.value = mapBucketOptions(data.data);
      } else {
        bucketList.value = [];
      }
    } catch (error) {
      console.error('Lỗi khi tải danh sách thùng chứa', error);
      bucketList.value = [];
      toast.add({
        severity: 'error',
        summary: t('listMixGlue.toast.error'),
        detail: t('common.checkNetwork'),
        life: 6000,
      });
    } finally {
      isLoadingBuckets.value = false;
      bucketLoadPromise = null;
      syncStoredBucketIdTypes();
    }
  })();

  await bucketLoadPromise;
};

watch(
  () => [props.isLoading, props.orderDetails.length, orderDetailsSelectionKey.value] as const,
  ([loading]) => {
    if (loading || !hasStoredBucketSelection()) return;
    void fetchBucketList();
  },
  { immediate: true }
);

const handleBucketSelectShow = () => {
  if (props.isViewMode || props.disabled || isLoadingBuckets.value) return;
  void fetchBucketList();
};

const handleBucketChange = async (rowData: any, rowIndex: number) => {
  if (!rowData.selectedBucketId) {
    rowData.bucketId = undefined;
  } else {
    rowData.bucketId = rowData.selectedBucketId;
  }

  if (rowData.selectedBucketId && !props.useChietCapacityValidation) {
    const targetWeightKg = getEffectiveTargetWeightKg();
    if (targetWeightKg > 0 && getSelectedBucketTotalKg() > targetWeightKg + WEIGHT_EPSILON) {
      await clearRowBucketSelection(rowData, rowIndex);
      toast.add({
        severity: 'warn',
        summary: t('separateMixedGlue.toast.weightExceeded'),
        detail: t('separateMixedGlue.toast.bucketCapacityExceeded', { label: getTargetWeightLabel() }),
        life: 6000,
      });
      return;
    }
  }

  updateRowCompletionInfo(rowData);
  emit('update-bucket');
};

defineExpose({
  shouldBlockAddRow,
  validateAllocation: () => {
    if (props.useChietCapacityValidation) {
      const result = validateChietBucketCapacity(
        props.orderDetails,
        bucketList.value,
        props.targetWeight,
        props.targetWeightUnit || 'Kg'
      );
      return result.ok ? null : result.message || t('separateMixedGlue.validation.capacityMismatchWeighed');
    }

    return validateSeparateGlueAllocation(
      props.orderDetails,
      props.requestDetails,
      bucketList.value,
      props.targetWeight,
      props.targetWeightUnit || 'Kg',
      { requireAllRequestDetails: false }
    );
  },
});
</script>