<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Glue from Product</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding bg-gray-50" :scroll-events="true">
      <div class="main-container max-w-full mx-auto">
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div
            class="flex flex-wrap align-items-center justify-content-between surface-border border-bottom-1 surface-border pb-3 mb-3">
            <user-avatar />
            <div class="flex gap-2">
              <Button label="Lưu" icon="pi pi-save" outlined size="large" />
            </div>
          </div>

          <div class="grid formgrid p-fluid border-bottom-1 surface-border pb-3 mb-3">
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">Keo thu về</label>
              <Select v-model="headerInfo.orderNo" :options="orderOptions" optionLabel="label" optionValue="value"
                placeholder="Chọn đơn điều công" class="w-full font-bold" />
            </div>
            <div class="col-12 sm:col-6 lg:col-2">
              <label class="text-800 font-medium mb-1 block">Tên keo</label>
              <InputText v-model="headerInfo.glue" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-1 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Xưởng</label>
              <InputText v-model="headerInfo.xuong" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Đơn điều công</label>
              <InputText v-model="headerInfo.donDieuCong" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Đơn yêu cầu</label>
              <InputText v-model="headerInfo.donYeuCau" fluid readonly class="font-bold text-blue-600" />
            </div>
          </div>

          <div class="grid formgrid p-fluid">
            <div class="col-12 sm:col-6 lg:col-2">
              <label class="text-800 font-medium mb-1 block">Hình thể</label>
              <InputText v-model="bottomInfo.orderNo" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-2">
              <label class="text-800 font-medium mb-1 block">Dây chuyền</label>
              <InputText v-model="bottomInfo.glue" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-2 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Trọng lượng thu về</label>
              <InputText v-model="bottomInfo.xuong" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Người thao tác</label>
              <InputText v-model="bottomInfo.donDieuCong" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 sm:mt-2 lg:mt-0">
              <label class="text-800 font-medium mb-1 block">Thời gian hoàn thành</label>
              <InputText v-model="bottomInfo.donYeuCau" fluid readonly class="font-bold text-blue-600" />
            </div>
          </div>
        </div>

        <div class="h-3rem flex-shrink-0"></div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle
} from '@ionic/vue';
import { ref } from 'vue';
import UserAvatar from '@/components/UserAvatar.vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const headerInfo = ref({
  orderNo: 'Chọn keo thu về',
  glue: 'Keo bôi đế',
  xuong: 'BU2',
  donDieuCong: 'C2 R26216 Keo bôi đế',
  donYeuCau: 'Chuyền 1 C2 R26216'
});

const bottomInfo = ref({
  orderNo: 'Chọn keo thu về',
  glue: 'Keo bôi đế',
  xuong: 'BU2',
  donDieuCong: 'C2 R26216 Keo bôi đế',
  donYeuCau: 'Chuyền 1 C2 R26216'
});

const orderOptions = ref([
  { label: 'C2R26216', value: 'C2R26216' },
  { label: 'C2R26217', value: 'C2R26217' },
  { label: 'C2R26218', value: 'C2R26218' },
  { label: 'C2R26219', value: 'C2R26219' }

]);

const goBack = () => router.back();
</script>

<style scoped></style>