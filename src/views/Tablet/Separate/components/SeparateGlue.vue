<template>
  <div class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="isLoading ? skeletons : orderDetails" scrollable scrollHeight="400px"
      tableStyle="min-width: 800px; width: 100%; table-layout: fixed;" stripedRows class="modern-table">

      <template #empty>
        <div style="text-align: center; height: 280px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <!-- <Column field="factoryName" header="Xưởng" style="width: 10%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ data.factoryName }}</span>
        </template>
      </Column> -->

      <Column field="requestDetailName" header="Đơn yêu cầu" style="width: 20%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ data.requestDetailName }}</span>
        </template>
      </Column>

      <Column field="styleName" header="Hình thể" style="width: 15%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70%" height="1rem" />
          <span v-else>{{ data.styleName }}</span>
        </template>
      </Column>

      <Column field="productLineName" header="Dây chuyền" style="width: 24%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md">
            {{ data.productLineName }}
          </span>
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

      <Column header="Thời gian hoàn thành" style="width: 15%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.confirmTime" class="pi pi-clock text-xs mr-1"></i>{{ data.confirmTime }}
          </span>
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

defineProps<{
  isLoading: boolean;
  orderDetails: any[];
  isViewMode?: boolean;
}>();

const emit = defineEmits(['update-bucket']);

const skeletons = ref(new Array(5).fill({}));
const authStore = useAuthStore();
const bucketList = ref<any[]>([]);

const handleBucketChange = (rowData: any) => {
  if (rowData.selectedBucketId) {
    // Nếu có chọn thùng thì gán thông tin
    rowData.operator = authStore.user?.name || authStore.user?.employeeName || authStore.user?.employeeId || 'Chưa xác định';
    rowData.operatorId = authStore.user?.employeeId || '';
    const now = dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS');
    rowData.confirmTime = format.formatDate(now);
    rowData.confirmDate = now;
  } else {
    // Nếu clear thùng (chọn lại placeholder) thì xóa thông tin
    rowData.operator = '';
    rowData.operatorId = '';
    rowData.confirmTime = null;
    rowData.confirmDate = null;
  }

  emit('update-bucket');
};

onMounted(async () => {
  try {
    const { data } = await bucketApi.postBucket({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success && data.data) {
      bucketList.value = data.data.map((item: any) => ({
        ...item,
        label: `${item.capacity} ${item.capacityUnit}`
      }));
    }
  } catch (error) {
    console.error('Lỗi khi tải danh sách thùng chứa', error);
  }
});
</script>