<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary" class="header-toolbar">
        <div slot="start" class="header-start">
          <ion-back-button default-href="/app-menu" text="" class="header-back"></ion-back-button>
          <h1 class="header-title">{{ t('mobile.glueCheckList.title') }}</h1>
        </div>
        <ion-buttons slot="end" class="header-end">
          <NetworkStatusIcon />
        </ion-buttons>
      </ion-toolbar>
      <MobileOfflineNotice />
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="check-panel">
          <ion-button expand="block" class="confirm-button" :disabled="isLoadingScan" @click="openScanner">
            <ion-spinner v-if="isLoadingScan" name="crescent"></ion-spinner>
            <span v-else class="confirm-button__content">
              <span class="confirm-button__icon">
                <McScanFill />
              </span>
              <span class="confirm-button__text">
                {{ t('mobile.glueCheckList.scanButton') }}
              </span>
            </span>
          </ion-button>
        </section>
      </div>

      <ion-modal :is-open="isCheckDialogOpen" class="check-form-modal" :backdrop-dismiss="false"
        @didDismiss="closeCheckDialog">
        <div class="check-form-dialog">
          <div class="check-form-dialog__header">
            <ion-icon :icon="clipboardOutline" class="check-form-dialog__header-icon"></ion-icon>
            <h2 class="check-form-dialog__title">{{ t('mobile.glueCheckList.dialogTitle') }}</h2>
          </div>

          <div class="check-form-dialog__content">
            <div class="check-form-dialog__issue-row">
              <span class="check-form-dialog__issue-label">{{ t('mobile.glueCheckList.issueLabel') }}:</span>
              <span class="check-form-dialog__issue-value">{{ checkIssueName }}</span>
            </div>

            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label">{{ t('mobile.glueCheckList.resultLabel') }}</label>
              <button type="button" class="check-result-switch" @click="toggleCheckResult">
                <span class="check-result-switch__option"
                  :class="{ 'check-result-switch__option--ok-active': checkResult }">
                  {{ t('mobile.glueCheckList.okResult') }}
                </span>
                <span class="check-result-switch__option"
                  :class="{ 'check-result-switch__option--not-ok-active': !checkResult }">
                  {{ t('mobile.glueCheckList.notOkResult') }}
                </span>
              </button>
            </div>

            <div v-if="!checkResult" class="check-form-dialog__field">
              <label class="check-form-dialog__label">{{ t('mobile.glueCheckList.abnormalLabel') }}</label>
              <Select v-model="selectedAbnormalItemId" class="check-form-dialog__select w-full"
                :options="abnormalOptions" option-label="checkListAbnormalName" option-value="checkListAbnormalItemId"
                :placeholder="t('mobile.glueCheckList.abnormalPlaceholder')" :loading="isLoadingAbnormalOptions"
                :disabled="isSubmittingForm || isLoadingAbnormalOptions" show-clear append-to="body"
                @show="loadAbnormalOptions" @change="onAbnormalSelectChange" />
            </div>

            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label" for="glue-check-note">
                {{ t('mobile.glueCheckList.noteLabel') }}
              </label>
              <textarea id="glue-check-note" v-model="checkNote" class="check-form-dialog__textarea"
                :class="{ 'check-form-dialog__textarea--disabled': isNoteLockedByAbnormal }"
                :placeholder="t('mobile.glueCheckList.notePlaceholder')" rows="3"
                :disabled="isNoteLockedByAbnormal || isSubmittingForm"></textarea>
              <p v-if="isIssueDetailRequired" class="check-form-dialog__note-message">
                {{ t('mobile.glueCheckList.submitRequired') }}
              </p>
            </div>
          </div>

          <div class="check-form-dialog__actions">
            <Button :label="t('mobile.glueCheckList.cancelButton')" severity="secondary" :disabled="isSubmittingForm"
              @click="cancelCheckForm" />
            <Button :label="t('mobile.glueCheckList.submitButton')" severity="primary" :loading="isSubmittingForm"
              :disabled="isSubmittingForm || isIssueDetailRequired" @click="submitCheckForm" />
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonSpinner,
  IonToolbar,
} from '@ionic/vue';
import { clipboardOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/store/auth';
import checkListApi from '@/api/checkList';
import { findCheckListAbnormalOfflineData, findCheckListOfflineData } from '@/services/glueOfflineData.service';
import { addOfflineQueueItem } from '@/services/offlineQueue.service';
import { useOfflineStore } from '@/store/offline';
import { useAppToast } from '@/composables/useAppToast';
import { McScanFill } from '@kalimahapps/vue-icons/mc';
import MobileOfflineNotice from '@/views/Mobile/components/MobileOfflineNotice.vue';
import NetworkStatusIcon from '@/views/Mobile/components/NetworkStatusIcon.vue';
import dayjs from 'dayjs';

const { t } = useI18n();
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const { showToast } = useAppToast();

const scannedCheckQr = ref<{ factoryId: string; cliId: string } | null>(null);
const scannedCheckItem = ref<any>(null);
const checkResult = ref(true);
const checkNote = ref('');
const selectedAbnormalItemId = ref<number | string | null>(null);
const abnormalOptions = ref<Array<{
  factoryId?: string;
  checkListAbnormalItemId: number | string;
  checkListAbnormalName: string;
  checkListItemId?: number | string;
}>>([]);
const isLoadingAbnormalOptions = ref(false);
const hasLoadedAbnormalOptions = ref(false);
const isCheckDialogOpen = ref(false);
const isLoadingScan = ref(false);
const isSubmittingForm = ref(false);
const checkIssueName = computed(() => normalizeValue(scannedCheckItem.value?.checkListName));
const hasAbnormalSelection = computed(
  () => selectedAbnormalItemId.value !== null && selectedAbnormalItemId.value !== undefined && selectedAbnormalItemId.value !== ''
);
const isNoteLockedByAbnormal = computed(() => hasAbnormalSelection.value);
/** Có vấn đề thì bắt buộc chọn bất thường hoặc nhập ghi chú. */
const isIssueDetailRequired = computed(
  () => !checkResult.value && !hasAbnormalSelection.value && !checkNote.value.trim()
);

function normalizeValue(value: any) {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
}

function getBarcodeValue(barcode: { rawValue?: string; displayValue?: string }) {
  return barcode.rawValue || barcode.displayValue || '';
}

function getCurrentUserId() {
  return authStore.user?.employeeId || authStore.token || localStorage.getItem('web_token_backup') || '';
}

function parseCheckListQrText(qrText: string) {
  const normalizedText = normalizeValue(qrText).replace(/^\/+|\/+$/g, '');
  const parts = normalizedText.split('/').map(part => part.trim()).filter(Boolean);

  if (parts.length !== 2) {
    return null;
  }

  const [factoryId, cliId] = parts;

  if (!factoryId || !cliId) {
    return null;
  }

  return { factoryId, cliId };
}

async function resolveCheckListItem(factoryId: string, cliId: string) {
  if (!authStore.isOnline) {
    const offlineResult = await findCheckListOfflineData(factoryId, cliId);

    if (offlineResult.status !== 'success' || !offlineResult.data) {
      return { data: null, success: false, message: t('mobile.glueCheckList.messages.noCheckListData') };
    }

    return { data: offlineResult.data, success: true, message: '' };
  }

  const response = await checkListApi.getCheckListItem(factoryId, cliId);
  const responseData = response.data as any;

  return {
    data: responseData?.data ?? null,
    success: !!responseData?.success && !!responseData?.data,
    message: responseData?.message || t('mobile.glueCheckList.messages.noCheckListData'),
  };
}

function toggleCheckResult() {
  checkResult.value = !checkResult.value;

  if (checkResult.value) {
    selectedAbnormalItemId.value = null;
    return;
  }

  // Chọn "Có vấn đề" — sẵn sàng load list khi mở Select.
  hasLoadedAbnormalOptions.value = false;
}

function onAbnormalSelectChange() {
  if (hasAbnormalSelection.value) {
    checkNote.value = '';
  }
}

async function loadAbnormalOptions() {
  if (checkResult.value || isLoadingAbnormalOptions.value) {
    return;
  }

  if (hasLoadedAbnormalOptions.value && abnormalOptions.value.length > 0) {
    return;
  }

  const factoryId = normalizeValue(
    scannedCheckQr.value?.factoryId || scannedCheckItem.value?.factoryId
  );
  const checkListItemId = scannedCheckItem.value?.checkListItemId
    ?? scannedCheckQr.value?.cliId
    ?? '';

  if (!factoryId || checkListItemId === '' || checkListItemId === null || checkListItemId === undefined) {
    showToast({
      severity: 'warn',
      summary: t('mobile.glueCheckList.title'),
      detail: t('mobile.glueCheckList.messages.noCheckListData'),
    });
    return;
  }

  isLoadingAbnormalOptions.value = true;
  try {
    let items: any[] = [];

    if (!authStore.isOnline) {
      const offlineResult = await findCheckListAbnormalOfflineData(factoryId, checkListItemId);
      items = offlineResult.data;

      if (items.length === 0) {
        abnormalOptions.value = [];
        hasLoadedAbnormalOptions.value = true;
        showToast({
          severity: 'warn',
          summary: t('mobile.glueCheckList.title'),
          detail: t('mobile.glueCheckList.messages.abnormalOffline'),
        });
        return;
      }
    } else {
      const response = await checkListApi.getCheckList(factoryId, checkListItemId);
      const responseData = response?.data as any;

      if (responseData?.success === false) {
        throw new Error(responseData?.message || t('mobile.glueCheckList.messages.abnormalLoadError'));
      }

      items = Array.isArray(responseData?.data)
        ? responseData.data
        : Array.isArray(responseData)
          ? responseData
          : [];
    }

    abnormalOptions.value = items.filter((item: any) =>
      item?.checkListAbnormalItemId !== null
      && item?.checkListAbnormalItemId !== undefined
      && normalizeValue(item?.checkListAbnormalName)
    );
    hasLoadedAbnormalOptions.value = true;
  } catch (error) {
    console.error('Không thể tải danh sách bất thường:', error);
    abnormalOptions.value = [];
    hasLoadedAbnormalOptions.value = false;
    showToast({
      severity: 'warn',
      summary: t('mobile.glueCheckList.title'),
      detail: error instanceof Error && error.message
        ? error.message
        : t('mobile.glueCheckList.messages.abnormalLoadError'),
    });
  } finally {
    isLoadingAbnormalOptions.value = false;
  }
}

async function triggerWarningFeedback() {
  try {
    await Haptics.notification({ type: NotificationType.Warning });
  } catch (error) {
    console.warn('Haptics is not available:', error);
  }
}

async function showWarningAlert(message: string) {
  await triggerWarningFeedback();
  showToast({
    severity: 'warn',
    summary: t('mobile.glueCheckList.title'),
    detail: message,
  });
}

function resetCheckForm() {
  scannedCheckQr.value = null;
  scannedCheckItem.value = null;
  checkResult.value = true;
  checkNote.value = '';
  selectedAbnormalItemId.value = null;
  abnormalOptions.value = [];
  hasLoadedAbnormalOptions.value = false;
  isLoadingAbnormalOptions.value = false;
}

async function openScanner() {
  if (isLoadingScan.value) {
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      showToast({
        severity: 'warn',
        summary: t('mobile.glueCheckList.title'),
        detail: t('mobile.glueCheckList.messages.cameraPermission'),
      });
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (!barcodes?.length) {
      return;
    }

    const scannedValue = getBarcodeValue(barcodes[0]).trim();

    if (!scannedValue) {
      await showWarningAlert(t('mobile.glueCheckList.messages.invalidQr'));
      return;
    }

    const qrParams = parseCheckListQrText(scannedValue);

    if (!qrParams) {
      await showWarningAlert(t('mobile.glueCheckList.messages.invalidQr'));
      return;
    }

    isLoadingScan.value = true;
    const result = await resolveCheckListItem(qrParams.factoryId, qrParams.cliId);

    if (!result.success || !result.data) {
      await showWarningAlert(result.message || t('mobile.glueCheckList.messages.noCheckListData'));
      return;
    }

    scannedCheckQr.value = qrParams;
    scannedCheckItem.value = result.data;
    checkResult.value = true;
    checkNote.value = '';
    selectedAbnormalItemId.value = null;
    abnormalOptions.value = [];
    hasLoadedAbnormalOptions.value = false;
    isCheckDialogOpen.value = true;
  } catch (error) {
    console.error('Lỗi khi quét mã kiểm tra:', error);
    showToast({
      severity: 'warn',
      summary: t('mobile.glueCheckList.title'),
      detail: t('mobile.glueCheckList.messages.scanError'),
    });
  } finally {
    isLoadingScan.value = false;
  }
}

function resetAndCloseCheckDialog() {
  isCheckDialogOpen.value = false;
  resetCheckForm();
}

function closeCheckDialog() {
  if (isSubmittingForm.value) {
    return;
  }

  resetAndCloseCheckDialog();
}

async function sendCheckForm(recordStatus: '1' | 'C') {
  if (isSubmittingForm.value) {
    return;
  }

  if (!scannedCheckQr.value || !scannedCheckItem.value) {
    showToast({
      severity: 'warn',
      summary: t('mobile.glueCheckList.title'),
      detail: t('mobile.glueCheckList.messages.noCheckListData'),
    });
    return;
  }

  isSubmittingForm.value = true;
  const userId = getCurrentUserId();

  const payload = {
    factoryId: scannedCheckQr.value.factoryId,
    checkListItemId: String(scannedCheckItem.value.checkListItemId ?? '').trim(),
    checkTime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS'),
    result: checkResult.value,
    note: hasAbnormalSelection.value ? '' : checkNote.value.trim(),
    recordStatus,
    createrId: userId,
    updaterId: userId,
    checkListAbnormalItemId: hasAbnormalSelection.value
      ? selectedAbnormalItemId.value
      : 0,
  };

  try {
    if (!authStore.isOnline) {
      await addOfflineQueueItem('GlueCheckList', 'api/mobile/checklist/create', 'POST', payload);
      await offlineStore.refreshQueueCounts();
      if (recordStatus !== 'C') {
        notifyToast(t('mobile.offlineQueue.saved'), 'offlineQueue');
      }
      resetAndCloseCheckDialog();
      return;
    }

    const response = await checkListApi.createCheckList(payload);

    const responseData = response.data as any;

    if (!responseData.success || responseData.data !== true) {
      throw new Error(responseData.message || t('mobile.glueCheckList.messages.submitError'));
    }

    if (recordStatus !== 'C') {
      notifyToast(t('mobile.glueCheckList.messages.submitSuccess'));
    }
    resetAndCloseCheckDialog();
  } catch (error) {
    console.error('Không thể gửi thông tin kiểm tra:', error);

    const errorMessage = error instanceof Error && error.message
      ? error.message
      : t('mobile.glueCheckList.messages.submitError');

    showToast({
      severity: 'warn',
      summary: t('mobile.glueCheckList.title'),
      detail: errorMessage,
    });
  } finally {
    isSubmittingForm.value = false;
    console.groupEnd();
  }
}

async function submitCheckForm() {
  if (isIssueDetailRequired.value) {
    return;
  }
  await sendCheckForm('1');
}

async function cancelCheckForm() {
  await sendCheckForm('C');
}

function notifyToast(message: string, type: 'success' | 'offlineQueue' = 'success') {
  showToast({
    severity: type === 'offlineQueue' ? 'warn' : 'success',
    summary: type === 'offlineQueue'
      ? t('mobile.offlineQueue.title')
      : t('mobile.glueCheckList.title'),
    detail: message,
  });
}
</script>

<style scoped lang="scss">
.header-container {
  ion-toolbar.header-toolbar {
    --background: #0b56d9;
    --color: #ffffff;
    --min-height: 56px;
    --padding-start: 4px;
    --padding-end: 10px;
    --padding-top: 6px;
    --padding-bottom: 6px;
  }
}

.header-start {
  display: flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
  max-width: calc(100vw - 88px);
  padding-inline-end: 8px;
}

.header-back {
  margin: 0;
  --padding-start: 6px;
  --padding-end: 2px;
  --icon-margin-end: 0;
  --icon-margin-start: 0;
}

.header-title {
  margin: 0;
  min-width: 0;
  color: #ffffff;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: 0.01em;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
}

.header-end {
  margin: 0;
}

.mobile-content {
  --background: #f6f9fd;
}

.menu-container {
  width: 100%;
  max-width: 560px;
  margin: 0 auto;
  padding: 24px 16px 34px;
}

.check-panel {
  width: 100%;
}

.confirm-button {
  width: 100%;
  min-height: 52px;
  margin: 0;
  --border-radius: 16px;
  --background: #0b72ed;
  --background-activated: #075fcc;
  --background-focused: #0b72ed;
  --background-hover: #0b72ed;
  --color: #ffffff;
  --padding-top: 0;
  --padding-bottom: 0;
  font-size: 16px !important;
  font-weight: 700;
  text-transform: none;
}

.confirm-button::part(native) {
  display: flex;
  align-items: center;
  justify-content: center;
}

.confirm-button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  line-height: 1;
}

