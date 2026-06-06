<template>
  <div class="mobile-login-wrapper animate__animated animate__fadeIn"
    :class="{ 'mobile-login-wrapper--scanning': isScanning }">
    <div class="top-background login-layer" :class="{ 'login-layer--hidden': isScanning }"></div>

    <div class="content-wrapper login-layer" :class="{ 'login-layer--hidden': isScanning }">
      <div class="form-container shadow-lg">
        <div v-if="!isTablet" class="mobile-lang-bar">
          <LocaleSelect device-scope="mobile" />
        </div>
        <div class="form-inner">
          <div class="side-info" :class="{ 'side-info--tablet shadow-sm': isTablet }">
            <div v-if="isTablet" class="side-info-toolbar">
              <LocaleSelect device-scope="tablet" />
            </div>
            <div class="side-info-content">
              <img src="/assets/icon/icon.png" alt="Logo" class="form-logo" />
              <div class="login-header">
                <h3>{{ t('login.hello') }}</h3>
                <p>{{ t('login.subtitle') }}</p>
              </div>
            </div>
          </div>

          <div class="side-form">
            <template v-if="!isTablet">
              <div class="scan-instruction shadow-sm">
                <div class="scan-icon-wrapper">
                  <i class="pi pi-qrcode scan-icon pulse-animation"></i>
                </div>
                <h4>{{ t('login.scanTitle') }}</h4>
                <p v-if="!errorLogin">
                  {{ t('login.scanInstructionPrefix') }}<strong>{{ t('login.scanInstructionQr') }}</strong>{{
                    t('login.scanInstructionSuffix') }}
                </p>
                <p v-else class="login-error-message">{{ errorMessage }}</p>

                <!-- <div v-if="code" class="animate__animated animate__fadeIn scanned-result-box"
                  :class="errorLogin ? 'scanned-result-error' : 'scanned-result'">
                  <i class="scanned-result-box__icon"
                    :class="errorLogin ? 'pi pi-times-circle' : 'pi pi-check-circle'"></i>
                  <span class="scanned-result-box__text">{{ t('login.employeeCode') }}</span>
                </div> -->
              </div>

              <Button class="login-btn scan-btn w-full"
                :label="isLoggingIn ? t('login.loggingIn') : (isLoading ? t('login.processing') : t('login.scanButton'))"
                :icon="isLoading || isLoggingIn ? undefined : 'pi pi-camera'" :loading="isLoading || isLoggingIn"
                :disabled="isLoggingIn" @click="startScan" />
            </template>

            <template v-else>
              <div class="tablet-login-form shadow-sm">
                <div class="field-group">
                  <label for="company" class="field-label">{{ t('login.company') }}</label>
                  <Select id="company" v-model="selectedCompany" :options="companyOptions" optionLabel="label"
                    optionValue="value" :placeholder="t('login.selectCompany')" class="w-full"
                    :disabled="isLoading || isLoggingIn || isLoadingCompanies" :loading="isLoadingCompanies"
                    @show="handleCompanySelectShow" />
                </div>

                <div class="field-group">
                  <label for="factory" class="field-label">{{ t('login.factory') }}</label>
                  <Select id="factory" v-model="selectedFactory" :options="factoryOptions" optionLabel="label"
                    optionValue="value" :placeholder="t('login.selectFactory')" class="w-full"
                    :disabled="!isFactoryFieldEnabled || isLoading || isLoggingIn || isLoadingFactories"
                    :loading="isLoadingFactories" @show="handleFactorySelectShow" />
                </div>

                <div class="field-group">
                  <label for="employeeId" class="field-label">{{ t('login.account') }}</label>
                  <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText id="employeeId" v-model="employeeId" :placeholder="t('login.employeeIdPlaceholder')"
                      class="w-full" :disabled="!isCredentialFieldsEnabled || isLoading || isLoggingIn" />
                  </IconField>
                </div>

                <div class="field-group">
                  <label for="password" class="field-label">{{ t('login.password') }}</label>
                  <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText id="password" v-model="password" :type="showPassword ? 'text' : 'password'"
                      placeholder="********" class="w-full"
                      :disabled="!isCredentialFieldsEnabled || isLoading || isLoggingIn"
                      @keyup.enter="handleTabletLogin" />
                    <InputIcon class="password-toggle-icon pi"
                      :class="[showPassword ? 'pi-eye-slash' : 'pi-eye', { 'password-toggle-icon--disabled': !isCredentialFieldsEnabled || isLoading || isLoggingIn }]"
                      @click="togglePasswordVisibility" />
                  </IconField>
                </div>

                <p v-if="errorLogin" class="login-error-message">{{ errorMessage }}</p>

                <div class="tablet-login-actions">
                  <Button class="tablet-login-btn flex-1"
                    :label="isLoggingIn ? t('login.loggingIn') : (isLoading ? t('login.processing') : t('login.loginButton'))"
                    :loading="isLoading || isLoggingIn" :disabled="!isLoginButtonEnabled || isLoggingIn"
                    @click="handleTabletLogin" />
                  <Button class="tablet-scan-btn" icon="pi pi-qrcode" severity="secondary" outlined
                    :disabled="isLoading || isScanning || isLoggingIn" :loading="isScanning || isLoggingIn"
                    @click="startScan" />
                </div>
              </div>
            </template>
          </div>
        </div>

        <div class="footer-note">
          <p>{{ t('login.footer') }}</p>
        </div>
      </div>
    </div>

    <OfflineDataLoading v-if="shouldUseMobileOffline"
      :is-open="isLoggingIn && isLoginRoute"
      :title="loginLoadingTitle"
      :note="loginLoadingNote"
      :current="loginLoadingCurrent"
      :total="loginLoadingTotal"
    />

    <Teleport to="body">
      <div v-if="isScanning" class="scan-camera-overlay">
        <div class="scan-camera-content">
          <p class="scan-camera-title">{{ t('login.scanOverlayTitle') }}</p>
          <p class="scan-camera-note">
            {{ t('login.scanOverlayNotePrefix') }}<strong>{{ t('login.scanInstructionQr') }}</strong>{{
              t('login.scanOverlayNoteSuffix') }}
          </p>

          <div class="scan-camera-frame">
            <span class="scan-corner scan-corner--tl"></span>
            <span class="scan-corner scan-corner--tr"></span>
            <span class="scan-corner scan-corner--bl"></span>
            <span class="scan-corner scan-corner--br"></span>
            <span class="scan-frame-line"></span>
          </div>

          <div class="scan-camera-hint-wrapper flex justify-center items-center gap-2">
            <p class="scan-camera-hint">
              <i class="pi pi-camera"></i>
              {{ t('login.cameraFrontOn') }}
            </p>

            <Button class="scan-cancel-btn" :label="t('login.cancelScan')" icon="pi pi-times" severity="secondary"
              @click="cancelScan" />
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { useBackButton } from '@ionic/vue';
import { BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import type { PluginListenerHandle } from '@capacitor/core';
import employee from '@/api/employee';
import companyApi from '@/api/company';
import factoryApi from '@/api/factory';
import { useAuthStore } from '@/store/auth';
import { useRouter, useRoute } from 'vue-router';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { useAppLocale } from '@/composables/useAppLocale';
import type { DeviceLocaleScope } from '@/i18n';
import LocaleSelect from '@/components/LocaleSelect.vue';
import OfflineDataLoading from '@/views/Mobile/components/OfflineDataLoading.vue';
import { useOfflineStore } from '@/store/offline';
import { useOfflineLoginStore } from '@/store/offlineLogin';

type SelectOption = { label: string; value: string };

const code = ref('');
const employeeId = ref('');
const password = ref('');
const showPassword = ref(false);
const selectedCompany = ref('');
const selectedFactory = ref('');
const companyOptions = ref<SelectOption[]>([]);
const factoryOptions = ref<SelectOption[]>([]);
const authStore = useAuthStore();
const offlineStore = useOfflineStore();
const offlineLoginStore = useOfflineLoginStore();
const router = useRouter();
const route = useRoute();
const isNative = Capacitor.isNativePlatform();
const isTablet = ref(window.innerWidth >= 768);
const { t, syncLocaleForDevice } = useAppLocale(
  () => (isTablet.value ? 'tablet' : 'mobile') as DeviceLocaleScope
);

const errorLogin = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);
const isLoggingIn = ref(false);
const isScanning = ref(false);
const isLoadingCompanies = ref(false);
const isLoadingFactories = ref(false);

