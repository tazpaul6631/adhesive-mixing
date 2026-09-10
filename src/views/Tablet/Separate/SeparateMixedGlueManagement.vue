<template>
  <AppPage>
    <AppHeader no-border class="tablet-list-header">
      <template #start>
        <button type="button" class="header-back" @click="goBack">
          <i class="pi pi-angle-left text-xl mr-1"></i>
          <h1 class="header-title">{{ t('separateMixedGlue.management.pageTitle') }}</h1>
        </button>
      </template>
      <template #end>
        <div class="flex align-items-center gap-2 mr-2">
          <NetworkStatusIcon />
          <LocaleSelect device-scope="tablet" />
        </div>
      </template>
    </AppHeader>

    <AppContent class="separate-mixed-glue-content" :scroll="false" :padding="true">

      <div class="separate-mixed-glue-layout main-container max-w-full mx-auto">
        <!-- Thông tin header — cố định, không scroll -->
        <div class="separate-mixed-glue-header-card surface-card p-2 shadow-1 border-round-xl">
          <div class="separate-mixed-glue-header-fields">
            <div class="separate-mixed-glue-header-field separate-mixed-glue-header-field--order">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.workOrder') }}</label>
              <InputText :model-value="headerInfo.orderNo" readonly
                class="font-bold text-blue-600 separate-mixed-glue-header-input separate-mixed-glue-header-input--fit"
                :style="{ width: headerFieldWidthFit(headerInfo.orderNo, 10) }" />
            </div>
            <div class="separate-mixed-glue-header-field separate-mixed-glue-header-field--glue">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.glue') }}</label>
              <InputText :model-value="headerInfo.glue" readonly
                class="font-bold text-blue-600 separate-mixed-glue-header-input separate-mixed-glue-header-input--truncate"
                :style="{ width: headerFieldWidth(headerInfo.glue, 6, 18) }" :title="headerInfo.glue" />
            </div>
            <div class="separate-mixed-glue-header-field separate-mixed-glue-header-field--weight">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeight') }}</label>
              <InputText :model-value="headerInfo.totalWeight" readonly
                class="font-bold text-blue-600 separate-mixed-glue-header-input"
                :style="{ width: headerFieldWidth(headerInfo.totalWeight, 5, 10) }" />
            </div>
            <div class="separate-mixed-glue-header-field separate-mixed-glue-header-field--weight">
              <label class="text-800 font-medium mb-1 block">{{ t('mixGlueManagement.fields.totalWeightActual')
              }}</label>
              <InputText :model-value="totalWeightActualDisplay" readonly
                class="font-bold text-blue-600 separate-mixed-glue-header-input"
                :style="{ width: headerFieldWidth(totalWeightActualDisplay, 5, 10) }" />
            </div>
            <div class="separate-mixed-glue-header-actions">
              <Button icon="pi pi-check-circle" severity="success" class="button-lg"
                :disabled="isCompleteButtonDisabled" :loading="isCompleting" @click="handleComplete" />
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
                target-weight-unit="Kg" @update-bucket="handleMixSeparateBucketUpdate"
                @add-row="handleAddSeparateGlueRow" @delete-row="handleDeleteSeparateGlueRow" />
            </div>
          </div>

          <div v-if="hasNoMixChemicals"
            class="separate-mixed-glue-table-card surface-card p-0 shadow-1 border-round-xl">
            <div class="surface-100 p-3 border-round-top-xl separate-mixed-glue-table-card__title">
              <span class="font-bold text-700 text-lg">
                <i class="pi pi-box mr-2"></i>{{ t('separateMixedGlue.management.sections.noMixGlue') }}
              </span>
            </div>
            <div class="separate-mixed-glue-table-card__body">
              <SeparateGlue :is-loading="isLoadingLine" :order-details="noMixGlueTableDetails" :disabled="false"
                :disable-add-row="false" :request-details="requestDetails" :target-weight="noMixSeparateTargetWeight"
                target-weight-unit="Kg" @update-bucket="handleNoMixSeparateBucketUpdate"
                @add-row="handleAddNoMixSeparateGlueRow" @delete-row="handleDeleteNoMixSeparateGlueRow" />
            </div>
          </div>
        </div>
      </div>
    </AppContent>

    <Dialog v-model:visible="showExitDialog" modal :header="t('separateMixedGlue.exitAlert.header')"
      :style="{ width: 'min(92vw, 420px)' }" :closable="false" @hide="onExitDialogHide">
      <p class="m-0 text-600 line-height-3">{{ t('separateMixedGlue.exitAlert.message') }}</p>
      <template #footer>
        <Button :label="t('separateMixedGlue.exitAlert.stay')" icon="pi pi-times" text severity="secondary" size="large"
          :disabled="isExitConfirming" @click="onExitStay" />
        <Button :label="t('separateMixedGlue.exitAlert.exit')" icon="pi pi-sign-out" severity="danger" size="large"
          :loading="isExitConfirming" @click="onExitConfirm" />
      </template>
    </Dialog>
  </AppPage>
