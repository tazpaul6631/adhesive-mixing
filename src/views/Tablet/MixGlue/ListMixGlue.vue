<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>List Mix Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">
      <div class="main-container max-w-full mx-auto">

        <!-- <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <user-avatar />
          </div>
        </div> -->

        <div class="surface-card p-0 shadow-1 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>List Mix Glue
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" scrollable
              scrollHeight="500px" stripedRows class="modern-table" tableStyle="width: 100%; table-layout: fixed;"
              @row-click="onRowClick" :paginator="true" :rows="rowsPerPage" :rowsPerPageOptions="[5, 10, 20, 50]"
              selectionMode="single" v-model:selection="selectedItem" dataKey="workOrderMasterId">

              <template #empty>
                <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
                </div>
              </template>

              <Column field="workOrderMasterName" header="Đơn điều công" style="width: 20%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else class="text-wrap">{{ data.workOrderMasterName }}</span>
                </template>
              </Column>

              <Column field="chemicalMasterName" header="Keo" style="width: 20%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else class="text-wrap">{{ data.chemicalMasterName }}</span>
                </template>
              </Column>

              <Column field="workOrderWeight" header="Tổng TL (kg)" style="width: 15%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.workOrderWeight }}</span>
                </template>
              </Column>

              <Column field="createrId" header="Người tạo" style="width: 20%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.createrId }}</span>
                </template>
              </Column>

              <Column field="createDate" header="Ngày tạo" style="width: 15%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else><i class="pi pi-clock text-xs mr-1"></i>{{ data.createDate ?
                    format.formatDate(data.createDate) : '' }}</span>
                </template>
              </Column>

              <Column header="Xác nhận" :exportable="false" bodyStyle="text-align: center"
                style="width: 15%; height: 60px;">
                <template #body="{ data }">
                  <Button v-if="data.mixGlueConfirm" icon="pi pi-check-circle" severity="success" size="large"
                    @click.stop="handleConfirm(data.workOrderMasterId)" />
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
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  onIonViewWillEnter
} from '@ionic/vue';
import { ref } from 'vue';
import { useAuthStore } from '@/store/auth';
import format from '@/mixins/format';
import workOrder from '@/api/workOrder';
import { useRouter } from 'vue-router';
import { useToast } from 'primevue/usetoast';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import mixGlueApi from '@/api/mixGlue';

const router = useRouter();
const authStore = useAuthStore();

const selectedItem = ref<any>(null);
const toast = useToast();
const draftStore = useMixGlueDraftStore();

export interface WorkOrderMaster {
  orderDetails: any[];
  mixChemicals: any[];
  noMixChemicals: any[];
  factoryId: string;
  workOrderMasterId: string;
  workOrderMasterName: string;
  recordStatus: string;
  createrId: string;
  createDate: string;
  updaterId: string;
  updateDate: string;
  chemicalMasterName: string;
  hourlyValidity: string;
  workOrderWeight: string;
  isMixGlue: boolean;
  isNoMixGlue: boolean;
  mixGlueComplete: boolean;
  qipConfirm: boolean;
  mixGlueConfirm: boolean;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: string;
  page: string;
  pageSize: string;
  totalPage: string;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface ApiResponse<T> {
  data: PagedResult<T>;
  success: boolean;
  message: string;
}

const isLoadingLine = ref(true);
const lineDetails = ref<Partial<WorkOrderMaster>[]>([]);
const totalRecords = ref(0);
const currentPage = ref(1);
const rowsPerPage = ref(5);

const onRowClick = (event: { data: Partial<WorkOrderMaster> }) => {
  const workOrderMasterId = event.data.workOrderMasterId;
  if (workOrderMasterId) {
    router.push({
      path: '/mix-glue-management',
      query: { workOrderMasterId: workOrderMasterId }
    });
  } else {
    console.warn('workOrderMasterId is missing in the clicked row data');
  }
};

// Hàm xử lý gửi API khi bấm nút
const handleConfirm = async (workOrderMasterId: string) => {
  const draftData = draftStore.getDraft(workOrderMasterId);
  console.log(draftData);

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      workOrderMasterId: workOrderMasterId,
      hourlyValidity: draftData.hourlyValidity
    }
    await mixGlueApi.postMGMConfirmComplete(payload);

    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã xác nhận đơn hàng!', life: 3000 });
    draftStore.clearDraft(workOrderMasterId);
    fetchWorkOrders(currentPage.value, rowsPerPage.value);
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Xác nhận thất bại!', life: 3000 });
  }
};

const fetchWorkOrders = async (page: number, pageSize: number) => {
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: pageSize }).map(() => ({}));

  try {
    const payload = {
      factoryId: authStore.user?.factoryId,
      mixGlueComplete: false,
      qipConfirm: false,
      page: page,
      pageSize: pageSize
    };

    const response = await workOrder.postWorkOrderList(payload);
    const resData = response.data as ApiResponse<WorkOrderMaster>;

    if (resData && resData.success) {
      lineDetails.value = resData.data.items;
      totalRecords.value = Number(resData.data.totalCount) || 0;
    } else {
      console.error("Lấy dữ liệu thất bại:", resData?.message);
      lineDetails.value = [];
      totalRecords.value = 0;
    }
  } catch (error) {
    console.error("Lỗi gọi API getWorkOrderList:", error);
    lineDetails.value = [];
    totalRecords.value = 0;
  } finally {
    isLoadingLine.value = false;
  }
};

const onPageLine = (event: any) => {
  currentPage.value = event.page + 1;
  rowsPerPage.value = event.rows;
  fetchWorkOrders(currentPage.value, rowsPerPage.value);
};

const goBack = () => router.push('/app-menu');

onIonViewWillEnter(() => {
  fetchWorkOrders(currentPage.value, rowsPerPage.value);
}) 
</script>

<style scoped>
.text-wrap {
  word-break: break-word;
  white-space: normal;
}
</style>