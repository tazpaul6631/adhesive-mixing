<template>
  <div class="overflow-x-auto border-round-bottom-xl">
    <DataTable :value="isLoading ? skeletons : components" scrollable scrollHeight="700px" stripedRows
      class="modern-table" tableStyle="min-width: 70rem" @row-click="(e) => $emit('row-click', e)"
      selectionMode="single">

      <template #empty>
        <div style="text-align: center; padding: 2rem;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
        </div>
      </template>

      <template #footer>
        <div class="flex justify-start">
          <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="$emit('open-new')" />
        </div>
      </template>

      <Column header="#" style="width: 50px; text-align: center; height: 60px">
        <template #body="{ index }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" class="mx-auto" />
          <span v-else>{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="materialName" header="Tên thành phần" class="font-medium" style="min-width: 180px; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else>{{ data.materialName }}</span>
        </template>
      </Column>

      <Column header="TL Yêu cầu (Kg)" style="min-width: 150px; height: 60px">
        <template #body="{ data, index }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ index === 0 ? headerTotalWeight : data.requiredWeight }}</span>
        </template>
      </Column>

      <Column header="TL Thực tế (Kg)" style="min-width: 150px; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else
            :class="data.actualWeight ? 'bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm' : ''">
            {{ data.actualWeight || '' }}
          </span>
        </template>
      </Column>

      <Column header="Người thao tác" style="min-width: 150px; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else>{{ data.operator }}</span>
        </template>
      </Column>

      <Column header="Thời gian cân" style="min-width: 180px; height: 60px">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="90%" height="1rem" />
          <span v-else class="text-500">{{ data.weighingTime }}</span>
        </template>
      </Column>
    </DataTable>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

defineProps<{
  isLoading: boolean;
  components: any[];
  headerTotalWeight: string | number;
}>();

defineEmits(['row-click', 'open-new']);

const skeletons = ref(new Array(5).fill({}));
</script>