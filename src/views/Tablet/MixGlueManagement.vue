<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>Mix Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding" :scroll-events="true" @ionScroll="handleScroll">
      <div class="main-container max-w-full mx-auto">

        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div
            class="flex flex-wrap align-items-center justify-content-between border-bottom-1 surface-border pb-3 mb-3">
            <user-avatar />
            <div class="flex gap-2">
              <Button label="Lưu" icon="pi pi-save" outlined size="large" />
              <Button label="Xác nhận hoàn thành" icon="pi pi-check-circle" severity="success" size="large" />
            </div>
          </div>

          <div class="grid formgrid p-fluid">
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
              <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">Keo</label>
              <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Hình thể</label>
              <InputText v-model="headerInfo.model" readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Tổng trọng lượng (Kg)</label>
              <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600" />
            </div>
          </div>
        </div>

        <div class="surface-card p-0 shadow-1 mt-4 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg"><i class="pi pi-list mr-2"></i>Chi tiết dây chuyền</span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" scrollable
              scrollHeight="700px" tableStyle="min-width: 70rem" stripedRows class="modern-table" :paginator="true"
              :rows="5" :rowsPerPageOptions="[5, 10, 25, 50]">

              <Column field="xuong" header="Xưởng" style="min-width: 100px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.xuong }}</span>
                </template>
              </Column>

              <Column field="donYeuCau" header="Đơn yêu cầu" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.donYeuCau }}</span>
                </template>
              </Column>

              <Column field="hinhThe" header="Hình thể" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.hinhThe }}</span>
                </template>
              </Column>

              <Column field="chuyen" header="Chuyền" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1.5rem" class="border-round-md" />
                  <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm">
                    {{ data.chuyen }}
                  </span>
                </template>
              </Column>

              <Column field="trongLuong" header="Trọng lượng" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="50%" height="1rem" />
                  <span v-else>{{ data.trongLuong }}</span>
                </template>
              </Column>

              <Column field="thoiGianLanh" header="Thời gian lãnh" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="90%" height="1rem" />
                  <span v-else class="text-500">
                    <i class="pi pi-clock text-xs mr-1"></i>{{ data.thoiGianLanh }}
                  </span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>

        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-box mr-2"></i>Thành phần trộn keo
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">

              <div class="col-12 sm:col-5 lg:col-4 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Mã thành phần</label>
                <InputText v-model="mixingProcess.component" readonly
                  class="w-full font-bold text-primary border-blue-200" />
              </div>

              <ElectronicScale @update:weight="handleWeightChange" @connection-status="handleConnectionStatus" />

              <div class="col-12 sm:col-12 lg:col-4 sm:mt-3 lg:mt-0 flex justify-content-end">
                <Button label="Xác nhận" icon="pi pi-check" size="large" severity="success" />
              </div>

            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="componentDetailsFull" lazy :totalRecords="totalComponentRecords" @page="onPageComponent"
              scrollable scrollHeight="700px" stripedRows class="modern-table" tableStyle="min-width: 70rem"
              @row-click="onRowClick" :paginator="true" :rows="5" :rowsPerPageOptions="[5, 10, 25, 50]">

              <template #paginatorstart>
                <div class="flex justify-start">
                  <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="refreshData" />
                </div>
              </template>

              <Column field="stt" header="#" style="width: 50px; text-align: center; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" class="mx-auto" />
                  <span v-else>{{ data.stt }}</span>
                </template>
              </Column>

              <Column field="thanhPhan" header="Mã TP" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="70%" height="1rem" />
                  <span v-else>{{ data.thanhPhan }}</span>
                </template>
              </Column>

              <Column field="ten" header="Tên thành phần" class="font-medium" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="80%" height="1rem" />
                  <span v-else>{{ data.ten }}</span>
                </template>
              </Column>

              <Column field="trongLuong" header="TL Yêu cầu (Kg)" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="50%" height="1rem" />
                  <span v-else>{{ data.trongLuong }}</span>
                </template>
              </Column>

              <Column field="trongLuongThucTe" header="TL Thực tế (Kg)" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" />
                  <template v-else>
                    <span v-if="data.trongLuongThucTe" class="text-green-600 font-bold">{{ data.trongLuongThucTe
                    }}</span>
                    <span v-else class="text-400 font-italic">Chưa cân</span>
                  </template>
                </template>
              </Column>

              <Column field="nguoiThaoTac" header="Người thao tác" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" />
                  <span v-else>{{ data.nguoiThaoTac }}</span>
                </template>
              </Column>

              <Column field="thoiGianCan" header="Thời gian cân" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="90%" height="1rem" />
                  <span v-else-if="data && data.thoiGianCan" class="text-500">
                    <i class="pi pi-clock text-xs mr-1"></i>{{ data.thoiGianCan }}
                  </span>
                </template>
              </Column>

              <template #paginatorend></template>
            </DataTable>
          </div>
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <BackToTop slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle
} from '@ionic/vue';
import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';

