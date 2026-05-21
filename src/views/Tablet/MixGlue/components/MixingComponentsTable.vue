<template>
  <div class="border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : components" scrollable scrollHeight="290px" stripedRows
      class="modern-table auto-columns-table" tableStyle="width: 100%;"
      @row-click="(e) => $emit('row-click', e)" selectionMode="single" dataKey="materialCode" :selection="selectedItem"
      @update:selection="$emit('update:selectedItem', $event)">

      <template #empty>
        <div style="text-align: center; height: 100%; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="$emit('open-new')" />
        </div>
      </template>

      <Column header="#" headerClass="dt-col-index" bodyClass="dt-col-index">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" class="mx-auto" />
          <span v-else>{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="materialName" header="Tên thành phần" headerClass="dt-col-primary" bodyClass="dt-col-primary">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else class="font-medium dt-cell-wrap">{{ data.materialName }}</span>
        </template>
      </Column>

      <Column header="TL yêu cầu" headerClass="dt-col-weight" bodyClass="dt-col-weight">
        <template #body="{ data, index }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ index === 0 ? headerTotalWeight : data.requiredWeight }}</span>
        </template>
      </Column>

      <Column header="TL thực tế (Kg)" headerClass="dt-col-weight" bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else
            :class="data.actualWeight ? 'bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm' : ''">
            {{ data.actualWeight || '' }}
          </span>
        </template>
      </Column>

      <Column header="Người thao tác" headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ data.operator }}</span>
        </template>
      </Column>

      <Column header="Thời gian cân" headerClass="dt-col-datetime" bodyClass="dt-col-datetime">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.weighingTime" class="pi pi-clock text-xs mr-1"></i>
            {{ data.weighingTime ? format.formatDate(data.weighingTime) : '' }}
          </span>
        </template>
      </Column>

      <Column header="Thao tác" :exportable="false" headerClass="dt-col-action" bodyClass="dt-col-action">
        <template #body="slotProps">
          <Button v-if="slotProps.data.glueExtra && !slotProps.data.actualWeight" icon="pi pi-trash" severity="danger"
            text rounded aria-label="Delete" @click.stop="$emit('delete-row', slotProps.data)" />
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import format from '@/mixins/format';
import { ref } from 'vue';

defineProps<{
  isLoading: boolean;
  components: any[];
  headerTotalWeight: string | number;
  selectedItem: any;
}>();

defineEmits(['row-click', 'open-new', 'delete-row', 'update:selectedItem']);

const skeletons = ref(new Array(5).fill({}));
</script>
