<template>
  <div class="surface-card p-0 shadow-1 border-round-xl">
    <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
      <span class="font-bold text-700 text-lg">
        <i class="pi pi-box mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
      </span>
    </div>
    <div class="overflow-x-auto border-round-bottom-xl">
      <DataTable :value="items" lazy :totalRecords="totalRecords" @page="onPage" scrollable scrollHeight="500px"
        stripedRows class="modern-table" tableStyle="width: 100%; min-width: 800px;" @row-click="onRowClick"
        :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20, 50]" selectionMode="single"
        v-model:selection="localSelected" dataKey="noRePackingGlueId">
        <template #empty>
          <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
            <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
            <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
          </div>
        </template>

        <Column field="workOrderMasterName" header="Đơn điều công" style="width: 25%; height: 60px">
          <template #body="{ data }">
            <Skeleton v-if="isLoading" width="80%" height="1rem" />
            <span v-else class="text-wrap font-bold">{{ data.workOrderMasterName }}</span>
          </template>
        </Column>

        <Column field="productLineName" header="Chuyền" style="width: 15%; height: 60px">
          <template #body="{ data }">
            <Skeleton v-if="isLoading" width="60%" height="1rem" />
            <span v-else>{{ data.productLineName }}</span>
          </template>
        </Column>

        <Column field="glueName" header="Tên Keo" style="width: 15%; height: 60px">
          <template #body="{ data }">
            <Skeleton v-if="isLoading" width="60%" height="1rem" />
            <span v-else>{{ data.glueName }}</span>
          </template>
        </Column>

        <Column header="Trọng lượng" style="width: 15%; height: 60px">
          <template #body="{ data }">
            <Skeleton v-if="isLoading" width="60%" height="1rem" />
            <span v-else>{{ data.glueWeight }}</span>
          </template>
        </Column>

        <Column field="updateDate" header="Ngày cập nhật" style="width: 25%; height: 60px">
          <template #body="{ data }">
            <Skeleton v-if="isLoading" width="80%" height="1rem" />
            <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ data.updateDate ?
              formatDate(data.updateDate) : '' }}</span>
          </template>
        </Column>
      </DataTable>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import format from '@/mixins/format';

const props = defineProps({
  items: { type: Array, required: true },
  totalRecords: { type: Number, default: 0 },
  isLoading: { type: Boolean, default: false },
  rowsPerPage: { type: Number, default: 20 },
  selectedItem: { type: Object, default: null }
});

const emit = defineEmits(['update:selectedItem', 'page', 'row-click']);

const localSelected = ref(props.selectedItem);

watch(localSelected, (newValue) => {
  emit('update:selectedItem', newValue);
});
watch(() => props.selectedItem, (newValue) => {
  localSelected.value = newValue;
});

const onPage = (event: any) => emit('page', event);
const onRowClick = (event: any) => emit('row-click', event);
const formatDate = (date: string) => format.formatDate(date);
</script>

<style scoped>
.text-wrap {
  word-break: break-word;
  white-space: normal;
}
</style>