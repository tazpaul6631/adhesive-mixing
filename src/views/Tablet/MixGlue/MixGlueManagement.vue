<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Mix Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <Toast position="top-right" />

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="flex flex-wrap align-items-center justify-content-between">
            <!-- <user-avatar /> -->
            <div v-show="hidenTable1" class="grid formgrid p-fluid flex">
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
              <Button :icon="hidenTable1 ? 'pi pi-eye' : 'pi pi-eye-slash'" outlined size="large"
                @click="handleHidenTable1" />
              <Button icon="pi pi-save" outlined size="large" @click="handleSaveDraft" />
              <Button icon="pi pi-check-circle" severity="success" size="large" @click="handleComplete" />
            </div>
          </div>

          <!-- <div v-show="hidenTable1" class="grid formgrid p-fluid">
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
          </div> -->
        </div>

        <!-- BẢNG 1 -->
        <transition name="slide-fade">
          <div v-show="hidenTable1" class="surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl">
              <span class="font-bold text-700 text-lg"><i class="pi pi-list mr-2"></i>Chi tiết dây chuyền</span>
            </div>
            <LineDetailsTable :is-loading="isLoadingLine" :line-details="lineDetails" />
          </div>
        </transition>

        <!-- BẢNG 2 -->
        <transition name="slide-fade">
          <div class="surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
              <span class="font-bold text-700 text-lg">
                <i class="pi pi-box mr-2"></i>Thành phần trộn keo
              </span>
            </div>

            <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
              <div class="grid formgrid align-items-end">
                <div class="col-12 sm:col-5 lg:col-6 lg:mb-0">
                  <label class="text-800 font-medium mb-2 block">Mã thành phần</label>
                  <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                    style="width: 350px;" />
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
                <MixingComponentsTable :is-loading="isLoadingComponent" :components="componentDetailsFull"
                  :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                  @row-click="onRowClick" @open-new="productDialog = true" @delete-row="handleDeleteComponent" />
              </div>

              <!-- MODAL THÊM THÀNH PHẦN -->
              <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
                :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
                @save="handleSaveNewComponent" />
            </div>
          </div>
        </transition>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from 'vue';
import { useRoute, onBeforeRouteLeave, useRouter } from 'vue-router';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, onIonViewDidEnter, useBackButton, alertController,
  onIonViewWillEnter
} from '@ionic/vue';
import { useToast } from 'primevue/usetoast';
import UI from '@/mixins/present';
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";

dayjs.extend(customParseFormat);

const VI_FORMATS = [
  "DD/MM/YYYY, HH:mm:ss",
  "DD/MM/YYYY HH:mm:ss",
  "DD/MM/YYYY"
];

import { useAuthStore } from '@/store/auth';
import { useMixGlueDraftStore } from '@/store/mixGlueDraft';
import workOrder from '@/api/workOrder';
import materialApi from '@/api/material';
import mixGlueApi from '@/api/mixGlue';

import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import format from '@/mixins/format';
import LineDetailsTable from '@/views/Tablet/MixGlue/components/LineDetailsTable.vue';
import MixingComponentsTable from '@/views/Tablet/MixGlue/components/MixingComponentsTable.vue';
import AddComponentDialog from '@/views/Tablet/MixGlue/components/AddComponentDialog.vue';

// ============================================================================
// 1. INTERFACES & TYPES (Updated to match the new JSON structure)
// ============================================================================
interface LineDetail {
  factoryId?: string;
  workOrderDetailId?: string;
  workOrderMasterId?: string;
  workOrderMasterName?: string;
  requestDetailId?: string;
  requestDetailName?: string;
  chemicalMasterId?: string;
  workOrderWeight?: string;
  workOrderWeightUnit?: string;
  requestTime?: string;
  styleId?: string;
  styleName?: string;
  productLineId?: string;
  productLineName?: string;
}

interface ComponentDetail {
  glueExtra?: boolean;
  mixGlue?: boolean;
  noMixGlue?: boolean;
  factoryId?: string;
  styleChemicalId?: string;
  chemicalId?: string;
  styleId?: string;
  styleName?: string;
  chemicalMasterId?: string;
  chemicalCompositionId?: string;
  mixingRatio?: string;
  lowerTolerance?: string;
  upperTolerance?: string;
  materialCode?: string;
  materialName?: string;
  weightUnit?: string;
  requiredWeight?: string;
  actualWeight?: string;
  operator?: string;
  weighingTime?: string;
}

const selectedItem = ref<ComponentDetail | null>(null);

// ============================================================================
// 2. GLOBAL SETUP & REFS CHUNG
// ============================================================================
const toast = useToast();
const authStore = useAuthStore();
const draftStore = useMixGlueDraftStore();
const route = useRoute();
const router = useRouter();

