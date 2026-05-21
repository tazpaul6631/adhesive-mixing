<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>QIP Confirm Mix Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding bg-gray-50" :scroll-events="true">
      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin Header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div
            class="flex flex-wrap align-items-center justify-content-between border-bottom-1 surface-border pb-3 mb-3">
            <user-avatar />
            <ConnectBluetooth ref="bluetoothRef" templateType="mix_glue" :printData="selectedItem"
              @printSuccess="handlePrintSuccess" />
          </div>

          <div class="grid formgrid p-fluid">
            <div class="col-12 sm:col-6 lg:col-4">
              <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
              <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600 bg-gray-50" />
            </div>
            <div class="col-12 sm:col-6 lg:col-4">
              <label class="text-800 font-medium mb-1 block">Keo</label>
              <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600 bg-gray-50" />
            </div>
            <div class="col-12 sm:col-6 lg:col-4 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Tổng trọng lượng (Kg)</label>
              <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600 bg-gray-50" />
            </div>
          </div>
        </div>

        <div class="surface-card p-0 shadow-1 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl bg-white border-bottom-1 surface-border">
            <span class="font-bold text-900 text-xl">
              <i class="pi pi-list mr-2 text-primary"></i>Danh sách trộn keo chờ xác nhận
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="isLoadingLine ? skeletonData : mixGlues" stripedRows
              class="custom-bordered-table auto-columns-table" tableStyle="width: 100%;" rowGroupMode="rowspan"
              groupRowsBy="totalMixGlueWeight">

              <template #empty>
                <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
                </div>
              </template>

              <Column header="#" headerClass="dt-col-index" bodyClass="dt-col-index">
                <template #body="{ index }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" class="mx-auto" />
                  <span v-else>{{ index + 1 }}</span>
                </template>
              </Column>

              <Column header="Tên thành phần" field="materialName" headerClass="dt-col-primary"
                bodyClass="dt-col-primary">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else class="font-medium text-800">{{ data.materialName }}</span>
                </template>
              </Column>

              <Column header="Loại keo" headerClass="dt-col-tag" bodyClass="dt-col-tag">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <Tag v-else :value="data.glueExtra ? 'Keo thêm' : 'Keo chính'" :severity="getSeverity(data.glueExtra)"
                    class="font-medium text-sm" />
                </template>
              </Column>

              <Column header="TL thực tế" headerClass="dt-col-weight" bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <div v-else class="flex align-items-center gap-2">
                    <span class="font-bold text-blue-600 text-lg">{{ data.mixGlueWeight }}</span>
                    <span class="text-500 font-medium">{{ data.mixGlueWeightUnit }}</span>
                  </div>
                </template>
              </Column>

              <Column field="totalMixGlueWeight" header="Tổng (KG)" headerClass="dt-col-weight"
                bodyClass="dt-col-weight">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else class="font-bold text-green-600 text-lg">{{ totalMixGlueWeight }}</span>
                </template>
              </Column>

              <Column header="Người cân" field="updaterId" headerClass="dt-col-text" bodyClass="dt-col-text">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else class="text-700">{{ data.updaterId }}</span>
                </template>
              </Column>

              <Column header="Thời gian hoàn thành" field="weightCompleteDate" headerClass="dt-col-datetime"
                bodyClass="dt-col-datetime">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ format.formatDate(data.weightCompleteDate)
                  }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewWillEnter, onIonViewDidLeave
} from '@ionic/vue';

import ConnectBluetooth from '@/components/ConnectBluetooth.vue';
import UserAvatar from '@/components/UserAvatar.vue';

import workOrder from '@/api/workOrder';
import format from '@/mixins/format';

// --- INTERFACES ---
interface MixGlueItem {
  factoryId: string;
  mixGlueId: string;
  mixGlueMasterId: string;
  materialCode: string;
  materialName: string;
  mixGlueWeight: string;
  mixGlueWeightUnit: string;
  glueExtra: boolean;
  weightCompleteDate: string;
  updaterId: string;
}

interface HeaderInfo {
  orderNo: string;
  glue: string;
  totalWeight: string;
}

// --- STATE ---
const router = useRouter();
const route = useRoute();
const toast = useToast();

const contentRef = ref<any>(null);
const isLoadingLine = ref(true);

const selectedItem = ref<any>(null);
const headerInfo = ref<HeaderInfo>({ orderNo: '', glue: '', totalWeight: '' });
const mixGlues = ref<MixGlueItem[]>([]);
const totalMixGlueWeight = ref<any>(null);
const bluetoothRef = ref<any>(null);

const skeletonData = ref(new Array(5).fill({}));

const resetState = () => {
  selectedItem.value = null;
  headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
  mixGlues.value = [];
  totalMixGlueWeight.value = null;
};

const handlePrintSuccess = () => {
  router.back();
};

// --- METHODS ---
const fetchWorkOrderDetail = async (id: string) => {
  resetState();
  isLoadingLine.value = true;

  try {
    const { data } = await workOrder.getWorkOrder(id, 2);

    if (data?.success && data?.data) {
      const respData = data.data;

      selectedItem.value = {
        workOrderMasterId: respData.workOrderMasterId,
        mixGlueMasterId: respData.mixGlueMasterId,
        workOrderMasterName: respData.workOrderMasterName
      };

      totalMixGlueWeight.value = respData.totalMixGlueWeight;

      headerInfo.value = {
        orderNo: respData.workOrderMasterName || '',
        glue: respData.chemicalMasterName || '',
        totalWeight: respData.mixGlueWeight || respData.workOrderWeight || '0.00'
      };

      mixGlues.value = (respData.mixGlues || []).map((item: any) => ({
        factoryId: item.factoryId || '',
        mixGlueId: item.mixGlueId || '',
        mixGlueMasterId: item.mixGlueMasterId || '',
        materialCode: item.materialCode || '',
        materialName: item.materialName || '',
        mixGlueWeight: item.mixGlueWeight || '0.00',
        mixGlueWeightUnit: item.mixGlueWeightUnit || 'Kg',
        glueExtra: item.glueExtra || false,
        weightCompleteDate: item.weightCompleteDate || '',
        updaterId: item.updaterId || ''
      }));
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    toast.add({
      severity: 'error',
      summary: 'Lỗi hệ thống',
      detail: 'Không thể tải dữ liệu đơn hàng. Vui lòng thử lại sau.',
      life: 3000
    });
  } finally {
    isLoadingLine.value = false;
  }
};

const getSeverity = (isExtra: boolean) => {
  return isExtra ? 'warning' : 'success';
};

// --- NAVIGATION & SCROLL ---
const goBack = () => router.back();

// --- LIFECYCLE ---
onIonViewWillEnter(async () => {
  await nextTick();
  bluetoothRef.value?.initBluetooth?.();

  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
  }
});

onIonViewDidLeave(() => {
  bluetoothRef.value?.cleanupBluetooth?.();
});
</script>

<style scoped></style>