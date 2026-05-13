<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
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
          <div
            class="flex flex-wrap align-items-center justify-content-between border-bottom-1 surface-border pb-3 mb-3">
            <user-avatar />
            <div class="flex gap-2">
              <Button label="Lưu" icon="pi pi-save" outlined size="large" @click="handleSaveDraft" />
              <Button label="Xác nhận hoàn thành" icon="pi pi-check-circle" severity="success" size="large"
                @click="handleComplete" />
            </div>
          </div>

          <div class="grid formgrid p-fluid">
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
        </div>

        <!-- BẢNG 1 -->
        <div class="surface-card p-0 shadow-1 mt-4 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thùng keo trộn
            </span>
          </div>
          <RepackingGlue :is-loading="isLoadingLine" :order-details="orderDetails" />
        </div>

        <!-- BẢNG 2 -->
        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
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

              <ElectronicScale :target-weight="activeComponent?.requiredWeight ?? 0"
                :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                :upper-tolerance="activeComponent?.upperTolerance ?? ''" @update:weight="handleWeightChange"
                @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <div ref="table2Ref" class="table-wrapper">
              <NoRePackingGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent" />
            </div>

            <!-- MODAL THÊM THÀNH PHẦN -->
            <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
              :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
              @save="handleSaveNewComponent" />
          </div>
        </div>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref, nextTick, watch } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import { IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, onIonViewDidEnter, useBackButton, alertController } from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import format from '@/mixins/format';

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import mixGlueApi from '@/api/mixGlue';

import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import AddComponentDialog from '@/views/Tablet/RePacking/components/AddComponentDialog.vue';
import RepackingGlue from '@/views/Tablet/RePacking/components/RepackingGlue.vue';
import NoRePackingGlue from '@/views/Tablet/RePacking/components/NoRePackingGlue.vue';

dayjs.extend(customParseFormat);
const VI_FORMATS = ["DD/MM/YYYY, HH:mm:ss", "DD/MM/YYYY HH:mm:ss", "DD/MM/YYYY"];

// ============================================================================
// 1. INTERFACES & TYPES
// ============================================================================
interface OrderDetails {
  workOrderDetailId?: string;
  factoryName?: string;
  workOrderMasterName?: string;
  requestDetailName?: string;
  styleName?: string;
  requestTime?: string;
  operator?: string;
  selectedBucket?: any;
}

interface ChemicalComponent {
  factoryId?: string;
  factoryName?: string;
  styleName?: string;
  materialCode?: string;
  materialName?: string;
  weightUnit?: string;
  actualWeight?: string;
  requiredWeight?: string | number;
  operator?: string;
  weighingTime?: string;
  lowerTolerance?: string | number;
  upperTolerance?: string | number;
  mixingRatio?: string | number;
  glueExtra?: boolean;
}

// ============================================================================
// 2. GLOBAL SETUP & REFS
// ============================================================================
const toast = useToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false);

const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const orderDetails = ref<OrderDetails[]>([]);
const noMixChemicalsFull = ref<ChemicalComponent[]>([]);
const noMixComponents = ref<ChemicalComponent[]>([]);
const selectedItem = ref<ChemicalComponent | null>(null);
const activeComponent = ref<ChemicalComponent | null>(null);
const mixingProcess = ref({ component: '', weight: '', styleName: '' });

const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);
const hourlyValidity = ref<string>('0');

const contentRef = ref<any>(null);
const table2Ref = ref<HTMLDivElement | null>(null);
const showScrollButton = ref(false);
const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);