let scanListener: PluginListenerHandle | null = null;

const isFactoryFieldEnabled = computed(() => !!selectedCompany.value && !isLoadingCompanies.value);
const isCredentialFieldsEnabled = computed(() => !!selectedFactory.value && !isLoadingFactories.value);
const isLoginButtonEnabled = computed(() => {
  return !!selectedCompany.value
    && !!selectedFactory.value
    && !!employeeId.value.trim()
    && !!password.value
    && !isLoading.value
    && !isLoggingIn.value
    && !isScanning.value;
});

const isLoginRoute = computed(() => route.path === '/login');
const shouldUseMobileOffline = computed(() => !isTablet.value);
const isOfflineSyncStep = computed(() => offlineStore.isSyncingQueue || offlineStore.syncTotal > 0);
const isOfflineDownloadStep = computed(() => offlineStore.isDownloadingOfflineData || offlineStore.downloadTotal > 0);
const loginLoadingTitle = computed(() => {
  if (isOfflineSyncStep.value) return t('login.offlineSyncTitle');
  if (isOfflineDownloadStep.value) return t('login.offlineDownloadTitle');
  return t('login.loadingTitle');
});
const loginLoadingNote = computed(() => {
  if (isOfflineSyncStep.value) return t('login.offlineSyncNote');
  if (isOfflineDownloadStep.value) return t('login.offlineDownloadNote');
  return t('login.loadingNote');
});
const loginLoadingCurrent = computed(() => (
  isOfflineSyncStep.value ? offlineStore.syncCurrent : offlineStore.downloadCurrent
));
const loginLoadingTotal = computed(() => (
  isOfflineSyncStep.value ? offlineStore.syncTotal : offlineStore.downloadTotal
));

