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
                <Button :disabled="isNoMixGlue ? isNoMixGlueOperationLocked : separateGlueComplete"
                  icon="pi pi-check-circle" severity="success" size="large" @click="handleComplete" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="hasMixChemicals" class="surface-card p-0 shadow-1 border-round-xl mt-3">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-list mr-2"></i>{{ t('separateMixedGlue.management.sections.mixedGlueBucket') }}
            </span>
          </div>
          <SeparateGlue :is-loading="isLoadingLine" :order-details="mixedGlueTableDetails"
            :disabled="separateGlueComplete" :disable-add-row="separateGlueComplete" :request-details="requestDetails"
            :target-weight="mixSeparateTargetWeight" target-weight-unit="Kg" use-chiet-capacity-validation
            @update-bucket="saveDraftToStoreOnly" @add-row="handleAddSeparateGlueRow"
            @delete-row="handleDeleteSeparateGlueRow" />
        </div>

        <div v-if="hasNoMixChemicals" class="surface-card p-0 shadow-1 border-round-xl mt-3">
          <div class="surface-100 p-3 border-round-top-xl">
            <span class="font-bold text-700 text-lg">
              <i class="pi pi-box mr-2"></i>{{ t('separateMixedGlue.management.sections.noMixGlue') }}
            </span>
          </div>
          <SeparateGlue :is-loading="isLoadingLine" :order-details="noMixGlueTableDetails"
            :disabled="isNoMixGlue ? isNoMixGlueOperationLocked : separateGlueComplete"
            :disable-add-row="isNoMixGlue ? isNoMixGlueOperationLocked : separateGlueComplete"
            :request-details="requestDetails" :target-weight="noMixSeparateTargetWeight" target-weight-unit="Kg"
            use-chiet-capacity-validation @update-bucket="handleNoMixSeparateBucketUpdate"
            @add-row="handleAddNoMixSeparateGlueRow" @delete-row="handleDeleteNoMixSeparateGlueRow" />
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
  separateGlueComplete,
  isNoMixGlue,
  isNoMixGlueOperationLocked,
  saveDraftToStoreOnly,
  handleAddSeparateGlueRow,
  handleDeleteSeparateGlueRow,
  handleAddNoMixSeparateGlueRow,
  handleNoMixSeparateBucketUpdate,
  handleDeleteNoMixSeparateGlueRow,
  handleComplete,
  goBack,
} = useSeparateMixedGlueManagement();
</script>

<style scoped>
.main-container {
  width: 100%;
}
</style>
