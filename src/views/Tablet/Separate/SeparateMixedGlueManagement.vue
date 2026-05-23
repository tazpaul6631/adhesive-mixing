<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <ion-title>Separate Mixed Glue</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">

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
              <!-- <Button icon="pi pi-save" outlined size="large" @click="handleSaveDraft" /> -->
              <Button icon="pi pi-check-circle" severity="success" size="large" @click="handleComplete" />
            </div>
          </div>
        </div>

        <!-- <div class="segment-tabs">
          <ion-segment v-model="selectedTab" mode="ios" scrollable @ionChange="onSegmentIonChange">
            <ion-segment-button value="table1">
              <ion-label class="font-bold">KEO TRỘN</ion-label>
            </ion-segment-button>
            <ion-segment-button value="table2">
              <ion-label class="font-bold">KEO KHÔNG TRỘN</ion-label>
            </ion-segment-button>
          </ion-segment>
        </div> -->

        <!-- <div v-show="selectedTab === 'table1'" class="tab-panel"> -->
        <div v-if="mixChemicals.length > 0" class="surface-card p-0 shadow-1 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>Chi tiết đơn yêu cầu chiết thùng keo trộn
            </span>
          </div>
          <SeparateGlue :is-loading="isLoadingLine" :order-details="mixedGlueTableDetails"
            :request-details="requestDetails" :target-weight="headerInfo.totalWeight" target-weight-unit="Kg"
            @update-bucket="saveDraftToStoreOnly" @add-row="handleAddSeparateGlueRow"
            @delete-row="handleDeleteSeparateGlueRow" />
        </div>
        <!-- </div> -->

        <!-- <div v-show="selectedTab === 'table2'" class="tab-panel"> -->
        <div v-if="noMixComponents.length > 0" class="surface-card p-0 shadow-1 border-round-xl">
          <div class="surface-100 p-3 border-round-top-xl flex align-items-center justify-content-between">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-box mr-2"></i>Chi tiết đơn yêu cầu sử dụng keo không trộn
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">
              <div class="col-12 sm:col-6 lg:col-6 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">Keo</label>
                <InputText v-model="mixingProcess.component" readonly class="font-bold text-primary border-blue-200"
                  style="width: 280px;" fluid />
              </div>

              <ElectronicScale :weight-unit="activeComponent?.weightUnit"
                :target-weight="activeComponent?.requiredWeight ?? 0"
                :lower-tolerance="activeComponent?.lowerTolerance ?? ''"
                :upper-tolerance="activeComponent?.upperTolerance ?? ''"
                :enforce-tolerance="!!activeComponent?.glueExtra"
                :locked-weight="activeComponent?.weighingTime ? (activeComponent?.actualWeight ?? '') : ''"
                :disable-confirm="!!activeComponent?.weighingTime" @update:weight="handleWeightChange"
                @connection-status="handleConnectionStatus" @confirm-weight="handleConfirmWeight" />
            </div>
          </div>

          <div class="overflow-x-auto border-round-bottom-xl">
            <div class="table-wrapper">
              <NoSeparateGlue :is-loading="isLoadingComponent" :no-mix-chemicals="noMixComponents"
                :header-total-weight="headerInfo.totalWeight" v-model:selectedItem="selectedItem"
                @row-click="onRowClick" @open-new="openNewComponentDialog" @delete-row="handleDeleteComponent"
                @chiet-row="handleChietRow" @view-row="handleViewRow" />
            </div>

            <AddComponentDialog v-model:visible="productDialog" :materials-list="materialsList"
              :is-loading-materials="isLoadingMaterials" @fetch-materials="fetchMaterials"
              @save="handleSaveNewComponent" />

            <SeparateGlueDialog v-model:visible="chietDialog" :chemical="currentChietChemical"
              :order-details="chietOrderDetails" :request-details="requestDetails" :is-view-mode="isViewMode"
              @update-bucket="saveChietDraftToStoreOnly" @confirm="confirmChiet" @add-row="handleAddChietRow"
              @delete-row="handleDeleteChietRow" />
          </div>
        </div>
      </div>
      <!-- </div> -->
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle, IonSegment, IonSegmentButton, IonLabel,
} from '@ionic/vue';

import ElectronicScale from '@/components/ElectronicScale.vue';
import AddComponentDialog from '@/views/Tablet/Separate/components/AddComponentDialog.vue';
import SeparateGlue from '@/views/Tablet/Separate/components/SeparateGlue.vue';
import NoSeparateGlue from '@/views/Tablet/Separate/components/NoSeparateGlue.vue';
import SeparateGlueDialog from '@/views/Tablet/Separate/components/SeparateGlueDialog.vue';
import { useSeparateMixedGlueManagement } from './useSeparateMixedGlueManagement';

const {
  headerInfo,
  selectedTab,
  isLoadingLine,
  isLoadingComponent,
  mixedGlueTableDetails,
  mixChemicals,
  requestDetails,
  mixingProcess,
  activeComponent,
  noMixComponents,
  selectedItem,
  productDialog,
  materialsList,
  isLoadingMaterials,
  chietDialog,
  chietOrderDetails,
  currentChietChemical,
  isViewMode,
  onSegmentIonChange,
  saveDraftToStoreOnly,
  saveChietDraftToStoreOnly,
  handleAddSeparateGlueRow,
  handleDeleteSeparateGlueRow,
  handleComplete,
  onRowClick,
  handleWeightChange,
  handleConnectionStatus,
  handleConfirmWeight,
  handleSaveNewComponent,
  handleDeleteComponent,
  fetchMaterials,
  openNewComponentDialog,
  handleChietRow,
  handleViewRow,
  confirmChiet,
  handleAddChietRow,
  handleDeleteChietRow,
  goBack,
} = useSeparateMixedGlueManagement();
</script>

<style scoped>
/* Khối tab: không cho co khi .main-container là flex column full-height (tránh tab "biến mất" giống trang list). */
.segment-tabs {
  flex-shrink: 0;
  width: 100%;
  position: relative;
  z-index: 2;
}

.tab-panel {
  width: 100%;
  min-height: 500px;
}

ion-segment {
  height: 50px;
  min-height: 50px;
  flex-shrink: 0;
  width: 100%;
}

ion-segment-button {
  width: auto;
}

ion-label {
  line-height: normal !important;
}
</style>