const togglePasswordVisibility = () => {
  if (!isCredentialFieldsEnabled.value || isLoading.value || isLoggingIn.value) return;
  showPassword.value = !showPassword.value;
};

const resetLoginLoading = () => {
  isLoggingIn.value = false;
  isLoading.value = false;
};

const toSelectOptions = (
  items: unknown[],
  idKeys: string[],
  labelKeys: string[]
): SelectOption[] => {
  return items
    .map((raw) => {
      const item = raw as Record<string, unknown>;
      const id = idKeys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== '');
      const label = labelKeys.map((key) => item[key]).find((value) => value !== undefined && value !== null && value !== '');
      if (id === undefined || id === null || id === '') return null;
      return {
        value: String(id),
        label: String(label ?? id)
      };
    })
    .filter((item): item is SelectOption => item !== null);
};

const extractListItems = (responseData: any) => {
  const payload = responseData?.data ?? responseData ?? {};
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload.items)) return payload.items;
  return [];
};

const fetchCompanies = async () => {
  isLoadingCompanies.value = true;
  try {
    const { data } = await companyApi.postCompanyList();
    if (data?.success) {
      companyOptions.value = toSelectOptions(
        extractListItems(data),
        ['companyId', 'id', 'value'],
        ['companyName', 'name', 'label']
      );
    } else {
      companyOptions.value = [];
    }
  } catch (error) {
    console.error('Lỗi tải danh sách công ty:', error);
    companyOptions.value = [];
  } finally {
    isLoadingCompanies.value = false;
  }
};

const fetchFactories = async (companyId: string) => {
  isLoadingFactories.value = true;

  try {
    const { data } = await factoryApi.postFactoryList(companyId);
    if (data?.success) {
      factoryOptions.value = toSelectOptions(
        extractListItems(data),
        ['factoryId', 'id', 'value'],
        ['factoryName', 'name', 'label']
      );
    } else {
      factoryOptions.value = [];
    }
  } catch (error) {
    console.error('Lỗi tải danh sách nhà máy:', error);
    factoryOptions.value = [];
  } finally {
    isLoadingFactories.value = false;
  }
};