const currentWorkOrderId = ref('');
const isDirty = ref(false);

// ============================================================================
// 3. LOGIC LẤY & LƯU DỮ LIỆU ĐƠN HÀNG (WORK ORDER)
// ============================================================================
const headerInfo = ref({ orderNo: '', glue: '', totalWeight: '' });
const lineDetails = ref<LineDetail[]>([]);
const componentDetailsFull = ref<ComponentDetail[]>([]);
const noMixComponents = ref<ComponentDetail[]>([]);
const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);
const hourlyValidity = ref<string>('0');
const hidenTable1 = ref(false);

watch(componentDetailsFull, () => {
  if (!isLoadingComponent.value) isDirty.value = true;
}, { deep: true });

const fetchWorkOrderDetail = async (id: string) => {
  resetState();

  isLoadingLine.value = true;
  isLoadingComponent.value = true;
  currentWorkOrderId.value = id;

  try {
    // 1. Kiểm tra xem có bản nháp trong Pinia store không
    const existingDraft = draftStore.getDraft(id);

    if (existingDraft && existingDraft.componentDetailsFull?.length > 0) {
      // 2. NẾU CÓ DRAFT: Khôi phục dữ liệu từ Draft
      headerInfo.value = existingDraft.headerInfo;
      componentDetailsFull.value = existingDraft.componentDetailsFull;

      selectedItem.value = componentDetailsFull.value[0];
      activeComponent.value = { ...componentDetailsFull.value[0] };
      mixingProcess.value.component = componentDetailsFull.value[0].materialName || '';

      const { data } = await workOrder.getWorkOrder(id, 1);
      if (data?.success) {
        lineDetails.value = data.data.orderDetails || [];
        hourlyValidity.value = data.data.hourlyValidity || '0';
      }

      toast.add({
        severity: 'info',
        summary: 'Khôi phục',
        detail: 'Đã tải lại dữ liệu đã lưu',
        life: 3000
      });
    } else {
      // 3. NẾU KHÔNG CÓ DRAFT: Chạy logic lấy API như cũ
      const { data } = await workOrder.getWorkOrder(id, 1);
      if (data?.success) {
        const respData = data.data;

        hourlyValidity.value = respData.hourlyValidity || '0';

        headerInfo.value = {
          orderNo: respData.workOrderMasterName || '',
          glue: respData.chemicalMasterName || '',
          totalWeight: respData.workOrderWeight?.toString() || ''
        };

        lineDetails.value = respData.orderDetails || [];

        componentDetailsFull.value = (respData.mixChemicals || []).map((item: any) => ({
          ...item,
          materialCode: item.materialCode || '0',
          weightUnit: item.weightUnit || 'Kg',
          requiredWeight: item.requiredWeight || '',
          actualWeight: item.actualWeight || '',
          lowerTolerance: item.lowerTolerance || '0',
          upperTolerance: item.upperTolerance || '0',
          mixingRatio: item.mixingRatio || '100',
          glueExtra: item.glueExtra || false
        }));

        noMixComponents.value = (respData.noMixChemicals || []).map((item: any) => ({ ...item }));

        if (componentDetailsFull.value.length > 0) {
          componentDetailsFull.value[0].requiredWeight = headerInfo.value.totalWeight;
          activeComponent.value = { ...componentDetailsFull.value[0] };
          mixingProcess.value.component = componentDetailsFull.value[0].materialName || '';
          selectedItem.value = componentDetailsFull.value[0];
        }
      }
    }
  } catch (error) {
    console.error('Lỗi khi tải dữ liệu chi tiết:', error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải dữ liệu đơn hàng', life: 3000 });
  } finally {
    await finalizeLoading();
  }
};

const finalizeLoading = async () => {
  isLoadingLine.value = false;
  isLoadingComponent.value = false;
  await nextTick();
  isDirty.value = false;
};

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
    mixGlues: componentDetailsFull.value.map(item => ({
      factoryId: factoryId,
      materialCode: item.materialCode || 0,
      mixGlueWeight: Number(item.actualWeight) || 0,
      mixGlueWeightUnit: item.weightUnit || 'Kg',
      glueExtra: item.glueExtra || false,
      recordStatus: recordStatus,
      createrId: employeeId,
      updaterId: employeeId,
      weightCompleteDate: item.weighingTime ? dayjs(item.weighingTime, VI_FORMATS).toISOString() : null
    }))
  };
};

const handleHidenTable1 = () => {
  hidenTable1.value = !hidenTable1.value;
};

