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
          <ion-button expand="block" class="confirm-button" @click="openScanner">
            {{ t('mobile.glueCheckList.scanButton') }}
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
            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label">{{ t('mobile.glueCheckList.scannedCodeLabel') }}</label>
              <div class="check-form-dialog__readonly-value">{{ scannedCheckCode }}</div>
            </div>

            <div class="check-form-dialog__field">
              <label class="check-form-dialog__label">{{ t('mobile.glueCheckList.resultLabel') }}</label>
              <div class="check-result-options">
                <button
                  type="button"
                  class="check-result-option"
                  :class="{ 'check-result-option--active': checkResult === 'ok' }"
                  @click="checkResult = 'ok'"
                >
                  {{ t('mobile.glueCheckList.okResult') }}
                </button>
                <button
                  type="button"
                  class="check-result-option"
                  :class="{ 'check-result-option--active': checkResult === 'notOk' }"
                  @click="checkResult = 'notOk'"
                >
                  {{ t('mobile.glueCheckList.notOkResult') }}
                </button>
              </div>
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
            <ion-button fill="clear" color="medium" @click="closeCheckDialog">
              {{ t('mobile.glueCheckList.cancelButton') }}
            </ion-button>
            <ion-button fill="clear" color="primary" @click="submitCheckForm">
              {{ t('mobile.glueCheckList.submitButton') }}
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
import { ref } from 'vue';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToast,
  IonToolbar,
} from '@ionic/vue';
import { clipboardOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import { Haptics, NotificationType } from '@capacitor/haptics';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '@/store/auth';

const { t } = useI18n();
const authStore = useAuthStore();

const scannedCheckCode = ref('');
const checkResult = ref<'ok' | 'notOk'>('ok');
const checkNote = ref('');
const isCheckDialogOpen = ref(false);
const showSuccessToast = ref(false);
const toastMessage = ref('');

function getBarcodeValue(barcode: { rawValue?: string; displayValue?: string }) {
  return barcode.rawValue || barcode.displayValue || '';
}

function getCurrentUserId() {
  return authStore.user?.employeeId || authStore.token || localStorage.getItem('web_token_backup') || '';
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
  scannedCheckCode.value = '';
  checkResult.value = 'ok';
  checkNote.value = '';
}

async function openScanner() {
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

    scannedCheckCode.value = scannedValue;
    checkResult.value = 'ok';
    checkNote.value = '';
    isCheckDialogOpen.value = true;
  } catch (error) {
    console.error('Lỗi khi quét mã kiểm tra:', error);
    alert(t('mobile.glueCheckList.messages.scanError'));
  }
}

function closeCheckDialog() {
  isCheckDialogOpen.value = false;
  resetCheckForm();
}

function submitCheckForm() {
  const payloadPreview = {
    scannedCode: scannedCheckCode.value,
    result: checkResult.value,
    note: checkNote.value.trim(),
    checkerId: getCurrentUserId(),
    checkedAt: new Date().toISOString(),
  };

  console.info('[GlueCheckList] Submit preview:', payloadPreview);
  toastMessage.value = t('mobile.glueCheckList.messages.submitSuccess');
  showSuccessToast.value = true;
  closeCheckDialog();
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
  --box-shadow: 0 10px 22px rgba(11, 114, 237, 0.28);
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

  &__readonly-value {
    min-height: 42px;
    display: flex;
    align-items: center;
    padding: 10px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    color: #081a36;
    font-size: 14px !important;
    font-weight: 600;
    line-height: 1.35;
    word-break: break-all;
    background: #f8fafc;
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

.check-result-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.check-result-option {
  min-height: 42px;
  border: 1px solid #d5dbe6a8;
  border-radius: 12px;
  color: #475569;
  font-size: 14px !important;
  font-weight: 700;
  background: #ffffff;

  &--active {
    border-color: #0b72ed;
    color: #0b56d9;
    background: #eaf2ff;
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
