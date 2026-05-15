<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>QIP Confirm Re-Packing Mixed Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding bg-gray-50" :scroll-events="true" @ionScroll="handleScroll">
      <div class="main-container max-w-full mx-auto">
        <div class="flex flex-wrap align-items-center justify-content-between surface-border">
          <user-avatar />
          <ConnectBluetooth templateType="repacking" :printData="selectedItem" />
        </div>

        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl bg-white">
            <span class="font-bold text-900 text-xl">
              <i class="pi pi-list mr-2"></i>Danh sách chờ xác nhận việc chiết thùng
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" stripedRows
              class="custom-bordered-table" tableStyle="min-width: 70rem" :paginator="true" :rows="5"
              :rowsPerPageOptions="[5, 10, 25, 50]" scrollable scrollHeight="700px" selectionMode="single"
              v-model:selection="selectedItem" dataKey="id">

              <template #empty>
                <div style="text-align: center; padding: 3.3rem; height: 400px; align-content: center;">
                  <i class="pi pi-inbox" style="font-size: 2rem; color: #9ca3af; margin-bottom: 1rem;"></i>
                  <p style="margin: 0; color: #6b7280;">Hiện tại chưa có dữ liệu để hiển thị.</p>
                </div>
              </template>

              <Column field="xuong" header="Xưởng" style="min-width: 100px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="60%" height="1rem" />
                  <span v-else>{{ data.xuong }}</span>
                </template>
              </Column>

              <Column field="donDieuCong" header="Đơn điều công" style="min-width: 200px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.donDieuCong }}</span>
                </template>
              </Column>

              <Column field="donYeuCau" header="Đơn yêu cầu" style="min-width: 200px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.donYeuCau }}</span>
                </template>
              </Column>

              <Column field="hinhThe" header="Hình thể" style="min-width: 150px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.hinhThe }}</span>
                </template>
              </Column>

              <Column field="dayChuyen" header="Dây chuyền" style="min-width: 150px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.dayChuyen }}</span>
                </template>
              </Column>

              <Column field="trongLuongYeuCau" header="Trọng lượng yêu cầu" style="min-width: 150px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.trongLuongYeuCau.join(' / ') }}</span>
                </template>
              </Column>

              <Column field="trongLuongThucTe" header="Trọng lượng thực tế" style="min-width: 150px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.trongLuongThucTe }}</span>
                </template>
              </Column>

              <Column field="nguoiThaoTac" header="Người thao tác" style="min-width: 150px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.nguoiThaoTac }}</span>
                </template>
              </Column>

              <Column field="thoiGianHoanThanh" header="Thời gian hoàn thành" style="min-width: 200px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" width="80%" height="1rem" />
                  <span v-else>{{ data.thoiGianHoanThanh }}</span>
                </template>
              </Column>
            </DataTable>
          </div>
        </div>
        <div class="h-3rem flex-shrink-0"></div>
      </div>
      <back-to-top slot="fixed" :showScrollButton="showScrollButton" @scrollToTop="scrollToTop" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import ConnectBluetooth from '@/components/ConnectBluetooth.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle
} from '@ionic/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const isLoadingLine = ref(true);
const totalRecords = 100;
const selectedItem = ref<any>(null);
const lineDetails = ref<any[]>([]);

const generateData = (index: number) => {
  const isChuyen1 = index % 2 === 0;
  return {
    id: index,
    xuong: `BU${index % 3 + 1}`,
    donDieuCong: 'C2R26216 Keo bồi đế',
    donYeuCau: `Chuyền ${isChuyen1 ? '1' : '2'} C2 R26216`,
    hinhThe: 'C2 R26216',
    dayChuyen: `Chuyền ${isChuyen1 ? '1' : '2'}`,
    trongLuongYeuCau: ['30.1 Kg', '1.5 Kg'],
    trongLuongThucTe: '32.5 Kg',
    nguoiThaoTac: isChuyen1 ? 'R79xxx' : '',
    thoiGianHoanThanh: isChuyen1 ? '10:15 10/04/2026' : '11:30 10/04/2026'
  };
};

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

onMounted(() => {
  lineDetails.value = Array.from({ length: 5 }).map(() => ({}));

  setTimeout(() => {
    lineDetails.value = Array.from({ length: 5 }).map((_, i) => generateData(i + 1));
    isLoadingLine.value = false;
  }, 1000);
});

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
///////////////////////

const goBack = () => router.back(); 
</script>

<style scoped></style>