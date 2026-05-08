<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>QIP Confirm Mix Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content ref="contentRef" class="ion-padding bg-gray-50" :scroll-events="true" @ionScroll="handleScroll">
      <div class="main-container max-w-full mx-auto">
        <div class="flex flex-wrap align-items-center justify-content-between surface-border">
          <user-avatar />
          <ConnectBluetooth templateType="mix_glue" :printData="selectedItem" />
        </div>

        <div class="surface-card p-0 shadow-1 border-round-xl mt-4">
          <div class="surface-100 p-3 border-round-top-xl bg-white">
            <span class="font-bold text-900 text-xl">
              <i class="pi pi-list mr-2"></i>Danh sách trộn keo chờ xác nhận
            </span>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <DataTable :value="lineDetails" lazy :totalRecords="totalRecords" @page="onPageLine" stripedRows
              class="custom-bordered-table" tableStyle="min-width: 70rem" :paginator="true" :rows="5"
              :rowsPerPageOptions="[5, 10, 25, 50]" scrollable scrollHeight="700px" selectionMode="single"
              v-model:selection="selectedItem" dataKey="id">

              <Column header="Đơn điều công" style="min-width: 210px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else>{{ data.donDieuCong }}</span>
                </template>
              </Column>

              <Column header="Hình thể" style="min-width: 130px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else>{{ data.hinhThe }}</span>
                </template>
              </Column>

              <Column header="Keo" style="min-width: 120px">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else>{{ data.keo }}</span>
                </template>
              </Column>

              <Column header="Thành phần" style="min-width: 150px">
                <template #body="{ data }">
                  <div v-if="isLoadingLine" class="flex flex-column gap-2 p-2 w-full">
                    <Skeleton height="1.5rem" />
                    <Skeleton height="1.5rem" />
                  </div>
                  <div v-else class="flex flex-column h-full w-full">
                    <div v-for="(item, idx) in data.thanhPhan" :key="idx"
                      class="flex-1 flex align-items-center justify-content-center p-2"
                      :class="{ 'border-bottom-1 border-black-alpha-30': idx !== data.thanhPhan.length - 1 }">
                      {{ item }}
                    </div>
                  </div>
                </template>
              </Column>

              <Column header="Trọng lượng" style="min-width: 150px">
                <template #body="{ data }">
                  <div v-if="isLoadingLine" class="flex flex-column gap-2 p-2 w-full">
                    <Skeleton height="1.5rem" />
                    <Skeleton height="1.5rem" />
                  </div>
                  <div v-else class="flex flex-column h-full w-full">
                    <div v-for="(item, idx) in data.trongLuong" :key="idx"
                      class="flex-1 flex align-items-center justify-content-center p-2"
                      :class="{ 'border-bottom-1 border-black-alpha-30': idx !== data.trongLuong.length - 1 }">
                      {{ item }}
                    </div>
                  </div>
                </template>
              </Column>

              <Column header="Tên" style="min-width: 150px">
                <template #body="{ data }">
                  <div v-if="isLoadingLine" class="flex flex-column gap-2 p-2 w-full">
                    <Skeleton height="1.5rem" />
                    <Skeleton height="1.5rem" />
                  </div>
                  <div v-else class="flex flex-column h-full w-full">
                    <div v-for="(item, idx) in data.ten" :key="idx"
                      class="flex-1 flex align-items-center justify-content-center p-2"
                      :class="{ 'border-bottom-1 border-black-alpha-30': idx !== data.ten.length - 1 }">
                      {{ item }}
                    </div>
                  </div>
                </template>
              </Column>

              <Column header="Trọng lượng thực tế" headerStyle="text-align: center" style="min-width: 150px"
                bodyStyle="text-align: center">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else>{{ data.trongLuongThucTe }}</span>
                </template>
              </Column>

              <Column header="Người cân" style="min-width: 150px" headerStyle="text-align: center"
                bodyStyle="text-align: center">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
                  <span v-else>{{ data.nguoiCan }}</span>
                </template>
              </Column>

              <Column header="Thời gian hoàn thành" style="min-width: 150px" headerStyle="text-align: center"
                bodyStyle="text-align: center">
                <template #body="{ data }">
                  <Skeleton v-if="isLoadingLine" class="w-full" height="1.5rem" />
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
import BackToTop from '@/components/BackToTop.vue';
import ConnectBluetooth from '@/components/ConnectBluetooth.vue';
import UserAvatar from '@/components/UserAvatar.vue';
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle, IonBackButton
} from '@ionic/vue';
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const isLoadingLine = ref(true);
const totalRecords = 100;
const selectedItem = ref<any>(null);

const lineDetails = ref<any[]>([]);

const generateData = (index: number) => {
  return {
    id: index,
    donDieuCong: 'C2R26216 Keo bồi đế',
    hinhThe: 'C2 R26216',
    keo: 'Keo bồi đế',
    thanhPhan: ['7911', '352'],
    trongLuong: ['30.1 Kg', '1.5 Kg'],
    ten: ['Keo A', 'Keo B'],
    trongLuongThucTe: '32.5 Kg',
    nguoiCan: '',
    thoiGianHoanThanh: ''
  };
};

const goBack = () => router.back();

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
</script>

<style scoped></style>