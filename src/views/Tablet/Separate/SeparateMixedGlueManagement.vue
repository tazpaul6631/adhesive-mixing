<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <ion-buttons slot="start">
          <ion-button @click="goBack">
            <i class="pi pi-angle-left text-xl mr-1"></i>
          </ion-button>
        </ion-buttons>
        <div class="flex align-items-center justify-content-between">
          <ion-title class="no-padding">{{ t('separateMixedGlue.management.pageTitle') }}</ion-title>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding" :scroll-events="true">

      <div class="main-container max-w-full mx-auto">
        <!-- Thông tin header -->
        <div class="surface-card p-3 shadow-1 border-round-xl">
          <div class="grid">
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
              <InputText v-model="headerInfo.orderNo" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
              <InputText v-model="headerInfo.glue" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
              <InputText v-model="headerInfo.totalWeight" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 sm:col-6 lg:col-3 text-right mt-4">
              <Button :disabled="separateGlueComplete" icon="pi pi-check-circle" severity="success" size="large"
                @click="handleComplete" />
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
              <i class="pi pi-list mr-2"></i>{{ t('separateMixedGlue.management.sections.mixedGlueBucket') }}
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
              <i class="pi pi-box mr-2"></i>{{ t('separateMixedGlue.management.sections.noMixGlue') }}
            </span>
          </div>

          <div class="p-3 md:p-4 surface-50 border-bottom-1 surface-border">
            <div class="grid formgrid align-items-end">
              <div class="col-12 sm:col-6 lg:col-6 lg:mb-0">
                <label class="text-800 font-medium mb-2 block">{{ t('separateMixedGlue.table.columns.glue') }}</label>
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
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';

const { t } = useAppLocale(() => 'tablet');

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
  separateGlueComplete,
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
