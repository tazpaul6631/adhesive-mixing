<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Re-Packing Mixed Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <Toast position="top-right" />

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <!-- <user-avatar /> -->
            <div class="grid formgrid p-fluid flex">
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
                <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4">
                <label class="text-800 font-medium mb-1 block">Keo</label>
                <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600" />
              </div>
              <div class="col-12 sm:col-6 lg:col-4 sm:mt-2 lg:mt-0">
                <label class="text-800 font-medium mb-1 block">Tổng trọng lượng (Kg)</label>
                <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600" />
              </div>
            </div>
            <div class="flex gap-2">
              <Button icon="pi pi-save" outlined size="large" @click="handleSaveDraft" />
              <Button icon="pi pi-check-circle" severity="success" size="large" @click="handleComplete" />
            </div>
          </div>
        </div>

        <div>
          <ion-segment v-model="selectedTab" mode="ios">
            <ion-segment-button value="table1">
              <ion-label class="font-bold">KEO TRỘN</ion-label>
            </ion-segment-button>
            <ion-segment-button value="table2">
              <ion-label class="font-bold">KEO KHÔNG TRỘN</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div>

        <div class="block w-full">

          <div v-show="selectedTab === 'table1'">
            <div class="surface-card p-0 shadow-1 border-round-xl">
              <div class="surface-100 p-3 border-round-top-xl">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thùng keo trộn
                </span>
              </div>
              <RepackingGlue :is-loading="isLoadingLine" :order-details="orderDetails"
                @update-bucket="saveDraftToStoreOnly" />
            </div>
          </div>

          <div v-show="selectedTab === 'table2'">
            <div class="surface-card p-0 shadow-1 border-round-xl">
              <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
                <span class="font-bold text-700 text-lg">
                  <i class="pi pi-box mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
                </span>
              </div>

              <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
                <div class="grid formgrid align-items-end">
                  <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                    <label class="text-800 font-medium mb-2 block">Hình thể</label>
                    <InputText v-model="mixingProcess.styleName" readonly class="font-bold text-primary border-blue-200"
                      style="width: 280px;" fluid />
                  </div>

                  <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                    <label class="text-800 font-medium mb-2 block">Keo</label>
                    <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                      style="width: 280px;" fluid />
                  </div>

                  <ElectronicScale :weight-unit="activeComponent?.weightUnit"
                    :target-weight="activeComponent?.requiredWeight ?? 0"
                    :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                    :upper-tolerance="activeComponent?.upperTolerance ?? ''" @update:weight="handleWeightChange"
                    @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
                </div>
              </div>

              <div class="overflow-x-auto border-round-bottom-xl">
                <div ref="table2Ref" class="table-wrapper">
                  <NoRePackingGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                    :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                    @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent"
                    @chiet-row="handleChietRow" @view-row="handleViewRow" />
                </div>

                <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
                  :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
                  @save="handleSaveNewComponent" />

                <ChietKeoDialog v-model:visible="chietDialog" :chemical="currentChietChemical"
                  :order-details="chietOrderDetails" :is-view-mode="isViewMode" @update-bucket="handleChietUpdateBucket"
                  @confirm="confirmChiet" />
              </div>
            </div>
          </div>

        </div>

        <!-- BẢNG 1 -->
        <!-- <div class="surface-card p-0 shadow-1 mt-4 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thùng keo trộn
            </span>
          </div>
          <RepackingGlue :is-loading="isLoadingLine" :order-details="orderDetails"
            @update-bucket="saveDraftToStoreOnly" />
        </div> -->

        <!-- BẢNG 2 -->
        <!-- <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-box mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">
              <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Hình thể</label>
                <InputText v-model="mixingProcess.styleName" readonly class="font-bold text-primary border-blue-200"
                  style="width: 280px;" fluid />
              </div>

              <div class="col-12 sm:col-6 lg:col-3 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Keo</label>
                <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                  style="width: 280px;" fluid />
              </div>

              <ElectronicScale :weight-unit="activeComponent?.weightUnit"
                :target-weight="activeComponent?.requiredWeight ?? 0"
                :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                :upper-tolerance="activeComponent?.upperTolerance ?? ''" @update:weight="handleWeightChange"
                @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <div ref="table2Ref" class="table-wrapper">
              <NoRePackingGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent"
                @chiet-row="handleChietRow" @view-row="handleViewRow" />
            </div>

            <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
              :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
              @save="handleSaveNewComponent" />

            <ChietKeoDialog v-model:visible="chietDialog" :chemical="currentChietChemical"
              :order-details="chietOrderDetails" @update-bucket="handleChietUpdateBucket" @confirm="confirmChiet" />
          </div>
        </div> -->

        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, watch } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewDidEnter, useBackButton, alertController,
  IonSegment, IonSegmentButton, IonLabel, onIonViewWillEnter
} from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import format from '@/mixins/format';

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';

