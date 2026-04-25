<template>
  <ion-page>
    <ion-content>
      <LoginMobile v-if="isNative" @doLogin="handleLogin" />
      <LoginDesktop v-else @login="handleLogin" />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue';
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { Capacitor } from '@capacitor/core';

import LoginMobile from './parts/LoginMobile.vue';
import LoginDesktop from './parts/LoginDesktop.vue';
import userApi from '@/api/user';
import { useAuthStore } from '@/store/auth';

const router = useRouter();
const authStore = useAuthStore();
const isLoading = ref(false);

// Biến kiểm tra môi trường chạy (trả về true nếu là iOS/Android, false nếu là Web)
const isNative = Capacitor.isNativePlatform();

const handleLogin = async (credentials: any) => {
  if (!credentials.code || !credentials.password) {
    alert('Vui lòng nhập đầy đủ tài khoản và mật khẩu!');
    return;
  }

  try {
    isLoading.value = true;

    // ==========================================
    // 1. COMMENT LẠI TOÀN BỘ PHẦN GỌI API THỰC TẾ
    // ==========================================
    /*
    const response = await userApi.postUserValidate(credentials);

    if (response.data && response.data.success) {
      authStore.setToken(response.data.data.password);

      if (isNative) {
        router.push('/app-menu'); 
      } else {
        router.push('/dashboard'); 
      }
    } else {
      alert(response.data.message || 'Đăng nhập thất bại.');
    }
    */

    // ==========================================
    // 2. CODE GIẢ LẬP ĐĂNG NHẬP THÀNH CÔNG (BYPASS)
    // ==========================================

    // Bắt buộc phải gán một token giả để vượt qua Router Guard
    authStore.setToken('fake-token-bypass-api');

    // Chuyển hướng thẳng dựa trên nền tảng
    if (isNative) {
      router.push('/app-menu'); // Vào thẳng App
    } else {
      router.push('/dashboard'); // Vào thẳng Web
    }
  } catch (error: any) {
    console.error('Lỗi gọi API đăng nhập:', error);
  } finally {
    isLoading.value = false;
  }
};
</script>