</template>

<script setup lang="ts">
import SeparateGlue from '@/views/Tablet/Separate/components/SeparateGlue.vue';
import { useSeparateMixedGlueManagement } from './useSeparateMixedGlueManagement';
import LocaleSelect from '@/components/LocaleSelect.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import { useAppLocale } from '@/composables/useAppLocale';
import { AppPage, AppHeader, AppContent } from '@/components/layout';

const { t } = useAppLocale(() => 'tablet');

/** Width theo đủ độ dài value (không cắt …). */
const headerFieldWidthFit = (value: string | number | null | undefined, minCh: number) => {
  const len = String(value ?? '').length;
  const ch = Math.max(minCh, len + 2);
  return `${ch}ch`;
};

/** Width theo value, kẹp max — dùng cho glue / weight. */
const headerFieldWidth = (value: string | number | null | undefined, minCh: number, maxCh: number) => {
  const len = String(value ?? '').length;
  const ch = Math.min(maxCh, Math.max(minCh, len + 2));
  return `${ch}ch`;
};

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
  showExitDialog,
  isExitConfirming,
  onExitStay,
  onExitConfirm,
  onExitDialogHide,
} = useSeparateMixedGlueManagement();
</script>

<style scoped>
.tablet-list-header :deep(.app-header__toolbar) {
  min-height: 50px;
  padding-inline: 4px 8px;
}

.header-back {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin: 0;
  padding: 4px 4px 4px 6px;
  border: none;
  background: transparent;
  color: #ffffff;
  cursor: pointer;
  min-width: 0;
}

.header-title {
  margin: 0;
  min-width: 0;
  color: #ffffff;
  font-size: 1.125rem;
  font-weight: 700;
  line-height: 50px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.main-container {
  width: 100%;
}

.separate-mixed-glue-content {
  display: flex;
  flex-direction: column;
}

.separate-mixed-glue-layout {
  display: flex;
  flex-direction: column;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  gap: 0.75rem;
}

.separate-mixed-glue-header-card {
  flex-shrink: 0;
}

.separate-mixed-glue-header-fields {
  display: flex;
  flex-wrap: nowrap;
  align-items: flex-end;
  gap: 0.5rem 0.75rem;
  min-width: 0;
  width: 100%;
  overflow-x: auto;
}

.separate-mixed-glue-header-field {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.separate-mixed-glue-header-field--order {
  flex: 0 0 auto;
  min-width: auto;
  max-width: none;
}

.separate-mixed-glue-header-field--glue {
  flex: 0 0 auto;
  max-width: 20rem;
  min-width: 0;
}

.separate-mixed-glue-header-field--weight {
  flex: 0 0 auto;
}

.separate-mixed-glue-header-input {
  box-sizing: border-box;
}

.separate-mixed-glue-header-input--fit {
  max-width: none;
  overflow: visible;
  text-overflow: clip;
  white-space: nowrap;
}

.separate-mixed-glue-header-input--truncate {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.separate-mixed-glue-header-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex: 0 0 auto;
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