const handleCompanySelectShow = () => {
  if (isLoadingCompanies.value || isLoading.value || isLoggingIn.value) return;
  void fetchCompanies();
};

const handleFactorySelectShow = () => {
  if (!selectedCompany.value || isLoadingFactories.value || isLoading.value || isLoggingIn.value) return;
  void fetchFactories(String(selectedCompany.value));
};

watch(selectedCompany, (companyId) => {
  selectedFactory.value = '';
  factoryOptions.value = [];
  employeeId.value = '';
  password.value = '';
  errorLogin.value = false;
  errorMessage.value = '';

  if (!companyId) return;
});

watch(selectedFactory, () => {
  employeeId.value = '';
  password.value = '';
  errorLogin.value = false;
  errorMessage.value = '';
});

watch(() => route.path, (path) => {
  if (path !== '/login') {
    resetLoginLoading();
  }
});

const updateDeviceType = () => {
  const wasTablet = isTablet.value;
  isTablet.value = window.innerWidth >= 768;
  if (wasTablet !== isTablet.value) {
    void syncLocaleForDevice();
  }
};

onMounted(async () => {
  window.addEventListener('resize', updateDeviceType);
  await syncLocaleForDevice();
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
  resetLoginLoading();
  void stopScanner();
});

const setScannerUiActive = (active: boolean) => {
  document.body.classList.toggle('barcode-scanner-active', active);
  document.documentElement.classList.toggle('barcode-scanner-active', active);
  document.querySelector('ion-app')?.classList.toggle('barcode-scanner-active', active);
};

const cleanupScanner = async () => {
  if (scanListener) {
    await scanListener.remove();
    scanListener = null;
  }
  await BarcodeScanner.removeAllListeners().catch(() => undefined);
  await BarcodeScanner.stopScan().catch(() => undefined);
};

const stopScanner = async () => {
  isScanning.value = false;
  setScannerUiActive(false);
  await cleanupScanner();
};

const cancelScan = async () => {
  await stopScanner();
  if (!isLoggingIn.value) {
    isLoading.value = false;
  }
};

// Tablet: nút Back vật lý thoát chế độ quét thay vì thoát app
useBackButton(10, (processNextHandler) => {
  if (isTablet.value && isScanning.value) {
    void cancelScan();
    return;
  }
  processNextHandler();
});

const getBarcodeValue = (barcode: { rawValue?: string; displayValue?: string }) => {
  return barcode.rawValue || barcode.displayValue || '';
};

const beginFrontCameraScan = async () => {
  isScanning.value = true;
  setScannerUiActive(true);
  await nextTick();

  scanListener = await BarcodeScanner.addListener('barcodesScanned', async (event) => {
    const scannedValue = event.barcodes?.[0] ? getBarcodeValue(event.barcodes[0]) : '';
    if (!scannedValue) return;

    isLoggingIn.value = true;
    isLoading.value = true;
    await stopScanner();

    try {
      await processScannedData(scannedValue);
    } catch (error) {
      console.error('Lỗi khi xử lý mã quét:', error);
      handleLoginError(scannedValue);
    }
  });

  await BarcodeScanner.startScan({
    lensFacing: LensFacing.Front
  });
};

const buildTabletLoginPayload = () => ({
  companyId: String(selectedCompany.value ?? ''),
  factoryId: String(selectedFactory.value ?? ''),
  employeeId: String(employeeId.value.trim()),
  password: String(password.value)
});

const normalizeLoginValue = (value: any) => {
  if (value === null || value === undefined) {
    return '';
  }

  return String(value).trim();
};

const getNestedValue = (source: any, path: string[]) => {
  return path.reduce((current, key) => current?.[key], source);
};

const resolveLoginFactoryId = (userData: any, fallbackFactoryId = '') => {
  const candidates = [
    userData?.factoryId,
    userData?.factoryID,
    userData?.factoryCode,
    userData?.factory,
    getNestedValue(userData, ['factory', 'factoryId']),
    getNestedValue(userData, ['employee', 'factoryId']),
    getNestedValue(userData, ['user', 'factoryId']),
    fallbackFactoryId,
  ];

  return candidates.map(normalizeLoginValue).find(Boolean) || '';
};