interface LineDetail {
  id?: number;
  xuong?: string;
  donYeuCau?: string;
  hinhThe?: string;
  chuyen?: string;
  trongLuong?: string;
  thoiGianLanh?: string;
}

interface ComponentDetail {
  stt?: number;
  thanhPhan?: string;
  ten?: string;
  trongLuong?: string;
  trongLuongThucTe?: string;
  nguoiThaoTac?: string;
  thoiGianCan?: string;
}

const headerInfo = ref({
  orderNo: 'C2R26216',
  glue: 'Keo bôi đế',
  model: 'C2 R26216',
  totalWeight: '31.5'
});

const mixingProcess = ref({
  component: '351',
  weight: '1.501'
});

const onRowClick = (event: { data: ComponentDetail }) => {
  if (!isLoadingLine.value && event.data && event.data.thanhPhan) {
    mixingProcess.value.component = event.data.thanhPhan;
  }
};

// Bảng 1
const generateData = (index: number) => {
  const isChuyen1 = index % 2 === 0;
  return {
    id: index,
    xuong: `BU${index % 3 + 1}`,
    donYeuCau: `Chuyền ${isChuyen1 ? '1' : '2'} C2 R26216`,
    hinhThe: 'C2 R26216',
    chuyen: `Chuyền ${isChuyen1 ? '1' : '2'}`,
    trongLuong: isChuyen1 ? '20' : '10',
    thoiGianLanh: isChuyen1 ? '10:15 10/04/2026' : '11:30 10/04/2026'
  };
};

// Bảng 2
const generateComponentData = (index: number) => {
  const isKeo7911 = index % 2 !== 0;
  return {
    stt: index,
    thanhPhan: Math.random().toString(36).substring(2, 7).toUpperCase(),
    ten: 'Keo ' + Math.random().toFixed(5).substring(2, 7).toUpperCase(),
    trongLuong: isKeo7911 ? '30' : '1.5',
    trongLuongThucTe: isKeo7911 ? '30.1' : '',
    nguoiThaoTac: isKeo7911 ? 'R79xxx' : '',
    thoiGianCan: isKeo7911 ? '13:15 16/04/2026' : ''
  };
};

const handleWeightChange = (newWeight: string) => {
  console.log("Trọng lượng cân đang là:", newWeight);
  // Gán vào biến form của bạn ở ngoài này...
}

const handleConnectionStatus = (status: boolean) => {
  if (status) {
    console.log("Cân đã kết nối!");
  } else {
    console.log("Mất kết nối với cân!");
  }
}

// BackToTop logic
const contentRef = ref<any>(null);
const showScrollButton = ref(false);

const handleScroll = (event: CustomEvent) => {
  if (event.detail.scrollTop > 100) {
    showScrollButton.value = true;
  } else {
    showScrollButton.value = false;
  }
};

const scrollToTop = () => {
  contentRef.value?.$el?.scrollToTop(500);
};
///////////////////////

// 2. Khởi tạo mảng có định dạng kiểu dữ liệu
const lineDetails = ref<LineDetail[]>(Array.from({ length: 5 }).map(() => ({})));
const componentDetailsFull = ref<ComponentDetail[]>(Array.from({ length: 5 }).map(() => ({})));

const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);

const totalRecords = 100;
const totalComponentRecords = 100;

// 3. Xử lý clear Timeout để chống Spam Click
let lineTimeout: any = null;
const onPageLine = (event: any) => {
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: event.rows }).map(() => ({}));

  if (lineTimeout) clearTimeout(lineTimeout);

  lineTimeout = setTimeout(() => {
    lineDetails.value = Array.from({ length: event.rows }).map((_, i) =>
      generateData(event.first + i + 1)
    );
    isLoadingLine.value = false;
  }, 1000);
};

let componentTimeout: any = null;
const onPageComponent = (event: any) => {
  isLoadingComponent.value = true;
  componentDetailsFull.value = Array.from({ length: event.rows }).map(() => ({}));

  if (componentTimeout) clearTimeout(componentTimeout);

  componentTimeout = setTimeout(() => {
    componentDetailsFull.value = Array.from({ length: event.rows }).map((_, i) =>
      generateComponentData(event.first + i + 1)
    );
    isLoadingComponent.value = false;
  }, 1000);
};

onMounted(() => {
  setTimeout(() => {
    lineDetails.value = Array.from({ length: 5 }).map((_, i) => generateData(i + 1));
    isLoadingLine.value = false;
  }, 1500);

  setTimeout(() => {
    componentDetailsFull.value = Array.from({ length: 5 }).map((_, i) => generateComponentData(i + 1));
    isLoadingComponent.value = false;
  }, 1500);
});

const refreshData = () => {
  isLoadingComponent.value = true;
  componentDetailsFull.value = Array.from({ length: 5 }).map(() => ({}));

  if (componentTimeout) clearTimeout(componentTimeout);

  componentTimeout = setTimeout(() => {
    componentDetailsFull.value = Array.from({ length: 5 }).map((_, i) => generateComponentData(i + 1));
    isLoadingComponent.value = false;
  }, 1000);
};
</script>

<style scoped></style>