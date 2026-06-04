<template>
  <ion-page>
    <ion-header class="header-container">
      <ion-toolbar color="primary">
        <ion-buttons slot="start">
          <ion-back-button default-href="/app-menu"></ion-back-button>
        </ion-buttons>
        <ion-title>{{ t('mobile.glueCheckList.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="mobile-content">
      <div class="menu-container">
        <section class="check-panel">
          <ion-button expand="block" class="confirm-button" :disabled="isLoadingScan" @click="openScanner">
            <ion-spinner v-if="isLoadingScan" name="crescent"></ion-spinner>
            <span v-else>{{ t('mobile.glueCheckList.scanButton') }}</span>
          </ion-button>
        </section>
      </div>

      <ion-modal
        :is-open="isCheckDialogOpen"
        class="check-form-modal"
        :backdrop-dismiss="false"
        @didDismiss="closeCheckDialog"
      >
        <div class="check-form-dialog">
          <div class="check-form-dialog__icon">
            <ion-icon :icon="clipboardOutline"></ion-icon>
          </div>

          <h2 class="check-form-dialog__title">{{ t('mobile.glueCheckList.dialogTitle') }}</h2>

          <div class="check-form-dialog__content">
            <div class="check-form-dialog__issue-row">
              <span class="check-form-dialog__issue-label">{{ t('mobile.glueCheckList.issueLabel') }}:</span>
              <span class="check-form-dialog__issue-value">{{ checkIssueName }}</span>
            </div>

            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label">{{ t('mobile.glueCheckList.resultLabel') }}</label>
              <button type="button" class="check-result-switch" @click="toggleCheckResult">
                <span
                  class="check-result-switch__option"
                  :class="{ 'check-result-switch__option--ok-active': checkResult }"
                >
                  {{ t('mobile.glueCheckList.okResult') }}
                </span>
                <span
                  class="check-result-switch__option"
                  :class="{ 'check-result-switch__option--not-ok-active': !checkResult }"
                >
                  {{ t('mobile.glueCheckList.notOkResult') }}
                </span>
              </button>
            </div>

            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label" for="glue-check-note">
                {{ t('mobile.glueCheckList.noteLabel') }}
              </label>
              <textarea
                id="glue-check-note"
                v-model="checkNote"
                class="check-form-dialog__textarea"
                :placeholder="t('mobile.glueCheckList.notePlaceholder')"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="check-form-dialog__actions">
            <ion-button fill="clear" color="medium" :disabled="isSubmittingForm" @click="cancelCheckForm">
              {{ t('mobile.glueCheckList.cancelButton') }}
            </ion-button>
            <ion-button fill="clear" color="primary" :disabled="isSubmittingForm" @click="submitCheckForm">
              <ion-spinner v-if="isSubmittingForm" name="crescent"></ion-spinner>
              <span v-else>{{ t('mobile.glueCheckList.submitButton') }}</span>
            </ion-button>
          </div>
        </div>
      </ion-modal>

      <ion-toast
        :is-open="showSuccessToast"
        :message="toastMessage"
        duration="1800"
        position="top"
        color="success"
        @didDismiss="showSuccessToast = false"
      ></ion-toast>
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
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { clipboardOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/store/auth';
import checkListApi from '@/api/checkList';
import dayjs from 'dayjs';

const { t } = useI18n();
const authStore = useAuthStore();

const scannedCheckQr = ref<{ factoryId: string; cliId: string } | null>(null);
const scannedCheckItem = ref<any>(null);
const checkResult = ref(true);
const checkNote = ref('');
const isCheckDialogOpen = ref(false);
const isLoadingScan = ref(false);
const isSubmittingForm = ref(false);
const showSuccessToast = ref(false);
const toastMessage = ref('');

const checkIssueName = computed(() => normalizeValue(scannedCheckItem.value?.checkListName));

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

function toggleCheckResult() {
  checkResult.value = !checkResult.value;
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
  alert(message);
}

function resetCheckForm() {
  scannedCheckQr.value = null;
  scannedCheckItem.value = null;
  checkResult.value = true;
  checkNote.value = '';
}

async function openScanner() {
  if (isLoadingScan.value) {
    return;
  }

  try {
    const { camera } = await BarcodeScanner.requestPermissions();

    if (camera !== 'granted' && camera !== 'limited') {
      alert(t('mobile.glueCheckList.messages.cameraPermission'));
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
    const response = await checkListApi.getCheckListItem(qrParams.factoryId, qrParams.cliId);
    const responseData = response.data as any;

    if (!responseData?.success || !responseData?.data) {
      await showWarningAlert(responseData?.message || t('mobile.glueCheckList.messages.noCheckListData'));
      return;
    }

    scannedCheckQr.value = qrParams;
    scannedCheckItem.value = responseData.data;
    checkResult.value = true;
    checkNote.value = '';
    isCheckDialogOpen.value = true;
  } catch (error) {
    console.error('Lỗi khi quét mã kiểm tra:', error);
    alert(t('mobile.glueCheckList.messages.scanError'));
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
  if (!scannedCheckQr.value || !scannedCheckItem.value) {
    alert(t('mobile.glueCheckList.messages.noCheckListData'));
    return;
  }

  const userId = getCurrentUserId();

  const payload = {
    factoryId: scannedCheckQr.value.factoryId,
    checkListItemId: String(scannedCheckItem.value.checkListItemId ?? '').trim(),
    checkTime: dayjs().format('YYYY-MM-DDTHH:mm:ss.SSS'),
    result: checkResult.value,
    note: checkNote.value.trim(),
    recordStatus,
    createrId: userId,
    updaterId: userId,
  };

  console.group(`[GlueCheckList] POST /api/mobile/checklist/create`);
  console.info('Request payload:', payload);

  try {
    const response = await checkListApi.createCheckList(payload);
    console.info('Response:', response?.data ?? response);

    const responseData = response.data as any;

    if (!responseData.success || responseData.data !== true) {
      throw new Error(responseData.message || t('mobile.glueCheckList.messages.submitError'));
    }

    toastMessage.value = recordStatus === 'C'
      ? t('mobile.glueCheckList.messages.cancelSuccess')
      : t('mobile.glueCheckList.messages.submitSuccess');

    showSuccessToast.value = true;
    closeCheckDialog();
  } catch (error) {
    console.error('Không thể gửi thông tin kiểm tra:', error);

    const errorMessage = error instanceof Error && error.message
      ? error.message
      : t('mobile.glueCheckList.messages.submitError');

    alert(errorMessage);
  } finally {
    console.groupEnd();
  }
}

async function submitCheckForm() {
  await sendCheckForm('1');
}

async function cancelCheckForm() {
  await sendCheckForm('C');
}
</script>

<style scoped lang="scss">
.header-container {
  ion-toolbar {
    --background: #0b56d9;
    --color: #ffffff;
  }

  ion-title {
    color: #ffffff;
    font-size: 18px !important;
    font-weight: 700;
  }
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
  font-size: 16px !important;
  font-weight: 700;
  text-transform: none;
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
  text-align: center;

  &__icon {
    width: 48px;
    height: 48px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 12px;
    border-radius: 50%;
    background: #eaf2ff;
    color: #0b72ed;

    ion-icon {
      font-size: 1.8rem;
    }
  }

  &__title {
    margin: 0 0 18px;
    color: #081a36;
    font-size: 16px !important;
    font-weight: 700;
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
    text-align: left;
    white-space: normal;
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
    font-size: 14px !important;
    line-height: 1.45;
    outline: none;
    background: #ffffff;

    &:focus {
      border-color: #0b72ed;
      box-shadow: 0 0 0 3px rgba(11, 114, 237, 0.12);
    }
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
  border: 1px solid transparent;
  border-radius: 12px;
  color: #94a3b8;
  font-size: 14px !important;
  font-weight: 800;
  background: transparent;
  transition: all 0.16s ease;

  &--ok-active {
    border-color: #16a34a;
    color: #ffffff;
    background: #16a34a;
  }

  &--not-ok-active {
    border-color: #dc2626;
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

    &__icon {
      width: 64px;
      height: 64px;
      margin-bottom: 18px;

      ion-icon {
        font-size: 2.4rem;
      }
    }

    &__title {
      font-size: 1.7rem !important;
    }
  }
}
</style>