const getCurrentNetworkStatus = async () => {
  try {
    const status = await Network.getStatus();
    authStore.setNetworkStatus(status.connected);
    return status.connected;
  } catch (error) {
    console.warn('Không thể kiểm tra trạng thái mạng trước khi đăng nhập:', error);
    return authStore.isOnline;
  }
};

const ensureLoginOnline = async () => {
  const isOnline = await getCurrentNetworkStatus();

  if (!isOnline) {
    errorLogin.value = true;
    errorMessage.value = t('login.offlineLoginBlocked');
    resetLoginLoading();
    return false;
  }

  return true;
};

const handleOfflineScannedLogin = async (scannedCode: string) => {
  const savedUserData = await offlineLoginStore.getMatchedOfflineUser(scannedCode);

  if (!savedUserData) {
    code.value = scannedCode;
    errorLogin.value = true;
    errorMessage.value = t('login.invalidOfflineUser');
    resetLoginLoading();
    return false;
  }

  authStore.setAuthData(savedUserData);
  offlineLoginStore.markOfflineLoginSession();
  await navigateAfterLogin();
  resetLoginLoading();
  return true;
};

const syncPendingOfflineDataAfterLogin = async () => {
  await offlineStore.refreshQueueCounts();

  if (offlineStore.totalPendingQueueCount <= 0) {
    return;
  }

  await offlineStore.syncPendingQueue();
  offlineStore.resetSyncState();
};

const downloadOfflineDataAfterLogin = async (userData: any, fallbackFactoryId = '') => {
  const factoryId = resolveLoginFactoryId(userData, fallbackFactoryId);

  if (!factoryId) {
    throw new Error(t('login.offlineFactoryMissing'));
  }

  offlineStore.resetDownloadState();
  await offlineStore.downloadOfflineQrData(factoryId);
};

const getLoginErrorMessage = (error: any, fallback: string) => {
  return error?.response?.data?.message || error?.message || fallback;
};

const navigateAfterLogin = async () => {
  if (isNative) {
    await router.push('/app-menu');
  } else {
    await router.push('/dashboard');
  }
};

const handleLoginResponse = async (response: any, loginCode: string, fallbackFactoryId = ''): Promise<boolean> => {
  if (response.data?.success) {
    const userData = response.data.data;
    authStore.setAuthData(userData);
    isLoggingIn.value = true;
    isLoading.value = true;

    try {
      if (shouldUseMobileOffline.value) {
        await syncPendingOfflineDataAfterLogin();
        await downloadOfflineDataAfterLogin(userData, fallbackFactoryId);
        await offlineLoginStore.saveOnlineLogin(loginCode, userData);
        offlineLoginStore.markOnlineSession();
      }
      await navigateAfterLogin();
    } catch (error: any) {
      console.error('Lỗi xử lý dữ liệu offline sau đăng nhập:', error);
      code.value = loginCode;
      errorLogin.value = true;
      errorMessage.value = getLoginErrorMessage(error, t('login.offlineDownloadFailed'));
      await authStore.logout();
      return false;
    } finally {
      resetLoginLoading();
      offlineStore.resetDownloadState();
      offlineStore.resetSyncState();
    }

    return true;
  }

  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = response.data?.message || t('login.loginFailed');
  resetLoginLoading();
  return false;
};

const handleLoginError = (loginCode: string) => {
  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = t('login.serverMaintenance');
  offlineStore.resetDownloadState();
  offlineStore.resetSyncState();
  resetLoginLoading();
};