const handleSaveDraft = async () => {
  const isIncomplete = componentDetailsFull.value.some(
    item => !item.actualWeight || Number(item.actualWeight) <= 0
  );

  if (isIncomplete) {
    toast.add({
      severity: 'warn',
      summary: 'Cảnh báo',
      detail: 'Vui lòng thực hiện cân đầy đủ tất cả các thành phần trước khi xác nhận hoàn thành!',
      life: 4000
    });
    return;
  }

  try {
    draftStore.saveDraft(currentWorkOrderId.value, {
      headerInfo: headerInfo.value,
      componentDetailsFull: componentDetailsFull.value
    });

    const payload = buildPayload("0");
    await mixGlueApi.postMixGlueCommand(payload);

    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã lưu bản nháp lên server', life: 3000 });
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể lưu bản nháp', life: 3000 });
  }
};

const handleComplete = async () => {
  // 1. KIỂM TRA CÁC CỘT BẮT BUỘC 
  const isIncomplete = componentDetailsFull.value.some(
    item => !item.actualWeight || Number(item.actualWeight) <= 0
  );

  if (isIncomplete) {
    toast.add({
      severity: 'warn',
      summary: 'Cảnh báo',
      detail: 'Vui lòng thực hiện cân đầy đủ tất cả các thành phần trước khi xác nhận hoàn thành!',
      life: 4000
    });
    return;
  }

  // 2. GỬI API
  try {
    const payload = buildPayload("1");
    await mixGlueApi.postMixGlueCommand(payload);

    draftStore.clearDraft(currentWorkOrderId.value);
    isDirty.value = false;
    toast.add({ severity: 'success', summary: 'Hoàn thành', detail: 'Đã gửi dữ liệu thành công', life: 3000 });
    router.push('/list-mix-glue');
  } catch (error) {
    console.error(error);
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể xác nhận hoàn thành', life: 3000 });
  }
};

// ============================================================================
// 4. LOGIC CÂN & TÍNH TOÁN TỶ LỆ TRỘN
// ============================================================================
const mixingProcess = ref({ component: '', weight: '' });
const activeComponent = ref<ComponentDetail | null>(null);

const onRowClick = (event: { data: ComponentDetail }) => {
  if (isLoadingComponent.value || !event.data?.materialName) return;

  mixingProcess.value.component = event.data.materialName;
  const rowIndex = componentDetailsFull.value.findIndex(item => item === event.data);
  activeComponent.value = { ...event.data };

  if (rowIndex === 0) {
    activeComponent.value.requiredWeight = headerInfo.value.totalWeight;
  }
};

const handleWeightChange = (newWeight: string) => {
  mixingProcess.value.weight = newWeight;
};

const handleConfirmWeight = (actualWeight: string) => {
  if (!activeComponent.value) return;

  const index = componentDetailsFull.value.findIndex(
    item => item.materialName === activeComponent.value?.materialName
  );

  if (index !== -1) {
    componentDetailsFull.value[index].actualWeight = actualWeight;
    componentDetailsFull.value[index].operator = authStore.user?.employeeName || 'Chưa xác định';
    componentDetailsFull.value[index].weighingTime = format.formatDate(new Date().toISOString());

    const baseItem = componentDetailsFull.value[0];
    const baseActualWeight = Number(baseItem.actualWeight || '0');
    const baseMixingRatio = Number(baseItem.mixingRatio || '100');

    if (baseActualWeight > 0) {
      componentDetailsFull.value.forEach((item, i) => {
        if (i !== 0) {
          const currentRatio = Number(item.mixingRatio || '0');
          const newRequiredWeight = (currentRatio * baseActualWeight) / baseMixingRatio;
          item.requiredWeight = (newRequiredWeight.toFixed(3)) || '';
        }
      });
    }
    activeComponent.value = { ...componentDetailsFull.value[index] };
  }
};

const handleConnectionStatus = (status: boolean) => {
  console.log(status ? "Cân đã kết nối!" : "Mất kết nối với cân!");
};

// ============================================================================
// 5. LOGIC MODAL THÊM THÀNH PHẦN
// ============================================================================
const productDialog = ref(false);
const materialsList = ref<any[]>([]);
const isLoadingMaterials = ref(false);

const handleSaveNewComponent = (newComponentData: { name: string, percentage: string, materialCode: string, weightUnit: string }) => {
  const baseItem = componentDetailsFull.value[0];
  const baseActualWeight = Number(baseItem?.actualWeight || '0');
  const baseMixingRatio = Number(baseItem?.mixingRatio || '100');
  const calculatedRequiredWeight = (parseInt(newComponentData.percentage) * baseActualWeight) / baseMixingRatio;

  componentDetailsFull.value.push({
    materialName: newComponentData.name,
    materialCode: newComponentData.materialCode,
    weightUnit: newComponentData.weightUnit,
    requiredWeight: calculatedRequiredWeight.toFixed(3) ? '' : (calculatedRequiredWeight.toFixed(3)),
    actualWeight: '',
    operator: '',
    weighingTime: '',
    lowerTolerance: '',
    upperTolerance: '',
    mixingRatio: (newComponentData.percentage).toString(),
    glueExtra: true,
    mixGlue: true,
    noMixGlue: false,
    factoryId: authStore.user?.factoryId || ''
  });

  toast.add({ severity: 'success', summary: 'Thành công', detail: 'Đã thêm thành phần mới', life: 3000 });
};