watch(noMixChemicalsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

// ============================================================================
// 3. FETCH DATA & MAPPING
// ============================================================================
const fetchWorkOrderDetail = async (id: string) => {
  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  try {
    const existingDraft = draftStore.getDraft(id);

    if (existingDraft && existingDraft.noMixChemicalsFull?.length > 0) {
      headerInfo.value = existingDraft.headerInfo;
      noMixChemicalsFull.value = existingDraft.noMixChemicalsFull;

      selectedItem.value = noMixChemicalsFull.value[0];
      activeComponent.value = { ...noMixChemicalsFull.value[0] };
      mixingProcess.value.styleName = noMixChemicalsFull.value[0].styleName || '';
      mixingProcess.value.component = noMixChemicalsFull.value[0].materialName || '';

      const { data } = await workOrder.getWorkOrder(id, 1);
      if (data?.success) {
        orderDetails.value = existingDraft.orderDetails || data.data.orderDetails || [];
        hourlyValidity.value = data.data.hourlyValidity || '0';
        noMixComponents.value = data.data.noMixChemicals || [];
      }

      toast.add({ severity: 'info', summary: 'Khôi phục', detail: 'Đã tải lại dữ liệu đã lưu', life: 3000 });
    } else {
      const { data } = await workOrder.getWorkOrder(id, 3);
      if (data?.success) {
        const respData = data.data;

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

        if (noMixChemicalsFull.value.length > 0) {
          noMixChemicalsFull.value[0].requiredWeight = headerInfo.value.totalWeight;
          activeComponent.value = { ...noMixChemicalsFull.value[0] };
          mixingProcess.value.styleName = noMixComponents.value[0]?.styleName || noMixChemicalsFull.value[0]?.styleName || '';
          mixingProcess.value.component = noMixChemicalsFull.value[0]?.materialName || '';
          selectedItem.value = noMixChemicalsFull.value[0];
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
// 4. LƯU & XÁC NHẬN HOÀN THÀNH
// ============================================================================
const buildPayload = (recordStatus: string) => {
  const factoryId = authStore.user?.factoryId || '';
  const employeeId = authStore.user?.employeeId || '';

  return {
    factoryId: factoryId,
    workOrderMasterId: currentWorkOrderId.value,
    recordStatus: recordStatus,
    hourlyValidity: Number(hourlyValidity.value),
    createrId: employeeId,
    updaterId: employeeId,
    mixGlues: noMixChemicalsFull.value.map(item => ({
      factoryId: factoryId,
      materialCode: item.materialCode || 0,
      mixGlueWeight: Number(item.actualWeight) || 0,
      mixGlueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: item.glueExtra || false,
      recordStatus: recordStatus,
      createrId: employeeId,
      updaterId: employeeId,
      weightCompleteDate: item.weighingTime ? dayjs(item.weighingTime, VI_FORMATS).toISOString() : null
    })),
    orderDetails: orderDetails.value.map(item => ({
      workOrderDetailId: item.workOrderDetailId,
      bucketId: item.selectedBucket ? item.selectedBucket.bucketId : null,
    }))
  };
};

const handleSaveDraft = async () => {
  const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  if (isIncomplete) {
    return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });
  }

  try {
    draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      noMixChemicalsFull: noMixChemicalsFull.value,
      orderDetails: orderDetails.value
    });

    await mixGlueApi.postMixGlueCommand(buildPayload("0"));
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu bản nháp lên server', life: 3000 });
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu bản nháp', life: 3000 });
  }
};

const handleComplete = async () => {
  const isIncomplete = noMixChemicalsFull.value.some(item => !item.actualWeight || Number(item.actualWeight) <= 0);
  if (isIncomplete) {
    return toast.add({ severity: 'warn', summary: 'Cảnh báo', detail: 'Vui lòng thực hiện cân đầy đủ!', life: 4000 });
  }

  try {
    await mixGlueApi.postMixGlueCommand(buildPayload("1"));
    draftStore.clearDraft(currentWorkOrderId.value);
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu thành công', life: 3000 });
    router.push('/list-mix-glue');
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận hoàn thành', life: 3000 });
  }
};

// ============================================================================
// 5. CÂN & XỬ LÝ TABLE
// ============================================================================
const onRowClick = (event: { data: ChemicalComponent }) => {
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

  const index = noMixChemicalsFull.value.findIndex(item => item.materialName === activeComponent.value?.materialName);
  if (index !== -1) {
    noMixChemicalsFull.value[index].actualWeight = actualWeight;
    noMixChemicalsFull.value[index].operator = authStore.user?.employeeName || 'Chưa xác định';
    noMixChemicalsFull.value[index].weighingTime = format.formatDate(new Date().toISOString());

    const baseItem = noMixChemicalsFull.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || '0');
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');

    if (baseActualWeight > 0) {
      noMixChemicalsFull.value.forEach((item, i) => {
        if (i !== 0) {
          const currentRatio = Number(item.mixingRatio || '0');
          item.requiredWeight = ((currentRatio * baseActualWeight) / baseMixingRatio).toFixed(3);
        }
      });
    }
    activeComponent.value = { ...noMixChemicalsFull.value[index] };
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// 6. MODAL & MATERIALS LOGIC
// ============================================================================
const handleSaveNewComponent = (newComponentData: { name: string, percentage: string, materialCode: string, weightUnit: string }) => {
  const baseItem = noMixChemicalsFull.value[0];
  const baseActualWeight = Number(baseItem?.actualWeight || '0');
  const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
  const calculatedReqWeight = (parseInt(newComponentData.percentage) * baseActualWeight) / baseMixingRatio;

  noMixChemicalsFull.value.push({
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit: newComponentData.weightUnit,
    requiredWeight: calculatedReqWeight.toFixed(3),
    actualWeight: '',
    operator: '',
    weighingTime: '',
    lowerTolerance: '0',
    upperTolerance: '0',
    mixingRatio: newComponentData.percentage.toString(),
    glueExtra: true,
    factoryId: authStore.user?.factoryId || ''
  });
};

const handleDeleteComponent = async (rowToDelete: ChemicalComponent) => {
  await UI.Confirm('Xác nhận xóa', `Thành phần: ${rowToDelete.materialName}`, `Bạn có chắc chắn muốn xóa thành phần này?`, () => {
    noMixChemicalsFull.value = noMixChemicalsFull.value.filter(item => item !== rowToDelete);
    draftStore.saveDraft(currentWorkOrderId.value, { headerInfo: headerInfo.value, noMixChemicalsFull: noMixChemicalsFull.value, orderDetails: orderDetails.value });
    toast.add({ severity: 'success', summary: 'Đã xóa', detail: `Xóa thành phần thành công`, life: 3000 });
  }, undefined, 'custom-error-alert');
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

// ============================================================================
// 7. UI, SCROLL & NAVIGATION GUARDS
// ============================================================================
const handleScroll = (event: CustomEvent) => showScrollButton.value = event.detail.scrollTop > 100;
const scrollToTop = () => contentRef.value?.$el?.scrollToTop(500);
const goBack = () => router.back();

const alertKhongChoPhepThoat = async (nextFunction?: any) => {
  const alert = await alertController.create({
    header: 'Cảnh báo chưa lưu',
    message: 'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn thoát? Dữ liệu đang cân sẽ bị mất.',
    buttons: [
      { text: 'Ở lại', role: 'cancel', handler: () => nextFunction && nextFunction(false) },
      {
        text: 'Thoát', role: 'confirm', cssClass: 'text-red-500', handler: () => {
          draftStore.clearDraft(currentWorkOrderId.value);
          isDirty.value = false;
          nextFunction ? nextFunction() : router.back();
        }
      }
    ]
  });
  await alert.present();
};

useBackButton(10, (processNextHandler) => isDirty.value ? alertKhongChoPhepThoat() : processNextHandler());
onBeforeRouteLeave((to, from, next) => isDirty.value ? alertKhongChoPhepThoat(next) : next());

onIonViewDidEnter(async () => {
  await nextTick();
  table2Ref.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
});

onMounted(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) fetchWorkOrderDetail(workOrderMasterId);
  else { isLoadingLine.value = false; isLoadingComponent.value = false; }
});
</script>