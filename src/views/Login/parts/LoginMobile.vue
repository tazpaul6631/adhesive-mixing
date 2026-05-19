<template>
  <div class="mobile-login-wrapper animate__animated animate__fadeIn"
    :class="{ 'mobile-login-wrapper--scanning': isScanning }">
    <div class="top-background login-layer" :class="{ 'login-layer--hidden': isScanning }"></div>

    <div class="content-wrapper login-layer" :class="{ 'login-layer--hidden': isScanning }">
      <div class="form-container shadow-lg">
        <div class="form-inner">
          <div class="side-info">
            <img src="/assets/icon/icon.png" alt="Logo" class="form-logo" />
            <div class="login-header">
              <h3>Xin chào!</h3>
              <p>Hệ thống phòng pha keo</p>
            </div>
          </div>

          <div class="side-form">
            <template v-if="!isTablet">
              <div class="scan-instruction shadow-sm">
                <div class="scan-icon-wrapper">
                  <i class="pi pi-qrcode scan-icon pulse-animation"></i>
                </div>
                <h4>Đăng nhập bằng thẻ</h4>
                <p v-if="!errorLogin">Vui lòng quét mã <strong>QR hoặc Mã vạch/Barcode</strong> trên thẻ nhân viên của
                  bạn để vào hệ
                  thống.</p>
                <p v-else class="text-danger">{{ errorMessage }}</p>

                <div v-if="code" class="animate__animated animate__fadeIn"
                  :class="errorLogin ? 'scanned-result-error' : 'scanned-result'">
                  <i :class="errorLogin ? 'pi pi-times-circle' : 'pi pi-check-circle'"></i>
                  <span>Mã NV: {{ code }}</span>
                </div>
              </div>

              <Button class="login-btn scan-btn w-full"
                :label="isLoggingIn ? 'ĐANG ĐĂNG NHẬP...' : (isLoading ? 'ĐANG XỬ LÝ...' : 'QUÉT MÃ')"
                :icon="isLoading || isLoggingIn ? undefined : 'pi pi-camera'" :loading="isLoading || isLoggingIn"
                :disabled="isLoggingIn" @click="startScan" />
            </template>

            <template v-else>
              <div class="tablet-login-form shadow-sm">
                <div class="field-group">
                  <label for="company" class="field-label">Công ty</label>
                  <Select id="company" v-model="selectedCompany" :options="companyOptions" optionLabel="label"
                    optionValue="value" placeholder="Chọn công ty" class="w-full"
                    :disabled="isLoading || isLoggingIn || isLoadingCompanies" :loading="isLoadingCompanies" />
                </div>

                <div class="field-group">
                  <label for="factory" class="field-label">Nhà máy</label>
                  <Select id="factory" v-model="selectedFactory" :options="factoryOptions" optionLabel="label"
                    optionValue="value" placeholder="Chọn nhà máy" class="w-full"
                    :disabled="!isFactoryFieldEnabled || isLoading || isLoggingIn || isLoadingFactories"
                    :loading="isLoadingFactories" />
                </div>

                <div class="field-group">
                  <label for="username" class="field-label">Tài khoản</label>
                  <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText id="username" v-model="username" placeholder="Mã số nhân viên" class="w-full"
                      :disabled="!isCredentialFieldsEnabled || isLoading || isLoggingIn" />
                  </IconField>
                </div>

                <div class="field-group">
                  <label for="password" class="field-label">Mật khẩu</label>
                  <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText id="password" v-model="password" type="password" placeholder="********" class="w-full"
                      :disabled="!isCredentialFieldsEnabled || isLoading || isLoggingIn"
                      @keyup.enter="handleTabletLogin" />
                  </IconField>
                </div>

                <p v-if="errorLogin" class="text-danger">{{ errorMessage }}</p>

                <div class="tablet-login-actions">
                  <Button class="tablet-login-btn flex-1"
                    :label="isLoggingIn ? 'ĐANG ĐĂNG NHẬP...' : (isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP')"
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
          <p>© 2026 IT Jia Hsin</p>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="isLoggingIn && isLoginRoute" class="login-loading-overlay">
        <div class="login-loading-panel">
          <i class="pi pi-spinner login-loading-spinner"></i>
          <p class="login-loading-title">Đang đăng nhập...</p>
          <p class="login-loading-note">Vui lòng đợi trong giây lát</p>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <div v-if="isScanning" class="scan-camera-overlay">
        <div class="scan-camera-content">
          <p class="scan-camera-title">Quét thẻ nhân viên</p>
          <p class="scan-camera-note">Đưa mã <strong>QR hoặc Barcode</strong> trên thẻ vào khung bên dưới</p>

          <div class="scan-camera-frame">
            <span class="scan-corner scan-corner--tl"></span>
            <span class="scan-corner scan-corner--tr"></span>
            <span class="scan-corner scan-corner--bl"></span>
            <span class="scan-corner scan-corner--br"></span>
            <span class="scan-frame-line"></span>
          </div>

          <p class="scan-camera-hint">
            <i class="pi pi-camera"></i>
            Camera trước đang bật
          </p>

          <Button class="scan-cancel-btn" label="Hủy quét" icon="pi pi-times" severity="secondary"
            @click="cancelScan" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue';
