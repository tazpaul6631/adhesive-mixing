<template>
  <ion-page>
    <ion-header class="header-container ion-no-border">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Re-Packing Mixed Glue Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding bg-gray-50" :scroll-events="true" @ionScroll="handleScroll">
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
            <div class="col-12 sm:col-6 lg:col-4">
              <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
              <InputText v-model="headerInfo.orderNo" readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-4">
              <label class="text-800 font-medium mb-1 block">Keo</label>
              <InputText v-model="headerInfo.glue" readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-4 sm:mt-2">
              <label class="text-800 font-medium mb-1 block">Tổng trọng lượng (Kg)</label>
              <InputText v-model="headerInfo.totalWeight" readonly class="font-bold text-blue-600" />
            </div>
          </div>
        </div>

        <!-- Bảng 1 -->
        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thung keo trộn
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" stripedRows
              class="modern-table" tableStyle="width: 100%; table-layout: fixed;" :paginator="true" :rows="5"
              :rowsPerPageOptions="[5, 10, 25, 50]" scrollable scrollHeight="700px">

              <Column field="xuong" header="Xưởng" style="width: 10%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.xuong }}</span>
                </template>
              </Column>

              <Column field="donYeuCau" header="Đơn yêu cầu" style="width: 18%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.donYeuCau }}</span>
                </template>
              </Column>

              <Column field="hinhThe" header="Hình thể" style="width: 15%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="70%" height="1rem" />
                  <span v-else>{{ data.hinhThe }}</span>
                </template>
              </Column>

              <Column field="dayChuyen" header="Dây Chuyền" style="width: 15%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1.5rem" class="border-round-md" />
                  <span v-else class="bg-blue-50 text-blue-700 px-2 py-1 border-round-md font-medium text-sm">
                    {{ data.dayChuyen }}
                  </span>
                </template>
              </Column>

              <Column field="thungChua" header="Thùng chứa" style="width: 20%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1.5rem" />
                  <div v-else class="flex flex-wrap gap-3">
                    <div v-for="(option, idx) in data.thungChuaOptions" :key="idx" class="flex align-items-center">
                      <RadioButton v-model="data.selectedThungChua" :inputId="`thung_${data.id}_${idx}`"
                        :name="`row_${data.id}`" :value="option" />
                      <label :for="`thung_${data.id}_${idx}`" class="ml-2 mb-0 text-sm font-medium">
                        {{ option }}
                      </label>
                    </div>
                  </div>
                </template>
              </Column>

              <Column field="nguoiThaoTac" header="Người thao tác" style="width: 18%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.nguoiThaoTac }}</span>
                </template>
              </Column>

              <Column field="thoiGianHoanThanh" header="Thời gian hoàn thành" style="width: 14%; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="90%" height="1rem" />
                  <span v-else-if="data.thoiGianHoanThanh" class="text-500">
                    <i class="pi pi-clock text-xs mr-1"></i>{{ data.thoiGianHoanThanh }}
                  </span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>

        <!-- Bảng 2 -->
        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">

              <div class="col-12 sm:col-6 lg:col-3 mb-3 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Hình Thể</label>
                <InputText v-model="mixingProcess.xuong" readonly
                  class="w-full font-bold text-primary border-blue-200" />
              </div>

              <div class="col-12 sm:col-6 lg:col-3 mb-3 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Keo</label>
                <InputText v-model="mixingProcess.keo" readonly class="w-full font-bold text-primary border-blue-200" />
              </div>

              <ElectronicScale @update:weight="handleWeightChange" @connection-status="handleConnectionStatus" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="componentDetailsFull" lazy :totalRecords="totalComponentRecords" @page="onPageComponent"
              stripedRows class="modern-table" tableStyle="min-width: 70rem" @row-click="onRowClick" :paginator="true"
              :rows="5" :rowsPerPageOptions="[5, 10, 25, 50]" scrollable scrollHeight="700px">

              <template #paginatorstart>
                <div class="flex justify-start">
                  <Button rounded outlined severity="warn" icon="pi pi-plus" size="large" @click="refreshData" />
                </div>
              </template>

              <Column field="xuong" header="Xưởng" style="width: 50px; text-align: center; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="60%" height="1rem" class="mx-auto" />
                  <span v-else>{{ data.xuong }}</span>
                </template>
              </Column>

              <Column field="hinhThe" header="Hình Thể" style="min-width: 120px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="70%" height="1rem" />
                  <span v-else>{{ data.hinhThe }}</span>
                </template>
              </Column>

              <Column field="keo" header="Keo" class="font-medium" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="80%" height="1rem" />
                  <span v-else>{{ data.keo }}</span>
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

              <Column field="thoiGianHoanThanh" header="Thời gian hoàn thành" style="min-width: 180px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="90%" height="1rem" />
                  <span v-else-if="data.thoiGianHoanThanh" class="text-500">
                    <i class="pi pi-clock text-xs mr-1"></i>{{ data.thoiGianHoanThanh }}
                  </span>
                </template>
              </Column>

              <Column field="chiet" header="Chiết" style="min-width: 150px; height: 60px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingComponent" width="50%" height="1rem" />
                  <Button :label="data.chiet ? 'Chiết' : 'Chiết'" icon="pi pi-check-square" size="small" severity="info"
                    outlined @click.stop="handleChiet(data)" />
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
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle
} from '@ionic/vue';
import BackToTop from '@/components/BackToTop.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import ElectronicScale from '@/components/ElectronicScale.vue';
import { useRouter } from 'vue-router';

