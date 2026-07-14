<template>
  <div class="overflow-x-auto border-round-bottom-xl transition-all duration-300">
    <DataTable :value="isLoading ? skeletons : lineDetails" scrollable scrollHeight="700px" tableStyle="width: 100%;"
      class="modern-table auto-columns-table">

      <template #empty>
        <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
          <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
          <p style="margin: 0; color: #6b7280;">{{ t('listMixGlue.empty') }}</p>
        </div>
      </template>

      <Column header="#" headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data, index }">
          <Skeleton v-if="isLoading" width="60%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ index + 1 }}</span>
        </template>
      </Column>

      <Column field="workOrderMasterName" :header="t('mixGlueManagement.lineDetailsTable.columns.requestOrder')"
        headerClass="dt-col-primary" bodyClass="dt-col-primary">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="80%" height="1rem" />
          <span v-else class="dt-cell-wrap">{{ data.workOrderMasterName }}</span>
        </template>
      </Column>

      <Column field="styleName" :header="t('mixGlueManagement.lineDetailsTable.columns.style')"
        headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="70%" height="1rem" />
          <span v-else class="dt-cell-ellipsis">{{ data.styleName }}</span>
        </template>
      </Column>

      <Column field="requestDetailName" :header="t('mixGlueManagement.lineDetailsTable.columns.line')"
        headerClass="dt-col-text" bodyClass="dt-col-text">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="60%" height="1.5rem" class="border-round-md" />
          <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm dt-cell-wrap">
            {{ data.productLineName }}
          </span>
        </template>
      </Column>

      <Column field="workOrderWeight" :header="t('mixGlueManagement.lineDetailsTable.columns.weight')"
        headerClass="dt-col-weight" bodyClass="dt-col-weight">
        <template #body="{ data }">
          <Skeleton v-if="isLoading" width="50%" height="1rem" />
          <span v-else>{{ data.workOrderWeight }} {{ data.workOrderWeightUnit }}</span>
        </template>
      </Column>

      <Column field="requestTime" :header="t('mixGlueManagement.lineDetailsTable.columns.requestTime')"
        headerClass="dt-col-datetime" bodyClass="dt-col-datetime">
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
import { useAppLocale } from '@/composables/useAppLocale';

defineProps<{
  isLoading: boolean;
  lineDetails: any[];
}>();

const { t } = useAppLocale(() => 'tablet');
const skeletons = ref(new Array(5).fill({}));
</script>