import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import AddComponentDialog from '@/views/Tablet/RePacking/components/AddComponentDialog.vue';
import RepackingGlue from '@/views/Tablet/RePacking/components/RepackingGlue.vue';
import NoRePackingGlue from '@/views/Tablet/RePacking/components/NoRePackingGlue.vue';
import ChietKeoDialog from '@/views/Tablet/RePacking/components/ChietKeoDialog.vue';
import rePackingGlue from '@/api/rePackingGlue';

dayjs.extend(customParseFormat);
const VI_FORMATS = ["DD/MM/YYYY, HH:mm:ss", "DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY"];

// ============================================================================
// GLOBAL SETUP & REFS
// ============================================================================
const toast = useToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false);
const isNavigatingAway = ref(false);
const startDate = ref('');
const endDate = ref('');

const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const orderDetails = ref<any[]>([]);
const noMixChemicalsFull = ref<any[]>([]);
const noMixComponents = ref<any[]>([]);
const selectedItem = ref<any>(null);
const activeComponent = ref<any>(null);
const mixingProcess = ref({ component: '', weight: '', styleName: '' });

const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);
const hourlyValidity = ref<string>('0');

const contentRef = ref<any>(null);
// const table2Ref = ref<HTMLDivElement | null>(null);
const selectedTab = ref('table1');
const showScrollButton = ref(false);
const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);
const isViewMode = ref(false);
const chietDialog = ref(false);
const chietOrderDetails = ref<any[]>([]);
const currentChietChemical = ref<any>(null);
const extraChietList = ref<any[]>([]); // Chứa mảng dữ liệu chiết thêm từ Modal