const handleDeleteComponent = async (rowToDelete: ComponentDetail) => {
  await UI.Confirm(
    'Xác nhận xóa',
    `Thành phần: ${rowToDelete.materialName}`,
    `Bạn có chắc chắn muốn xóa thành phần này?`,
    () => {
      // 1. Xóa khỏi UI
      componentDetailsFull.value = componentDetailsFull.value.filter(
        item => item !== rowToDelete
      );

      // 2. Cập nhật lại bản nháp trong Store ngay lập tức
      draftStore.saveDraft(currentWorkOrderId.value, {
        headerInfo: headerInfo.value,
        componentDetailsFull: componentDetailsFull.value
      });

      toast.add({
        severity: 'success',
        summary: 'Đã xóa',
        detail: `Xóa thành phần thành công: ${rowToDelete.materialName}`,
        life: 3000
      });
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
      const existingCodes = componentDetailsFull.value.map(item => String(item.materialCode));

      materialsList.value = (data.data || []).filter(
        (item: any) => !existingCodes.includes(String(item.materialCode))
      );
    }
  } catch (error) {
    toast.add({ severity: 'error', summary: 'Lỗi', detail: 'Không thể tải thành phần', life: 3000 });
  } finally {
    isLoadingMaterials.value = false;
  }
};

// ============================================================================
// 6. UI & SCROLL CHUNKS
// ============================================================================
const contentRef = ref<any>(null);
const table2Ref = ref<HTMLDivElement | null>(null);
const showScrollButton = ref(false);

const handleScroll = (event: CustomEvent) => {
  showScrollButton.value = event.detail.scrollTop > 100;
};

const scrollToTop = () => {
  contentRef.value?.$el?.scrollToTop(500);
};

// ============================================================================
// 7. NAVIGATION & GUARDS (CHẶN THOÁT)
// ============================================================================
const goBack = () => router.back();

const alertKhongChoPhepThoat = async (nextFunction?: any) => {
  const alert = await alertController.create({
    header: 'Cảnh báo chưa lưu',
    message: 'Dữ liệu chưa được lưu. Bạn có chắc chắn muốn thoát? Dữ liệu đang cân sẽ bị mất.',
    buttons: [
      {
        text: 'Ở lại',
        role: 'cancel',
        handler: () => {
          if (nextFunction) nextFunction(false);
        }
      },
      {
        text: 'Thoát',
        role: 'confirm',
        cssClass: 'text-red-500',
        handler: () => {
          draftStore.clearDraft(currentWorkOrderId.value);
          isDirty.value = false;
          nextFunction ? nextFunction() : router.back();
        }
      }
    ]
  });

  await alert.present();
};

useBackButton(10, (processNextHandler) => {
  isDirty.value ? alertKhongChoPhepThoat() : processNextHandler();
});

onBeforeRouteLeave((to, from, next) => {
  isDirty.value ? alertKhongChoPhepThoat(next) : next();
});

// ============================================================================
// 8. LIFECYCLE HOOKS
// ============================================================================
const resetState = () => {
  headerInfo.value = { orderNo: '', glue: '', totalWeight: '' };
  lineDetails.value = [];
  componentDetailsFull.value = [];
  noMixComponents.value = [];
  activeComponent.value = null;
  selectedItem.value = null;
  mixingProcess.value = { component: '', weight: '' };
  isDirty.value = false;
};

onIonViewDidEnter(async () => {
  await nextTick();
  if (table2Ref.value) {
    table2Ref.value.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

onIonViewWillEnter(() => {
  const workOrderMasterId = route.query.workOrderMasterId as string;
  if (workOrderMasterId) {
    // Mỗi khi vào màn hình này, nó sẽ lấy ID mới từ route và fetch lại
    fetchWorkOrderDetail(workOrderMasterId);
  } else {
    isLoadingLine.value = false;
    isLoadingComponent.value = false;
  }
});
</script>

<style scoped>
/* Hiệu ứng transition cho bảng 1 */
.slide-fade-enter-active {
  transition: all 0.4s ease-in-out;
}

.slide-fade-leave-active {
  transition: all 0.2s cubic-bezier(1, 0.5, 0.8, 1);
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-15px);
  opacity: 0;
}
</style>