import { BarcodeScanner, LensFacing } from '@capacitor-mlkit/barcode-scanning';
import type { PluginListenerHandle } from '@capacitor/core';
import employee from '@/api/employee';
import companyApi from '@/api/company';
import factoryApi from '@/api/factory';
import { useAuthStore } from '@/store/auth';
import { useRouter, useRoute } from 'vue-router';
import { Capacitor } from '@capacitor/core';

type SelectOption = { label: string; value: string };

const code = ref('');
const username = ref('');
const password = ref('');
const selectedCompany = ref('');
const selectedFactory = ref('');
const companyOptions = ref<SelectOption[]>([]);
const factoryOptions = ref<SelectOption[]>([]);
const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();
const isNative = Capacitor.isNativePlatform();
const isTablet = ref(window.innerWidth >= 768);
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
    && !!username.value.trim()
    && !!password.value
    && !isLoading.value
    && !isLoggingIn.value
    && !isScanning.value;
});

const isLoginRoute = computed(() => route.path === '/login');

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
  factoryOptions.value = [];
  selectedFactory.value = '';

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

watch(selectedCompany, async (companyId) => {
  selectedFactory.value = '';
  factoryOptions.value = [];
  username.value = '';
  password.value = '';
  errorLogin.value = false;
  errorMessage.value = '';

  if (!companyId) return;
  await fetchFactories(String(companyId));
});

watch(selectedFactory, () => {
  username.value = '';
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
  isTablet.value = window.innerWidth >= 768;
};

onMounted(async () => {
  window.addEventListener('resize', updateDeviceType);
  if (isTablet.value) {
    await fetchCompanies();
  }
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
  username: String(username.value.trim()),
  password: String(password.value)
});

const navigateAfterLogin = async () => {
  if (isNative) {
    await router.push('/app-menu');
  } else {
    await router.push('/dashboard');
  }
};

const handleLoginResponse = async (response: any, loginCode: string): Promise<boolean> => {
  if (response.data?.success) {
    authStore.setAuthData(response.data.data);
    isLoggingIn.value = true;
    isLoading.value = true;

    try {
      await navigateAfterLogin();
    } finally {
      resetLoginLoading();
    }

    return true;
  }

  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = response.data?.message || 'Đăng nhập thất bại.';
  resetLoginLoading();
  return false;
};

const handleLoginError = (loginCode: string) => {
  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = 'Server đang bảo trì. Vui lòng thử lại sau. (Liên hệ IT nếu vấn đề vẫn tiếp diễn)';
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

  try {
    const response = await employee.employeeLogin({
      employeeId: payload.username,
      companyId: payload.companyId,
      factoryId: payload.factoryId,
      password: payload.password
    });
    await handleLoginResponse(response, payload.username);
  } catch (error: any) {
    console.error('Lỗi đăng nhập tablet:', error);
    handleLoginError(payload.username);
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
      alert('Cần cấp quyền camera để quét thẻ!');
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
        alert('Mã thẻ không hợp lệ hoặc không có dữ liệu!');
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

  if (!scannedCode) {
    alert('Vui lòng nhập mã nhân viên!');
    isLoggingIn.value = false;
    isLoading.value = false;
    return;
  }

  try {
    const response = await employee.employeeLogin({
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
  padding: 30px 20px;
  max-width: 450px;
  width: 100%;
  transition: all 0.3s ease;
}

.form-inner {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.side-info {
  text-align: center;
}

.form-logo {
  display: block;
  width: 100%;
  height: 170px;
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
  padding: 30px 20px;
  text-align: center;
  border: 2px dashed #cbd5e1;
}

.scan-icon-wrapper {
  background: #c3f0dc73;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 15px;
}

.scan-icon {
  font-size: 2.5rem;
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
}

.scanned-result {
  margin-top: 15px;
  background: #dcfce7;
  color: #166534;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
}

.scanned-result-error {
  margin-top: 15px;
  background: #fee2e2;
  color: #b84040;
  padding: 10px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-weight: 700;
}

.text-danger {
  color: #b84040 !important;
  font-weight: 700;
  margin: 0 0 8px;
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
}

.tablet-login-form {
  background: #f8fafc;
  border-radius: 20px;
  padding: 28px 22px;
  border: 1px solid #e2e8f0;
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
  font-size: 1.35rem;
  font-weight: 800;
  color: #fff;
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
}

:global(.scan-camera-note) {
  margin: 0 0 24px;
  max-width: 360px;
  font-size: 0.95rem;
  line-height: 1.5;
  color: #e2e8f0;
}

:global(.scan-camera-frame) {
  position: relative;
  width: min(78vw, 550px);
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
  font-size: 0.9rem;
  backdrop-filter: blur(4px);
}

:global(.scan-cancel-btn) {
  min-width: 160px;
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
    align-items: center;
    gap: 50px;
  }

  .side-info {
    flex: 1;
    border-right: 1px solid #e2e8f0;
  }

  .side-form {
    flex: 1.2;
  }

  .login-header h3 {
    font-size: 2.5rem;
  }

  .form-logo {
    width: 100%;
    height: 170px;
    object-fit: cover;
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