const router = useRouter();

// Loading states
const isLoadingLine = ref(true);
const isLoadingComponent = ref(true);

const totalRecords = 100;
const totalComponentRecords = 100;

// Data form Header
const headerInfo = ref({
  orderNo: 'C2R26216',
  glue: 'Keo bôi đế',
  model: 'C2 R26216',
  totalWeight: '31.5'
});

// Data thao tác cân
const mixingProcess = ref({
  xuong: '351',
  keo: 'Keo 7911',
  weight: '1.501'
});

const onRowClick = (event: any) => {
  if (!isLoadingComponent.value && event.data && event.data.hinhThe && event.data.keo) {
    mixingProcess.value.xuong = event.data.hinhThe;
    mixingProcess.value.keo = event.data.keo;
  }
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

const goBack = () => router.back();

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
  if (contentRef.value) {
    contentRef.value.$el.scrollToTop(500);
  }
};
////////////////////////////

const generateData = (index: number) => {
  const isChuyen1 = index % 2 === 0;
  const numOptions = Math.random() > 0.5 ? 2 : 3;
  const options = Array.from({ length: numOptions }).map((_, i) => `kg ${i + 1}`);
  const randomSelected = options[Math.floor(Math.random() * options.length)];

  return {
    id: index,
    xuong: `BU${index % 3 + 1}`,
    donYeuCau: `Chuyền ${isChuyen1 ? '1' : '2'} C2 R26216`,
    hinhThe: 'C2 R26216',
    dayChuyen: `Chuyền ${isChuyen1 ? '1' : '2'}`,
    thungChuaOptions: options,
    selectedThungChua: randomSelected,
    nguoiThaoTac: isChuyen1 ? 'R79xxx' : '',
    thoiGianHoanThanh: isChuyen1 ? '10:15 10/04/2026' : '11:30 10/04/2026'
  };
};

const generateComponentData = (index: number) => {
  const isKeo7911 = index % 2 !== 0;
  return {
    id: index,
    xuong: `BU${index % 3 + 1}`,
    hinhThe: Math.random().toString(36).substring(2, 7).toUpperCase(),
    keo: 'Keo ' + Math.random().toFixed(5).substring(2, 7).toUpperCase(),
    trongLuongThucTe: isKeo7911 ? '1.6' : '',
    nguoiThaoTac: isKeo7911 ? 'R79xxx' : '',
    thoiGianHoanThanh: isKeo7911 ? '13:15 16/04/2026' : '',
    chiet: isKeo7911 ? true : false
  };
};

// Hàm xử lý khi bấm nút "Chiết"
const handleChiet = (rowData: any) => {
  console.log("Thực hiện chiết cho dòng:", rowData);
  // Thêm logic gọi API hoặc cập nhật dữ liệu của bạn tại đây

  // Ví dụ: Gán thông tin lên phần thao tác cân
  mixingProcess.value.xuong = rowData.hinhThe;
  mixingProcess.value.keo = rowData.keo;
};

// MẢNG DỮ LIỆU GỐC (khởi tạo bằng Skeleton ban đầu)
const lineDetails = ref<any[]>(Array.from({ length: 5 }).map(() => ({})));
const componentDetailsFull = ref<any[]>(Array.from({ length: 5 }).map(() => ({})));

// Hàm phân trang (Bảng 1)
const onPageLine = (event: any) => {
  isLoadingLine.value = true;
  lineDetails.value = Array.from({ length: event.rows }).map(() => ({}));

  setTimeout(() => {
    lineDetails.value = Array.from({ length: event.rows }).map((_, i) =>
      generateData(event.first + i + 1)
    );
    isLoadingLine.value = false;
  }, 1000);
};

// Hàm phân trang (Bảng 2)
const onPageComponent = (event: any) => {
  isLoadingComponent.value = true;
  componentDetailsFull.value = Array.from({ length: event.rows }).map(() => ({}));

  setTimeout(() => {
    componentDetailsFull.value = Array.from({ length: event.rows }).map((_, i) =>
      generateComponentData(event.first + i + 1)
    );
    isLoadingComponent.value = false;
  }, 1000);
};

// Khởi tạo mô phỏng
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

// Hàm xử lý nút Refresh ở Bảng 2
const refreshData = () => {
  console.log("Đang tải lại dữ liệu bảng 2...");
  isLoadingComponent.value = true;
  componentDetailsFull.value = Array.from({ length: 5 }).map(() => ({}));

  setTimeout(() => {
    componentDetailsFull.value = Array.from({ length: 5 }).map((_, i) => generateComponentData(i + 1));
    isLoadingComponent.value = false;
  }, 1000);
};
</script>

<style scoped></style>