watch(noMixChemicalsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

watch(orderDetails, () => {
  if (!isLoadingLine.value) isDirty.value = true;
}, { deep: true });

const resetState = () => {
  isDirty.value = false;
  isNavigatingAway.value = false;
  startDate.value = '';
  endDate.value = '';
  headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
  orderDetails.value = [];
  noMixChemicalsFull.value = [];
  noMixComponents.value = [];
  selectedItem.value = null;
  activeComponent.value = null;
  mixingProcess.value = { component: '', weight: '', styleName: '' };
  hourlyValidity.value = '0';
  selectedTab.value = 'table1'; // Tùy chọn: Đưa tab về mặc định

  // Clear data của Modal chiết
  extraChietList.value = [];
  chietOrderDetails.value = [];
  currentChietChemical.value = null;
};

// ============================================================================
// FETCH DATA & MAPPING
// ============================================================================
const fetchWorkOrderDetail = async (id: string) => {
  resetState();

  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  try {
    const existingDraft = draftStore.getDraft(id);

    if (existingDraft && existingDraft.noMixChemicalsFull?.length > 0) {
      headerInfo.value = existingDraft.headerInfo;
      noMixChemicalsFull.value = existingDraft.noMixChemicalsFull;
      noMixComponents.value = existingDraft.noMixComponents || [];
      extraChietList.value = existingDraft.extraChietList || [];

      selectedItem.value = noMixChemicalsFull.value[0];
      activeComponent.value = { ...noMixChemicalsFull.value[0] };
      mixingProcess.value.styleName = noMixChemicalsFull.value[0]?.styleName || '';
      mixingProcess.value.component = noMixChemicalsFull.value[0]?.materialName || '';

      const { data } = await workOrder.getWorkOrder(id, 3);
      if (data?.success) {
        const respData = data.data;
        startDate.value = respData.startDate || new Date().toISOString();
        endDate.value = respData.endDate || new Date().toISOString();
        hourlyValidity.value = respData.hourlyValidity || '0';
        orderDetails.value = existingDraft.orderDetails || respData.orderDetails || [];
      }

      toast.add({ severity: 'info', summary: 'Khôi phục', detail: 'Đã tải lại dữ liệu đã lưu', life: 3000 });
    } else {
      const { data } = await workOrder.getWorkOrder(id, 3);
      if (data?.success) {
        const respData = data.data;
        startDate.value = respData.startDate || new Date().toISOString();
        endDate.value = respData.endDate || new Date().toISOString();
        hourlyValidity.value = respData.hourlyValidity || '0';

        headerInfo.value = {
          orderNo: respData.workOrderMasterName || '',
          glue: respData.chemicalMasterName || '',
          totalWeight: respData.workOrderWeight?.toString() || ''
        };

        orderDetails.value = respData.orderDetails || [];

        noMixChemicalsFull.value = (respData.mixChemicals || []).map((item: any) => ({
          factoryId: item.factoryId,
          factoryName: item.factoryName,
          styleName: item.styleName,
          materialCode: item.materialCode || '0',
          materialName: item.materialName,
          weightUnit: item.weightUnit || 'Kg',
          requiredWeight: item.requiredWeight || '',
          actualWeight: item.actualWeight || '',
          lowerTolerance: item.lowerTolerance || '0',
          upperTolerance: item.upperTolerance || '0',
          mixingRatio: item.mixingRatio || '100',
          glueExtra: item.glueExtra || false
        }));

        noMixComponents.value = respData.noMixChemicals || [];

        if (noMixComponents.value.length > 0) {
          selectedItem.value = noMixComponents.value[0];
          activeComponent.value = { ...noMixComponents.value[0] };
          activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
          mixingProcess.value.styleName = noMixComponents.value[0].styleName || '';
          mixingProcess.value.component = noMixComponents.value[0].materialName || '';
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu đơn hàng', life: 3000 });
  } finally {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
    await nextTick();
    isDirty.value = false;
  }
};

// ============================================================================
// PAYLOAD & LƯU HOÀN THÀNH
// ============================================================================
const buildPayload = (recordStatus: string) => {
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';

  const requestDetailIds = orderDetails.value
    .map(item => item.requestDetailId)
    .filter(Boolean);

  // Payload Bảng 1
  const baseRePackingGlues = orderDetails.value.map(item => ({
    requestDetailId: item.requestDetailId || '',
    glueId: item.chemicalMasterId || '',
    bucketId: item.selectedBucketId || '',
    recordStatus: recordStatus,
    confirmDate: item.confirmDate || new Date().toISOString()
  }));

  // Payload Chiết thùng
  const chietRePackingGlues = extraChietList.value.map(item => ({
    requestDetailId: item.requestDetailId,
    glueId: item.glueId,
    bucketId: item.bucketId,
    recordStatus: recordStatus,
    confirmDate: item.confirmDate || new Date().toISOString()
  }));

  const finalRePackingGlues = [...baseRePackingGlues, ...chietRePackingGlues];

  // Payload Bảng 2
  const finalNoRePackingGlues = noMixComponents.value
    .filter(item => item.actualWeight && Number(item.actualWeight) > 0)
    .map(item => ({
      materialCode: item.materialCode || '',
      glueWeight: Number(item.actualWeight) || 0,
      glueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: !!item.glueExtra,
      recordStatus: item.recordStatus ? item.recordStatus : recordStatus,
      confirmDate: item.confirmDate || new Date().toISOString()
    }));

  return {
    factoryId: factoryId,
    workOrderMasterId: currentWorkOrderId.value,
    startDate: startDate.value,
    endDate: endDate.value,
    createrId: employeeId,
    updaterId: employeeId,
    requestDetailIds: requestDetailIds,
    rePackingGlues: finalRePackingGlues,
    noRePackingGlues: finalNoRePackingGlues
  };
};

const handleSaveDraft = async () => {
  // const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  // if (isIncomplete) return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });

  try {
    draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      noMixChemicalsFull: noMixChemicalsFull.value,
      noMixComponents: noMixComponents.value,
      orderDetails: orderDetails.value,
      extraChietList: extraChietList.value
    });

    const payload = buildPayload("0");
    console.log("Save Draft Payload:", payload);
    await rePackingGlue.postRePackingGlueCommand(payload);

    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu bản nháp', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu bản nháp', life: 3000 });
  }
};