const handleTabletLogin = async () => {
  if (!isLoginButtonEnabled.value) return;

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const payload = buildTabletLoginPayload();

  isLoggingIn.value = true;
  isLoading.value = true;
  errorLogin.value = false;
  errorMessage.value = '';
  offlineStore.resetDownloadState();
  offlineStore.resetSyncState();

  if (!(await ensureLoginOnline())) {
    return;
  }

  try {
    const response = await employee.employeeLogin({
      loginMode: 'Password',
      companyId: payload.companyId,
      factoryId: payload.factoryId,
      employeeId: payload.employeeId,
      password: payload.password
    });
    await handleLoginResponse(response, payload.employeeId, payload.factoryId);
  } catch (error: any) {
    console.error('Lỗi đăng nhập tablet:', error);
    handleLoginError(payload.employeeId);
  }
};

const startScan = async () => {
  isLoading.value = true;
  errorLogin.value = false;
  code.value = '';
  errorMessage.value = '';

  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      alert(t('login.cameraPermission'));
      isLoading.value = false;
      return;
    }

    if (isTablet.value && isNative) {
      await beginFrontCameraScan();
      return;
    }

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes?.length) {
      const scannedValue = getBarcodeValue(barcodes[0]);
      if (scannedValue) {
        await processScannedData(scannedValue);
      } else {
        alert(t('login.invalidBarcode'));
      }
    }
  } catch (error) {
    console.error('Lỗi khi quét:', error);
    await stopScanner();
  } finally {
    if (!isScanning.value && !isLoggingIn.value) {
      isLoading.value = false;
    }
  }
};

const processScannedData = async (scannedCode: string) => {
  isLoggingIn.value = true;
  isLoading.value = true;
  code.value = scannedCode;
  offlineStore.resetDownloadState();
  offlineStore.resetSyncState();

  if (!scannedCode) {
    alert(t('login.enterEmployeeId'));
    isLoggingIn.value = false;
    isLoading.value = false;
    return;
  }

  const isOnline = await getCurrentNetworkStatus();

  if (!isOnline) {
    if (shouldUseMobileOffline.value) {
      await handleOfflineScannedLogin(scannedCode);
      return;
    }

    errorLogin.value = true;
    errorMessage.value = t('login.offlineLoginBlocked');
    resetLoginLoading();
    return;
  }

  try {
    const response = await employee.employeeLogin({
      loginMode: 'Scan',
      employeeId: String(scannedCode)
    });
    await handleLoginResponse(response, scannedCode);
  } catch (error: any) {
    console.error('Lỗi gọi API đăng nhập:', error);
    handleLoginError(scannedCode);
  }
};
</script>

<style scoped>
.mobile-login-wrapper {
  background: #f4f7f9;
  min-height: 100vh;
  position: relative;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  transition: background-color 0.2s ease;
}

.mobile-login-wrapper--scanning {
  background: transparent;
}

.login-layer {
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.login-layer--hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.top-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 35vh;
  background-image: url('/assets/cty.png');
  background-size: cover;
  background-position: center;
  border-bottom-left-radius: 50px;
  border-bottom-right-radius: 50px;
  z-index: 0;
  transition: all 0.3s ease;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 100vh;
}

.form-container {
  background: white;
  border-radius: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.05);
  padding: 18px;
  max-width: 450px;
  width: 100%;
  transition: all 0.3s ease;
}

.mobile-lang-bar {
  display: flex;
  justify-content: end;
}

.form-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
  align-items: stretch;
  min-width: 0;
  width: 100%;
}

.side-info {
  position: relative;
  display: flex;
  flex-direction: column;
  flex: 1;
  text-align: center;
  min-height: 0;
}

.side-info--tablet {
  padding: 28px 22px;
}

.side-info-toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 1;
}

.side-info-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
}

