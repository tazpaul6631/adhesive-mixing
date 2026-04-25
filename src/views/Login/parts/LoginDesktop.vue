<template>
  <div class="desktop-layout">
    <div class="banner-side">
      <div class="banner-overlay"></div>
      <div class="banner-content">
        <h1 class="animate__animated animate__fadeInDown">員工離職面談記錄表</h1>
        <div class="divider"></div>
        <h2 class="animate__animated animate__fadeInUp">Adhesive Mixing Room</h2>
        <p class="animate__animated animate__fadeInUp">Jia Hsin IT Department</p>
      </div>
    </div>

    <div class="form-side">
      <div class="login-box animate__animated animate__fadeInRight">
        <div class="form-header">
          <img src="/assets/icon/icon.png" alt="Logo" class="form-logo" />
          <h3>Xin chào!</h3>
          <p>Hệ thống phòng pha keo</p>
        </div>

        <div class="input-container">
          <ion-item lines="none" class="custom-input">
            <ion-icon :icon="personOutline" slot="start"></ion-icon>
            <ion-input v-model="code" label="Tài khoản quản lý" label-placement="floating"
              placeholder="Mã số nhân viên"></ion-input>
          </ion-item>

          <ion-item lines="none" class="custom-input ion-margin-top">
            <ion-icon :icon="lockClosedOutline" slot="start"></ion-icon>
            <ion-input v-model="password" type="password" label="Mật khẩu" label-placement="floating"
              placeholder="********"></ion-input>
          </ion-item>
        </div>

        <ion-button expand="block" class="login-btn" @click="onLoginClick">
          VÀO HỆ THỐNG
          <ion-icon slot="end" :icon="arrowForwardOutline"></ion-icon>
        </ion-button>

        <div class="footer-text">
          <p>© 2026 Jia Hsin IT Department - Adhesive Mixing Room</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { IonItem, IonInput, IonButton, IonIcon } from '@ionic/vue';
import { personOutline, lockClosedOutline, arrowForwardOutline } from 'ionicons/icons';

// Định nghĩa emit để truyền payload
const emit = defineEmits<{
  (e: 'login', payload: any): void
}>();

// Khởi tạo state cho input
const code = ref('');
const password = ref('');

const onLoginClick = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  emit('login', {
    code: code.value,
    password: password.value
  });
};
</script>

<style scoped lang="scss">
.desktop-layout {
  display: flex;
  height: 100vh;
  background-color: #f0f2f5;
}

.banner-side {
  flex: 7;
  position: relative;
  background-image: url('/assets/cty.png');
  background-size: cover;
  background-position: center;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.banner-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(58, 123, 213, 0.1) 0%, rgba(0, 0, 0, 0.5) 100%);
  z-index: 1;
}

.banner-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  padding: 40px;
}

.banner-content h1 {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 10px;
  letter-spacing: 2px;
}

.divider {
  width: 80px;
  height: 4px;
  background: #ffffff;
  margin: 20px auto;
  border-radius: 2px;
}

.banner-content h2 {
  font-size: 1.8rem;
  font-weight: 300;
  text-transform: uppercase;
  letter-spacing: 4px;
  opacity: 0.9;
}

.form-side {
  flex: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.login-box {
  width: 100%;
  max-width: 550px;
  background: white;
  margin: 20px;
  border-radius: 30px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.2);
  padding: 30px;
}

.form-header {
  margin-bottom: 20px;
  text-align: center;

  &h3 {
    font-size: 2rem;
    font-weight: 700;
    color: #1a1a1a;
    margin: 0 0 8px 0;
  }

  &p {
    color: #666;
    font-size: 0.95rem;
  }

  img {
    width: -webkit-fill-available;
  }
}

.custom-input {
  --background: #f8fafc;
  --border-radius: 12px;
  --padding-start: 10px;
  margin-bottom: 15px;
}

.custom-input:focus-within {
  border-color: var(--ion-color-primary);
}

.custom-input ion-icon {
  color: #64748b;
  margin-right: 10px;
}

.login-btn {
  --border-radius: 12px;
  margin-top: 30px;
  height: 55px;
  font-weight: 700;
  --box-shadow: 0 10px 20px rgba(56, 128, 255, 0.2);
}

.footer-text {
  margin-top: 50px;
  text-align: center;
  color: #94a3b8;
  font-size: 0.85rem;
}
</style>