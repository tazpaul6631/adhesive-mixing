<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" style="padding: 0px !important;">
        <div class="flex align-items-center justify-content-between">
          <ion-buttons slot="start">
            <ion-button @click="goBack">
              <i class="pi pi-angle-left text-xl mr-1"></i>
              <ion-title class="no-padding" style="line-height: 50px;">{{ t('separateMixedGlue.management.pageTitle')
                }}</ion-title>
            </ion-button>
          </ion-buttons>
          <LocaleSelect device-scope="tablet" select-class="mr-4" />
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding separate-mixed-glue-content" :scroll-y="false">

      <div class="separate-mixed-glue-layout main-container max-w-full mx-auto page-content-loading-host">
        <PageContentLoadingOverlay :visible="isLoadingLine" />
        <!-- Thông tin header — cố định, không scroll -->
        <div class="separate-mixed-glue-header-card surface-card p-2 shadow-1 border-round-xl">
          <div class="grid align-items-end">
            <div class="col-12 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
              <InputText :model-value="headerInfo.orderNo" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-3">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
              <InputText :model-value="headerInfo.glue" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
              <InputText :model-value="headerInfo.totalWeight" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeightActual')
                }}</label>
              <InputText :model-value="totalWeightActualDisplay" fluid readonly class="font-bold text-blue-600" />
            </div>
            <div class="col-12 lg:col-2">
              <div class="flex gap-2 justify-content-end">
                <Button icon="pi pi-check-circle" severity="success" class="button-lg"
                  :disabled="isCompleteButtonDisabled" :loading="isCompleting" @click="handleComplete" />
              </div>
            </div>
          </div>
        </div>

        <!-- Vùng bảng — scroll khi nội dung dài -->
        <div class="separate-mixed-glue-scroll-body">
          <div v-if="hasMixChemicals" class="separate-mixed-glue-table-card surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl separate-mixed-glue-table-card__title">
              <span class="font-bold text-700 text-lg">
                <i class="pi pi-list mr-2"></i>{{ t('separateMixedGlue.management.sections.mixedGlueBucket') }}
              </span>
            </div>
            <div class="separate-mixed-glue-table-card__body">
              <SeparateGlue :is-loading="isLoadingLine" :order-details="mixedGlueTableDetails" :disabled="false"
                :disable-add-row="false" :request-details="requestDetails" :target-weight="mixSeparateTargetWeight"
                target-weight-unit="Kg" use-chiet-capacity-validation @update-bucket="handleMixSeparateBucketUpdate"
                @add-row="handleAddSeparateGlueRow" @delete-row="handleDeleteSeparateGlueRow" />
            </div>
          </div>

          <div v-if="hasNoMixChemicals" class="separate-mixed-glue-table-card surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl separate-mixed-glue-table-card__title">
              <span class="font-bold text-700 text-lg">
                <i class="pi pi-box mr-2"></i>{{ t('separateMixedGlue.management.sections.noMixGlue') }}
              </span>
            </div>
            <div class="separate-mixed-glue-table-card__body">
              <SeparateGlue :is-loading="isLoadingLine" :order-details="noMixGlueTableDetails" :disabled="false"
                :disable-add-row="false" :request-details="requestDetails" :target-weight="noMixSeparateTargetWeight"
                target-weight-unit="Kg" use-chiet-capacity-validation @update-bucket="handleNoMixSeparateBucketUpdate"
                @add-row="handleAddNoMixSeparateGlueRow" @delete-row="handleDeleteNoMixSeparateGlueRow" />
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonButton,
  IonTitle,
} from '@ionic/vue';

import SeparateGlue from '@/views/Tablet/Separate/components/SeparateGlue.vue';
import PageContentLoadingOverlay from '@/components/PageContentLoadingOverlay.vue';
import { useSeparateMixedGlueManagement } from './useSeparateMixedGlueManagement';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';

const { t } = useAppLocale(() => 'tablet');

const {
  headerInfo,
  totalWeightActualDisplay,
  mixSeparateTargetWeight,
  noMixSeparateTargetWeight,
  isLoadingLine,
  mixedGlueTableDetails,
  noMixGlueTableDetails,
  hasMixChemicals,
  hasNoMixChemicals,
  requestDetails,
  isNoMixGlue,
  saveDraftToStoreOnly,
  handleAddSeparateGlueRow,
  handleDeleteSeparateGlueRow,
  handleMixSeparateBucketUpdate,
  handleAddNoMixSeparateGlueRow,
  handleNoMixSeparateBucketUpdate,
  handleDeleteNoMixSeparateGlueRow,
  handleComplete,
  isCompleting,
  isCompleteButtonDisabled,
  goBack,
} = useSeparateMixedGlueManagement();
</script>

<style scoped>
.main-container {
  width: 100%;
}

.separate-mixed-glue-content {
  --overflow: hidden;
}

.page-content-loading-host {
  position: relative;
  min-height: 12rem;
}

.separate-mixed-glue-layout {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  gap: 0.75rem;
}

.separate-mixed-glue-header-card {
  flex-shrink: 0;
}

.separate-mixed-glue-scroll-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding-bottom: 0.5rem;
}

.separate-mixed-glue-table-card {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.separate-mixed-glue-table-card__title {
  flex-shrink: 0;
}

.separate-mixed-glue-table-card__body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
</style>
