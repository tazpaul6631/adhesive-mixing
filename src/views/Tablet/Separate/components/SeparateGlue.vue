<template>
  <div class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="isLoading ? skeletons : orderDetails" scrollable scrollHeight="320px"
      tableStyle="min-width: 800px; width: 100%; table-layout: fixed;" stripedRows class="modern-table">

      <template #empty>
        <div style="text-align: center; height: 240px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <template #footer>
        <div v-if="!isViewMode" class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" :disabled="isLoading"
            @click="handleAddRow" />
        </div>
      </template>

      <Column field="requestDetailName" header="#" style="width: 4%; height: 60px">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="productLineName" header="Đơn yêu cầu" style="width: 24%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <MultiSelect v-else v-model="data.selectedRequestDetailIds" :options="getAvailableRequestDetails(data)"
            :maxSelectedLabels="3" optionLabel="label" optionValue="requestDetailId" filter
            selectedItemsLabel="{0} đơn yêu cầu" placeholder="Chọn đơn yêu cầu" class="w-full" appendTo="body"
            :disabled="isViewMode" @change="handleRequestDetailChange(data)" />
        </template>
      </Column>

      <Column header="Thùng chứa" style="width: 18%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <Select v-else v-model="data.selectedBucketId" :options="bucketList" optionLabel="label"
            optionValue="bucketId" placeholder="Chọn thùng" class="w-full" appendTo="body" :disabled="isViewMode"
            @change="handleBucketChange(data)" />
        </template>
      </Column>

      <Column field="operator" header="Người thao tác" style="width: 28%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ data.operator || '' }}</span>
        </template>
      </Column>

      <Column header="Thời gian hoàn thành" style="width: 20%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.confirmTime" class="pi pi-clock text-xs mr-1"></i>{{ data.confirmTime }}
          </span>
        </template>
      </Column>

      <Column v-if="!isViewMode" header="Thao tác" :exportable="false" style="width: 10%; height: 60px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button v-if="!isLoading && orderDetails.length > 0" icon="pi pi-trash" severity="danger" text rounded
              aria-label="Delete" @click.stop="handleDeleteRow(data)" />
          </div>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import format from '@/mixins/format';
import { useAuthStore } from '@/store/auth';
import bucketApi from '@/api/bucket';
import dayjs from "dayjs";

const props = defineProps<{
  isLoading: boolean;
  orderDetails: any[];
  requestDetails: any[];
  isViewMode?: boolean;
}>();

const emit = defineEmits(['update-bucket', 'add-row', 'delete-row']);

const skeletons = ref(new Array(1).fill({}));
const authStore = useAuthStore();
const bucketList = ref<any[]>([]);

const getSelectedIdsInOtherRows = (currentRow: any) => {
  const selectedIds = new Set<string>();

  props.orderDetails.forEach((row) => {
    if (row === currentRow) return;
    (row.selectedRequestDetailIds ?? []).forEach((id: string) => {
      selectedIds.add(String(id));
    });
  });

  return selectedIds;
};

const getAvailableRequestDetails = (currentRow: any) => {
  const selectedInOtherRows = getSelectedIdsInOtherRows(currentRow);
  const currentSelected = new Set((currentRow.selectedRequestDetailIds ?? []).map((id: string) => String(id)));

  return props.requestDetails.filter((item) => {
    const id = String(item.requestDetailId);
    return currentSelected.has(id) || !selectedInOtherRows.has(id);
  });
};

const hasRequestSelection = (rowData: any) => {
  return Array.isArray(rowData.selectedRequestDetailIds) && rowData.selectedRequestDetailIds.length > 0;
};

const hasBucketSelection = (rowData: any) => {
  return !!rowData.selectedBucketId;
};

const updateRowCompletionInfo = (rowData: any) => {
  if (hasRequestSelection(rowData) || hasBucketSelection(rowData)) {
    rowData.operator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || 'Chưa xác định';
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

const handleRequestDetailChange = (rowData: any) => {
  updateRowCompletionInfo(rowData);
  emit('update-bucket');
};

const handleAddRow = () => {
  emit('add-row');
};

const handleDeleteRow = (rowData: any) => {
  emit('delete-row', rowData);
};

const handleBucketChange = (rowData: any) => {
  updateRowCompletionInfo(rowData);
  emit('update-bucket');
};

onMounted(async () => {
  try {
    const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success && data.data) {
      bucketList.value = data.data.map((item: any) => ({
        ...item,
        label: `${item.capacity} ${item.capacityUnit || 'Kg'}`
      }));
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách thùng chứa', error);
  }
});
</script>