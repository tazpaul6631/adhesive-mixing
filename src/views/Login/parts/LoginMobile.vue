<template>
  <div class="mobile-login-wrapper animate__animated animate__fadeIn">
    <div class="top-background"></div>

    <div class="content-wrapper">
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
                <p v-if="!errorLogin">Vui lòng quét mã QR hoặc Mã vạch/Barcode trên thẻ nhân viên của bạn để vào hệ
                  thống.</p>
                <p v-else class="text-danger">{{ errorMessage }}</p>

                <div v-if="code" class="animate__animated animate__fadeIn"
                  :class="errorLogin ? 'scanned-result-error' : 'scanned-result'">
                  <i :class="errorLogin ? 'pi pi-times-circle' : 'pi pi-check-circle'"></i>
                  <span>Mã NV: {{ code }}</span>
                </div>
              </div>

              <Button class="login-btn scan-btn w-full" :label="isLoading ? 'ĐANG XỬ LÝ...' : 'QUÉT MÃ'"
                :icon="isLoading ? undefined : 'pi pi-camera'" :loading="isLoading" @click="startScan" />
            </template>

            <template v-else>
              <div class="tablet-login-form shadow-sm">
                <div class="field-group">
                  <label for="factory" class="field-label">Công ty</label>
                  <Select id="factory" v-model="selectedFactory" :options="factoryOptions" optionLabel="label"
                    optionValue="value" placeholder="Chọn công ty" class="w-full" :disabled="isLoading" />
                </div>

                <div class="field-group">
                  <label for="factory" class="field-label">Nhà máy</label>
                  <Select id="factory" v-model="selectedFactory" :options="factoryOptions" optionLabel="label"
                    optionValue="value" placeholder="Chọn nhà máy" class="w-full" :disabled="isLoading" />
                </div>

                <div class="field-group">
                  <label for="username" class="field-label">Tài khoản</label>
                  <IconField>
                    <InputIcon class="pi pi-user" />
                    <InputText id="username" v-model="username" placeholder="Mã số nhân viên" class="w-full"
                      :disabled="isLoading" />
                  </IconField>
                </div>

                <div class="field-group">
                  <label for="password" class="field-label">Mật khẩu</label>
                  <IconField>
                    <InputIcon class="pi pi-lock" />
                    <InputText id="password" v-model="password" type="password" placeholder="********" class="w-full"
                      :disabled="isLoading" @keyup.enter="handleTabletLogin" />
                  </IconField>
                </div>

                <p v-if="errorLogin" class="text-danger">{{ errorMessage }}</p>

                <div class="tablet-login-actions">
                  <Button class="tablet-login-btn flex-1" :label="isLoading ? 'ĐANG XỬ LÝ...' : 'ĐĂNG NHẬP'"
                    :loading="isLoading" @click="handleTabletLogin" />
                  <Button class="tablet-scan-btn" icon="pi pi-qrcode" severity="secondary" outlined
                    :disabled="isLoading" @click="startScan" />
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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';
import employee from '@/api/employee';
import { useAuthStore } from '@/store/auth';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';

const code = ref('');
const username = ref('');
const password = ref('');
const selectedFactory = ref('01');
const factoryOptions = [
  { label: 'BU1', value: '01' }
];
const authStore = useAuthStore();
const router = useRouter();
const isNative = Capacitor.isNativePlatform();
const isTablet = ref(window.innerWidth >= 768);
const errorLogin = ref(false);
const errorMessage = ref('');
const isLoading = ref(false);

const updateDeviceType = () => {
  isTablet.value = window.innerWidth >= 768;
};

onMounted(() => {
  window.addEventListener('resize', updateDeviceType);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
});

const navigateAfterLogin = () => {
  if (isNative) {
    router.push('/app-menu');
  } else {
    router.push('/dashboard');
  }
};

const handleLoginResponse = (response: any, loginCode: string) => {
  if (response.data?.success) {
    authStore.setAuthData(response.data.data);
    navigateAfterLogin();
    return;
  }

  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = response.data?.message || 'Đăng nhập thất bại.';
};

const handleLoginError = (loginCode: string) => {
  code.value = loginCode;
  errorLogin.value = true;
  errorMessage.value = 'Server đang bảo trì. Vui lòng thử lại sau. (Liên hệ IT nếu vấn đề vẫn tiếp diễn)';
};

const handleTabletLogin = async () => {
  const employeeId = username.value.trim();
  const employeePassword = password.value;

  if (!employeeId) {
    alert('Vui lòng nhập tài khoản!');
    return;
  }

  if (!employeePassword) {
    alert('Vui lòng nhập mật khẩu!');
    return;
  }

  if (!selectedFactory.value) {
    alert('Vui lòng chọn nhà máy!');
    return;
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  isLoading.value = true;
  errorLogin.value = false;
  errorMessage.value = '';

  try {
    const response = await employee.employeeLogin({
      employeeId,
      password: employeePassword,
      factoryId: selectedFactory.value
    });
    handleLoginResponse(response, employeeId);
  } catch (error: any) {
    console.error('Lỗi gọi API đăng nhập:', error);
    handleLoginError(employeeId);
  } finally {
    isLoading.value = false;
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

    const { barcodes } = await BarcodeScanner.scan();

    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;
      if (scannedValue) {
        await processScannedData(scannedValue);
      } else {
        alert('Mã thẻ không hợp lệ hoặc không có dữ liệu!');
      }
    }
  } catch (error) {
    console.error('Lỗi khi quét:', error);
  } finally {
    isLoading.value = false;
  }
};

const processScannedData = async (scannedCode: string) => {
  code.value = scannedCode;

  if (!scannedCode) {
    alert('Vui lòng nhập mã nhân viên!');
    return;
  }

  try {
    const response = await employee.employeeLogin({ employeeId: scannedCode });
    handleLoginResponse(response, scannedCode);
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
  width: 90px;
  height: 90px;
  border-radius: 25px;
  object-fit: cover;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 15px;
}

.login-header {
  padding: 0;
}

.login-header h3 {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 5px 0;
  color: #1e293b;
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
  background: #e0f2fe;
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
  color: var(--p-primary-color, #3880ff);
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
  color: #1e293b;
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
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 1.1rem;
  border-radius: 16px;
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
  color: #1e293b;
  font-size: 0.95rem;
}

.tablet-login-actions {
  display: flex;
  align-items: stretch;
  gap: 12px;
  margin-top: 8px;
}

.tablet-login-btn {
  height: 3.5rem;
  font-weight: 700;
  letter-spacing: 0.5px;
  border-radius: 14px;
}

.tablet-scan-btn {
  width: 3.5rem;
  min-width: 3.5rem;
  height: 3.5rem;
  border-radius: 14px;
}

.tablet-scan-btn :deep(.pi) {
  font-size: 1.35rem;
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
    width: 60px;
    height: 60px;
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
    width: auto;
    height: 130px;
  }
}
</style>