.confirm-button__icon {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 22px;
  line-height: 1;
}

.confirm-button__icon :deep(svg) {
  width: 22px;
  height: 22px;
  display: block;
}

.confirm-button__text {
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.check-form-modal {
  --width: min(90vw, 390px);
  --height: auto;
  --border-radius: 20px;
  --box-shadow: 0 18px 48px rgba(15, 23, 42, 0.2);
}

.check-form-dialog {
  padding: 26px 22px 12px;
  border-radius: 20px;
  background: #ffffff;

  &__header {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-bottom: 18px;
  }

  &__header-icon {
    flex-shrink: 0;
    color: #0b72ed;
    font-size: 1.6rem;
  }

  &__title {
    margin: 0;
    color: #081a36;
    font-size: 16px !important;
    font-weight: 700;
    line-height: 1.3;
  }

  &__content {
    display: flex;
    flex-direction: column;
    gap: 14px;
    text-align: left;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  &__label {
    color: #475569;
    font-size: 14px !important;
    font-weight: 700;
  }

  &__issue-row {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding-bottom: 14px;
    border-bottom: 1px solid #e5e7eb;
  }

  &__issue-label {
    flex: 0 0 70px;
    color: #475569;
    font-size: 14px !important;
    font-weight: 700;
    line-height: 1.45;
  }

  &__issue-value {
    flex: 1 1 auto;
    min-width: 0;
    color: #081a36;
    font-size: 15px !important;
    font-weight: 700;
    line-height: 1.45;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  &__textarea {
    width: 100%;
    min-height: 92px;
    resize: vertical;
    padding: 12px;
    border: 1px solid #d5dbe6a8;
    border-radius: 12px;
    color: #081a36;
    font-family: 'Inter', sans-serif !important;
    font-size: 14px !important;
    line-height: 1.45;
    outline: none;
    background: #ffffff;

    &::placeholder {
      font-family: 'Inter', sans-serif !important;
    }

    &:focus {
      border-color: #0b72ed;
      box-shadow: 0 0 0 3px rgba(11, 114, 237, 0.12);
    }

    &--disabled,
    &:disabled {
      color: #94a3b8;
      background: #f8fafc;
      cursor: not-allowed;
    }
  }

  &__select {
    width: 100%;
  }

  &__note-message {
    margin: 0;
    color: #64748b;
    font-size: 12px !important;
    font-weight: 600;
    line-height: 1.4;
  }

  &__actions {
    display: flex;
    justify-content: flex-end;
    gap: 6px;
    margin-top: 22px;
  }
}

.check-result-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  width: 100%;
  min-height: 48px;
  padding: 4px;
  border: 1px solid #d5dbe6a8;
  border-radius: 16px;
  background: #f1f5f9;
}

.check-result-switch__option {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 38px;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 14px !important;
  font-weight: 800;
  background: transparent;

  &--ok-active {
    color: #ffffff;
    background: #16a34a;
  }

  &--not-ok-active {
    color: #ffffff;
    background: #dc2626;
  }
}

@media (min-width: 768px) {
  .menu-container {
    max-width: 660px;
    padding: 32px 24px 48px;
  }

  .confirm-button {
    min-height: 56px;
    --border-radius: 18px;
  }

  .check-form-modal {
    --width: min(82vw, 460px);
    --border-radius: 24px;
  }

  .check-form-dialog {
    padding: 34px 30px 16px;
    border-radius: 24px;

    &__title {
      font-size: 18px !important;
    }
  }
}
</style>
