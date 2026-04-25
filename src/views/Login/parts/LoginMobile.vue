<template>
  <div class="mobile-login-wrapper animate__animated animate__fadeIn">
    <div class="top-background"></div>

    <div class="content-wrapper">
      <div class="form-container shadow-lg">
        <div class="form-inner">
          <div class="side-info">
            <img src="/assets/icon/icon.png" alt="Logo" class="form-logo" />
            <div class="login-header ion-padding">
              <h3>Xin chào!</h3>
              <p>Hệ thống phòng pha keo</p>
            </div>
          </div>

          <div class="side-form">
            <div class="scan-instruction shadow-sm">
              <div class="scan-icon-wrapper">
                <ion-icon :icon="qrCodeOutline" class="scan-icon pulse-animation"></ion-icon>
              </div>
              <h4>Đăng nhập bằng thẻ</h4>
              <p>Vui lòng quét mã QR hoặc Mã vạch/Barcode trên thẻ nhân viên của bạn để vào hệ thống.</p>

              <div v-if="code" class="scanned-result animate__animated animate__fadeIn">
                <ion-icon :icon="checkmarkCircleOutline" color="success"></ion-icon>
                <span>Mã NV: {{ code }}</span>
              </div>
            </div>

            <ion-button expand="block" class="login-btn scan-btn" @click="startScan">
              <ion-icon slot="start" :icon="cameraOutline"></ion-icon>
              MỞ CAMERA QUÉT MÃ
            </ion-button>
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
import { ref } from 'vue';
import { IonIcon, IonButton } from '@ionic/vue';
import { qrCodeOutline, cameraOutline, checkmarkCircleOutline } from 'ionicons/icons';
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning';

const emit = defineEmits(['doLogin']);
const code = ref('');

const startScan = async () => {
  try {
    const { camera } = await BarcodeScanner.requestPermissions();
    if (camera !== 'granted' && camera !== 'limited') {
      alert('Cần cấp quyền camera để quét thẻ!');
      return;
    }

    // Bật giao diện Native của điện thoại lên để quét
    const { barcodes } = await BarcodeScanner.scan();

    // Lấy kết quả đầu tiên (nếu có quét trúng)
    if (barcodes && barcodes.length > 0) {
      const scannedValue = barcodes[0].rawValue;

      // KIỂM TRA: Nếu có giá trị mới xử lý đăng nhập
      if (scannedValue) {
        processScannedData(scannedValue);
      } else {
        alert("Mã thẻ không hợp lệ hoặc không có dữ liệu!");
      }
    }
  } catch (error) {
    console.error("Lỗi khi quét:", error);
    alert('Có lỗi xảy ra khi mở camera.');
  }
};

const processScannedData = (scannedText: string) => {
  code.value = scannedText;

  emit('doLogin', {
    code: scannedText,
    password: scannedText
  });
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
  font-size: 40px;
  color: var(--ion-color-primary);
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

.login-btn.scan-btn {
  --background: var(--ion-color-primary);
  --border-radius: 16px;
  --box-shadow: 0 8px 20px rgba(56, 128, 255, 0.3);
  margin-top: 20px;
  height: 60px;
  font-weight: 700;
  letter-spacing: 1px;
  font-size: 1.1rem;
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
    padding-right: 40px;
  }

  .side-form {
    flex: 1.2;
  }

  .login-header h3 {
    font-size: 2.5rem;
  }

  .form-logo {
    width: 120px;
    height: 120px;
    margin-bottom: 20px;
  }
}
</style>