const handleComplete = async () => {
  // const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  // if (isIncomplete) {
  //   return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });
  // }

  try {
    const payload = buildPayload("1");
    await rePackingGlue.postRePackingGlueCommand(payload);
    console.log("Save Draft Payload:", payload);

    // Chặn mọi tác vụ lưu nháp khi đang thoát
    isNavigatingAway.value = true;

    // Xóa draft và điều hướng
    draftStore.clearDraft(currentWorkOrderId.value);
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu thành công', life: 3000 });
    // router.push('/list-repacking-mixed-glue-management');
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận hoàn thành', life: 3000 });
  }
};

// ============================================================================
// CÂN & XỬ LÝ TABLE
// ============================================================================
const onRowClick = (event: { data: any }) => {
  if (isLoadingComponent.value || !event.data?.materialName) return;

  mixingProcess.value.styleName = event.data.styleName || '';
  mixingProcess.value.component = event.data.materialName || '';

  const rowIndex = noMixComponents.value.findIndex(item => item === event.data);
  activeComponent.value = { ...event.data };

  if (rowIndex === 0) activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const handleConfirmWeight = (actualWeight: string) => {
  if (!activeComponent.value) return;

  const index = noMixComponents.value.findIndex(item => item.materialName === activeComponent.value?.materialName);

  if (index !== -1) {
    const now = new Date().toISOString();
    noMixComponents.value[index].actualWeight = actualWeight;
    noMixComponents.value[index].operator = authStore.user?.employeeName || 'Chưa xác định';
    noMixComponents.value[index].weighingTime = format.formatDate(new Date().toISOString());
    noMixComponents.value[index].confirmDate = now;

    const baseItem = noMixComponents.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || '0');
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');

    if (baseActualWeight > 0) {
      noMixComponents.value.forEach((item, i) => {
        if (i !== 0) {
          const currentRatio = Number(item.mixingRatio || '0');
          item.requiredWeight = ((currentRatio * baseActualWeight) / baseMixingRatio).toFixed(3);
        }
      });
    }

    activeComponent.value = { ...noMixComponents.value[index] };

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialName === activeComponent.value?.materialName);
    if (fullIndex !== -1) {
      noMixChemicalsFull.value[fullIndex].actualWeight = actualWeight;
      noMixChemicalsFull.value[fullIndex].weighingTime = noMixComponents.value[index].weighingTime;
      noMixChemicalsFull.value[fullIndex].confirmDate = now;
    }
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// MODAL & MATERIALS LOGIC
// ============================================================================
const handleSaveNewComponent = (newComponentData: { name: string, percentage: string, materialCode: string, weightUnit: string }) => {
  const baseItem = noMixChemicalsFull.value[0];
  const baseActualWeight = Number(baseItem?.actualWeight || '0');
  const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
  const calculatedReqWeight = (parseInt(newComponentData.percentage) * baseActualWeight) / baseMixingRatio;

  const newComponent = {
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit: newComponentData.weightUnit,
    requiredWeight: calculatedReqWeight.toFixed(3),
    actualWeight: '2',
    operator: '',
    weighingTime: '',
    lowerTolerance: '0',
    upperTolerance: '0',
    mixingRatio: newComponentData.percentage.toString(),
    glueExtra: true,
    factoryName: noMixChemicalsFull.value[0]?.factoryName,
    styleName: noMixChemicalsFull.value[0]?.styleName,
    factoryId: authStore.user?.factoryId || ''
  };

  noMixChemicalsFull.value.push(newComponent);
  noMixComponents.value.push(newComponent);

  draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });

  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm thành phần mới', life: 3000 });
};

const handleDeleteComponent = async (rowToDelete: any) => {
  await UI.Confirm(
    'Xác nhận xóa',
    `Thành phần: ${rowToDelete.materialName}`,
    `Bạn có chắc chắn muốn xóa thành phần này?`,
    () => {
      // 1. Xóa khỏi mảng dữ liệu gốc
      noMixChemicalsFull.value = noMixChemicalsFull.value.filter(
        item => item.materialCode !== rowToDelete.materialCode
      );

      // 2. Xóa khỏi mảng đang hiển thị trên Table
      noMixComponents.value = noMixComponents.value.filter(
        item => item.materialCode !== rowToDelete.materialCode
      );

      // 3. QUAN TRỌNG: Dọn dẹp luôn các record chiết thùng liên quan đến mã keo này
      extraChietList.value = extraChietList.value.filter(
        item => item.glueId !== rowToDelete.materialCode
      );

      // 4. Cập nhật lại bản nháp (Đảm bảo lưu kèm extraChietList đã update)
      draftStore.saveDraft(currentWorkOrderId.value, {
        headerInfo: headerInfo.value,
        noMixChemicalsFull: noMixChemicalsFull.value,
        noMixComponents: noMixComponents.value,
        orderDetails: orderDetails.value,
        extraChietList: extraChietList.value
      });

      toast.add({ severity: 'success', summary: 'Đã xóa', detail: `Xóa thành phần thành công`, life: 3000 });
    },
    undefined,
    'custom-error-alert'
  );
};

