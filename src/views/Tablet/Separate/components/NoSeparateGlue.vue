<template>
  <div class="overflow-x-auto border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : noMixChemicals" scrollable scrollHeight="190px" stripedRows
      class="modern-table" tableStyle="min-width: 800px; width: 100%; table-layout: fixed;"
      @row-click="(e) => $emit('row-click', e)" selectionMode="single" dataKey="materialCode" :selection="selectedItem"
      @update:selection="$emit('update:selectedItem', $event)">

      <template #empty>
        <div style="text-align: center; padding: 1rem; height: 100%; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="$emit('open-new')" />
        </div>
      </template>

      <!-- <Column header="Xưởng" style="width: 10%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" class="mx-auto" />
          <span v-else>{{ data.factoryName }}</span>
        </template>
      </Column> -->

      <Column header="Hình thể" style="width: 13%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ data.styleName }}</span>
        </template>
      </Column>

      <Column field="materialName" header="Keo" class="font-medium" style="width: 20%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ data.materialName }}</span>
        </template>
      </Column>

      <Column header="TL thực tế" style="width: 13%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else
            :class="data.actualWeight ? 'bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm' : ''">
            {{ data.actualWeight || '' }}
          </span>
        </template>
      </Column>

      <Column header="Người thao tác" style="width: 20%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ data.operator }}</span>
        </template>
      </Column>

      <Column header="Thời gian cân" style="width: 14%; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">
            <i v-if="data.weighingTime" class="pi pi-clock text-xs mr-1"></i>
            {{ data.weighingTime ? format.formatDate(data.weighingTime) : '' }}
          </span>
        </template>
      </Column>

      <Column header="Thao tác" :exportable="false" style="width: 15%; height: 60px">
        <template #body="{ data }">
          <div class="flex gap-2">
            <Button v-if="!data.isChietCompleted" icon="pi pi-plus" severity="success" text rounded aria-label="Add"
              @click.stop="$emit('chiet-row', data)" />

            <Button v-if="data.isChietCompleted" icon="pi pi-eye" severity="primary" text rounded aria-label="View"
              @click.stop="$emit('view-row', data)" />

            <Button v-if="data.glueExtra" icon="pi pi-trash" severity="danger" text rounded aria-label="Delete"
              @click.stop="$emit('delete-row', data)" />
          </div>
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
  noMixChemicals: any[];
  headerTotalWeight: string | number;
  selectedItem: any;
}>();

defineEmits([
  'row-click',
  'open-new',
  'delete-row',
  'update:selectedItem',
  'chiet-row',
  'view-row'
]);

const skeletons = ref(new Array(5).fill({}));
</script>