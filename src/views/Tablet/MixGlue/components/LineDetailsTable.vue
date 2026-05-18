<template>
  <div class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="isLoading ? skeletons : lineDetails" scrollable scrollHeight="700px"
      tableStyle="width: 100%; table-layout: fixed;" stripedRows class="modern-table">

      <template #empty>
        <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <Column field="productLineName" header="Xưởng" style="width: 23%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ data.productLineName }}</span>
        </template>
      </Column>

      <Column field="workOrderMasterName" header="Đơn yêu cầu" style="width: 20%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ data.workOrderMasterName }}</span>
        </template>
      </Column>

      <Column field="styleName" header="Hình thể" style="width: 15%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70%" height="1rem" />
          <span v-else>{{ data.styleName }}</span>
        </template>
      </Column>

      <Column field="requestDetailName" header="Chuyền" style="width: 24%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm">
            {{ data.requestDetailName }}
          </span>
        </template>
      </Column>

      <Column field="workOrderWeight" header="Trọng lượng" style="width: 18%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ data.workOrderWeight }} {{ data.workOrderWeightUnit }}</span>
        </template>
      </Column>

      <Column field="requestTime" header="Thời gian lãnh" style="width: 15%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i class="pi pi-clock text-xs mr-1"></i>{{ format.formatDate(data.requestTime) }}
          </span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import format from '@/mixins/format';

defineProps<{
  isLoading: boolean;
  lineDetails: any[];
}>();

const skeletons = ref(new Array(5).fill({}));
</script>