const fetchMaterials = async () => {
  isLoadingMaterials.value = true;
  try {
    const { data } = await materialApi.postMaterial({ factoryId: authStore.user?.factoryId || '' });
    if (data?.success) {
      const existingCodes = noMixChemicalsFull.value.map(item => String(item.materialCode));
      materialsList.value = (data.data || []).filter((item: any) => !existingCodes.includes(String(item.materialCode)));
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thành phần', life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
};

const saveDraftToStoreOnly = () => {
  if (isNavigatingAway.value) return;

  draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });
};

// ============================================================================
// XỬ LÝ MODAL CHIẾT KEO
// ============================================================================
const handleChietRow = (rowData: any) => {
  isViewMode.value = false; // Mở modal ở chế độ thao tác
  currentChietChemical.value = rowData;
  chietOrderDetails.value = orderDetails.value.map(item => ({
    ...item,
    chemicalId: rowData.materialCode,
    selectedBucketId: null
  }));
  chietDialog.value = true;
};

const handleChietUpdateBucket = () => {
  console.log('Đã cập nhật thùng trong modal chiết', chietOrderDetails.value);
};

// ============================================================================
// XỬ LÝ MODAL CHIẾT KEO
// ============================================================================
const handleViewRow = (rowData: any) => {
  isViewMode.value = true; // Mở modal ở chế độ CHỈ XEM
  currentChietChemical.value = rowData;

  const savedData = extraChietList.value.filter(item => item.glueId === rowData.materialCode);

  chietOrderDetails.value = orderDetails.value.map(item => {
    const match = savedData.find(s => s._sourceLineId === item.requestDetailId);
    return {
      ...item,
      chemicalId: rowData.materialCode,
      selectedBucketId: match ? match.bucketId : null
    };
  });

  chietDialog.value = true;
};

const confirmChiet = () => {
  // 1. Dọn dẹp data cũ
  extraChietList.value = extraChietList.value.filter(
    item => item.glueId !== currentChietChemical.value?.materialCode
  );

  const now = new Date().toISOString();

  // 2. Thêm data mới
  chietOrderDetails.value.forEach(item => {
    if (item.selectedBucketId) {
      extraChietList.value.push({
        requestDetailId: item.requestDetailId,
        glueId: item.chemicalId || '',
        bucketId: item.selectedBucketId,
        _sourceLineId: item.requestDetailId,
        confirmDate: item.confirmDate || now
      });
    }
  });

  // 3. Đánh dấu trạng thái ĐÃ CHIẾT bằng cờ UI (không đụng tới recordStatus)
  if (currentChietChemical.value?.materialCode) {
    const targetCode = currentChietChemical.value.materialCode;

    const index = noMixComponents.value.findIndex(item => item.materialCode === targetCode);
    if (index !== -1) noMixComponents.value[index].isChietCompleted = true;

    const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialCode === targetCode);
    if (fullIndex !== -1) noMixChemicalsFull.value[fullIndex].isChietCompleted = true;
  }

  // 4. Lưu vào draft store (Bao gồm cờ isChietCompleted)
  draftStore.saveDraft(currentWorkOrderId.value, {
    headerInfo: headerInfo.value,
    noMixChemicalsFull: noMixChemicalsFull.value,
    noMixComponents: noMixComponents.value,
    orderDetails: orderDetails.value,
    extraChietList: extraChietList.value
  });

  toast.add({ severity: 'success', summary: 'Đã lưu chiết', detail: 'Thông tin chiết thùng được tạm lưu', life: 3000 });
  chietDialog.value = false;
};

// const confirmChiet = () => {
//   // 1. Dọn dẹp data cũ của mã keo này trong danh sách chiết
//   extraChietList.value = extraChietList.value.filter(
//     item => item.glueId !== currentChietChemical.value?.materialCode
//   );