.side-form {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.form-logo {
  display: block;
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.login-header {
  padding: 0;
}

.login-header h3 {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 5px 0;
  color: #317af0;
}

.login-header p {
  margin: 0;
  color: #64748b;
  font-size: 1rem;
}

.footer-note {
  text-align: center;
  margin-top: 25px;
  color: #94a3b8;
  font-size: 0.85rem;
}

.scan-instruction {
  background: #f8fafc;
  border-radius: 20px;
  padding: 18px;
  text-align: center;
  border: 2px dashed #cbd5e1;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
}

.scan-icon-wrapper {
  background: #c3f0dc73;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 10px;
}

.scan-icon {
  font-size: 1.5rem;
  color: #6ed3b3;
}

.pulse-animation {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.scan-instruction h4 {
  color: #317af0;
  font-weight: 700;
  margin: 0 0 8px 0;
  font-size: 1.2rem;
}

.scan-instruction p {
  color: #64748b;
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.5;
  max-width: 100%;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.scanned-result,
.scanned-result-error {
  margin-top: 15px;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-weight: 700;
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  text-align: left;
}

.scanned-result {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.scanned-result-error {
  background: #fee2e2;
  color: #b84040;
  border: 1px solid #fecaca;
}

.scanned-result-box__icon {
  flex-shrink: 0;
  margin-top: 0.1rem;
  font-size: 1rem;
}

.scanned-result-box__text {
  flex: 1;
  min-width: 0;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
}

.login-error-message {
  box-sizing: border-box;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  margin: 0 0 0.75rem;
  padding: 0.65rem 0.75rem;
  color: #b84040;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  line-height: 1.45;
  text-align: left;
  white-space: normal;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.login-btn.scan-btn {
  margin-top: 20px;
  height: 3.75rem;
  letter-spacing: 1px;
  font-size: 1.5rem !important;
  border-radius: 16px;
  background-color: #6ed3b3;
  color: #fff;

  &:deep(.pi) {
    font-size: 1.5rem !important;
    color: #fff;
  }

  &:hover {
    background-color: #6ed3b3;
    color: #fff;
  }
}

.tablet-login-form {
  background: #f8fafc;
  border-radius: 20px;
  padding: 28px 22px;
  border: 1px solid #e2e8f0;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-width: 0;
  width: 100%;
  overflow: hidden;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.field-label {
  font-weight: 700;
  color: #317af0;
  font-size: 0.95rem;
}

.password-toggle-icon {
  cursor: pointer;
  color: #64748b;
  transition: color 0.2s ease;
}

.password-toggle-icon:hover {
  color: #317af0;
}

.password-toggle-icon--disabled {
  cursor: not-allowed;
  opacity: 0.45;
  pointer-events: none;
}

.tablet-login-actions {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 8px;
}

.tablet-login-btn {
  height: 3.8rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 14px;
}

.tablet-scan-btn {
  width: 3.8rem;
  min-width: 3.5rem;
  height: 3.8rem;
  border-radius: 14px;
  border: 5px solid #6ed3b3 !important;
}

.tablet-scan-btn :deep(.pi) {
  font-size: 2rem;
  color: #6ed3b3;
}

:global(.login-loading-overlay) {
  position: fixed;
  inset: 0;
  z-index: 100000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.72);
  pointer-events: auto;
}

:global(.login-loading-panel) {
  width: min(100%, 360px);
  padding: 28px 24px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.98);
  text-align: center;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.22);
}

:global(.login-loading-spinner) {
  font-size: 2.4rem;
  color: #2563eb;
  animation: login-spinner-rotate 0.9s linear infinite;
}

:global(.login-loading-title) {
  margin: 18px 0 8px;
  font-size: 1.15rem;
  font-weight: 700;
  color: #1e293b;
}

:global(.login-loading-note) {
  margin: 0;
  color: #64748b;
  font-size: 0.92rem;
}

@keyframes login-spinner-rotate {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

:global(.scan-camera-overlay) {
  position: fixed;
  inset: 0;
  z-index: 99999;
  visibility: visible;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background: rgba(15, 23, 42, 0.1);
  pointer-events: auto;
}

:global(.scan-camera-content) {
  width: 100%;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

:global(.scan-camera-title) {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

:global(.scan-camera-note) {
  margin: 0 0 24px;
  max-width: 360px;
  font-size: 1.2rem;
  line-height: 1.5;
  color: #fff;
}

:global(.scan-camera-frame) {
  position: relative;
  width: min(78vw, 600px);
  height: min(52vw, 280px);
  border: 2px solid rgba(255, 255, 255, 0.88);
  border-radius: 20px;
  box-shadow: 0 0 0 9999px rgba(15, 23, 42, 0.55);
  overflow: hidden;
}

:global(.scan-corner) {
  position: absolute;
  width: 32px;
  height: 32px;
  border: 4px solid #38bdf8;
  z-index: 2;
}

:global(.scan-corner--tl) {
  top: -2px;
  left: -2px;
  border-right: none;
  border-bottom: none;
  border-top-left-radius: 18px;
}

:global(.scan-corner--tr) {
  top: -2px;
  right: -2px;
  border-left: none;
  border-bottom: none;
  border-top-right-radius: 18px;
}

:global(.scan-corner--bl) {
  bottom: -2px;
  left: -2px;
  border-right: none;
  border-top: none;
  border-bottom-left-radius: 18px;
}

:global(.scan-corner--br) {
  bottom: -2px;
  right: -2px;
  border-left: none;
  border-top: none;
  border-bottom-right-radius: 18px;
}

:global(.scan-frame-line) {
  position: absolute;
  left: 8%;
  right: 8%;
  top: 18%;
  height: 2px;
  background: linear-gradient(90deg, transparent, #38bdf8, transparent);
  box-shadow: 0 0 12px rgba(56, 189, 248, 0.85);
  animation: scan-line-move 2.2s ease-in-out infinite;
}

:global(.scan-camera-hint) {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 28px 0 20px;
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.12);
  color: #f8fafc;
  font-size: 1.2rem;
  backdrop-filter: blur(4px);
}

:global(.scan-cancel-btn) {
  min-width: 180px;
  height: 60px;
  margin: 28px 0 20px;

  &:deep(.pi) {
    font-size: 1.2rem !important;
    color: black;
  }

  &:deep(.p-button-label) {
    font-size: 1.2rem !important;
    color: black;
  }
}

@keyframes scan-line-move {
  0% {
    top: 18%;
    opacity: 0.35;
  }

  50% {
    top: 78%;
    opacity: 1;
  }

  100% {
    top: 18%;
    opacity: 0.35;
  }
}

@media (max-height: 500px) and (orientation: landscape) {
  .top-background {
    height: 15vh;
    border-radius: 0 0 20px 20px;
  }

  .content-wrapper {
    align-items: flex-start;
    padding-top: 20px;
    min-height: auto;
  }

  .form-container {
    padding: 20px;
  }

  .form-logo {
    object-fit: cover;
  }
}

@media (min-width: 768px) and (orientation: portrait) {
  .top-background {
    height: 40vh;
  }

  .form-container {
    max-width: 550px;
    padding: 50px 40px;
  }

  .login-header h3 {
    font-size: 2.3rem;
  }
}

@media (min-width: 800px) and (orientation: landscape) {
  .top-background {
    height: 50vh;
    border-radius: 0 0 100px 100px;
  }

  .form-container {
    max-width: 850px;
    padding: 50px;
  }

  .form-inner {
    flex-direction: row;
    align-items: stretch;
    gap: 50px;
  }

  .side-info,
  .side-form {
    flex: 1;
  }

  .login-header h3 {
    font-size: 2.5rem;
  }

  .form-logo {
    width: 100%;
    height: 120px;
    object-fit: cover;
  }

  .side-info {
    border-right: inset;
  }
}
</style>

<style>
body.barcode-scanner-active,
html.barcode-scanner-active,
ion-app.barcode-scanner-active {
  visibility: hidden;
  background: transparent !important;
  --background: transparent;
  --ion-background-color: transparent;
}

body.barcode-scanner-active .scan-camera-overlay,
html.barcode-scanner-active .scan-camera-overlay,
ion-app.barcode-scanner-active .scan-camera-overlay,
body.barcode-scanner-active .login-loading-overlay,
html.barcode-scanner-active .login-loading-overlay,
ion-app.barcode-scanner-active .login-loading-overlay {
  visibility: visible;
}

body.barcode-scanner-active ion-content,
body.barcode-scanner-active .ion-page,
body.barcode-scanner-active .mobile-login-wrapper,
body.barcode-scanner-active .form-container,
body.barcode-scanner-active .tablet-login-form {
  --background: transparent;
  background: transparent !important;
}
</style>