//   // 2. Thêm data mới vừa confirm vào mảng chiết
//   chietOrderDetails.value.forEach(item => {
//     if (item.selectedBucketId) {
//       extraChietList.value.push({
//         requestDetailId: item.requestDetailId,
//         glueId: item.chemicalId || '',
//         bucketId: item.selectedBucketId,
//         _sourceLineId: item.requestDetailId
//       });
//     }
//   });

//   // 3. CHỈ ĐÁNH DẤU, KHÔNG XÓA DATA
//   if (currentChietChemical.value?.materialCode) {
//     const targetCode = currentChietChemical.value.materialCode;

//     const index = noMixComponents.value.findIndex(item => item.materialCode === targetCode);
//     if (index !== -1) noMixComponents.value[index].recordStatus = 'X';

//     const fullIndex = noMixChemicalsFull.value.findIndex(item => item.materialCode === targetCode);
//     if (fullIndex !== -1) noMixChemicalsFull.value[fullIndex].recordStatus = 'X';
//   }

//   // 4. Lưu toàn bộ data (bao gồm cả dòng đã đánh dấu 'X') vào store
//   draftStore.saveDraft(currentWorkOrderId.value, {
//     headerInfo: headerInfo.value,
//     noMixChemicalsFull: noMixChemicalsFull.value,
//     noMixComponents: noMixComponents.value,
//     orderDetails: orderDetails.value,
//     extraChietList: extraChietList.value
//   });

//   toast.add({ severity: 'success', summary: 'Đã lưu chiết', detail: 'Thành phần đã được chuyển sang danh sách chiết', life: 3000 });
//   chietDialog.value = false;
// };

// ============================================================================
// UI, SCROLL & NAVIGATION GUARDS
// ============================================================================
const handleScroll = (event: CustomEvent) => showScrollButton.value = event.detail.scrollTop > 100;
const scrollToTop = () => contentRef.value?.$el?.scrollToTop(500);

// ============================================================================
// ĐIỀU HƯỚNG VÀ CẢNH BÁO THOÁT
// ============================================================================
const goBack = async () => {
  // Kiểm tra trực tiếp khi bấm nút Back trên UI
  if (isDirty.value) {
    const canLeave = await alertKhongChoPhepThoat();
    if (canLeave) {
      router.back(); // Nếu đồng ý thoát, mới gọi router.back()
    }
  } else {
    router.back(); // Nếu chưa thay đổi gì thì cho thoát luôn
  }
};

const alertKhongChoPhepThoat = (): Promise<boolean> => {
  return new Promise(async (resolve) => {
    const alert = await alertController.create({
      header: 'Cảnh báo chưa lưu',
      message: 'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn thoát? Dữ liệu đang cân sẽ bị mất.',
      buttons: [
        { text: 'Ở lại', role: 'cancel', handler: () => resolve(false) },
        {
          text: 'Thoát', role: 'confirm', cssClass: 'text-red-500', handler: () => {
            isNavigatingAway.value = true;
            draftStore.clearDraft(currentWorkOrderId.value);
            isDirty.value = false;
            resolve(true);
          }
        }
      ]
    });
    await alert.present();
  });
};

// Vẫn giữ lại cho nút Back cứng của Android (Hardware back button)
useBackButton(10, (processNextHandler) => {
  if (isDirty.value) {
    alertKhongChoPhepThoat().then(canLeave => {
      if (canLeave) processNextHandler();
    });
  } else {
    processNextHandler();
  }
});

// Vẫn giữ lại đề phòng user vuốt (swipe) để back hoặc dùng phím back trình duyệt
onBeforeRouteLeave(async (to, from) => {
  if (isDirty.value) {
    const canLeave = await alertKhongChoPhepThoat();
    return canLeave;
  }
  return true;
});

onIonViewDidEnter(async () => {
  await nextTick();
  // table2Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

onIonViewWillEnter(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped>
ion-segment-view {
  height: 150px;
  width: auto;
}

ion-segment {
  height: 50px;
}

ion-segment-button {
  width: auto;
}

ion-segment-content {
  display: flex;
  align-items: center;
  justify-content: center;
}

ion-segment-content:nth-of-type(1) {
  background: lightpink;
}

ion-segment-content:nth-of-type(2) {
  background: lightblue;
}

ion-segment-content:nth-of-type(3) {
  background: lightgreen;
}
</style>