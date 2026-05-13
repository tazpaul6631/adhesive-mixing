<template>
  <ion-page>
    <ion-header class="ion-no-border header-container">
      <ion-toolbar color="primary" class="no-padding">
        <ion-title>Trang Chủ</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="handleLogout" class="logout-btn">
            <ion-icon slot="start" :icon="logOutOutline"></ion-icon>
            <span class="logout-text">Đăng xuất</span>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding custom-content">
      <div class="menu-container">
        <div class="welcome-banner animate__animated animate__fadeInDown">
          <div class="welcome-text">
            <h2>Xin chào!</h2>
            <p v-if="isTablet">Hệ thống quản lý trên Tablet</p>
            <p v-else>Hệ thống quản lý trên Mobile</p>
          </div>
        </div>

        <div class="feature-grid animate__animated animate__fadeInUp">

          <template v-if="isTablet">
            <div v-for="(feature, index) in tabletFeatures" :key="index" class="feature-card shadow-sm"
              @click="navigate(feature.path)">
              <div class="icon-wrapper" :style="{ background: feature.bgLight }">
                <ion-icon :icon="feature.icon" :style="{ color: feature.color }"></ion-icon>
              </div>
              <div class="card-content">
                <h3>{{ feature.title }}</h3>
                <p>{{ feature.description }}</p>
              </div>
            </div>
          </template>

          <div v-if="!isTablet" class="feature-card shadow-sm" @click="goMobile">
            <div class="icon-wrapper" style="background: #e0f2fe;">
              <ion-icon :icon="qrCodeOutline" color="secondary"></ion-icon>
            </div>
            <div class="card-content">
              <h3>Xác nhận thùng keo chuyền & thùng keo phát</h3>
              <p>Sử dụng camera điện thoại để quét mã vạch.</p>
            </div>
          </div>

          <div v-if="!isTablet" class="feature-card shadow-sm" @click="goGlueReturned">
            <div class="icon-wrapper" style="background: #d1fae5;">
              <ion-icon :icon="qrCodeOutline" style="color: #10b981;"></ion-icon>
            </div>
            <div class="card-content">
              <h3>Xác nhận thùng keo trả về</h3>
              <p>Quét mã QR để xác nhận thùng keo trả về.</p>
            </div>
          </div>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButtons, IonButton
} from '@ionic/vue';
import {
  scaleOutline, logOutOutline, qrCodeOutline,
  colorPaletteOutline, checkmarkDoneOutline,
  cubeOutline, documentTextOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { ref, onMounted, onUnmounted } from 'vue';

const router = useRouter();
const authStore = useAuthStore();

// --- LOGIC NHẬN DIỆN THIẾT BỊ ---
const isTablet = ref(window.innerWidth >= 768);

const updateDeviceType = () => {
  isTablet.value = window.innerWidth >= 768;
};

onMounted(() => {
  window.addEventListener('resize', updateDeviceType);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
});
// --------------------------------

// --- DATA MÔ PHỎNG API CHO TABLET FEATURES ---
const tabletFeatures = ref([
  {
    path: '/list-mix-glue',
    title: 'List Mix Glue Management',
    description: 'Quản lý trộn keo, kiểm tra kết nối và lấy dữ liệu từ cân.',
    icon: scaleOutline,
    color: '#0ea5e9',
    bgLight: '#e0f2fe'
  },
  {
    path: '/list-repacking-mixed-glue-management',
    title: 'Repacking Mixed Glue Management',
    description: 'Quản lý việc đóng gói lại keo đã trộn.',
    icon: cubeOutline,
    color: '#f59e0b',
    bgLight: '#fef3c7'
  },
  {
    path: '/list-qip-confirm-mix-glue',
    title: 'QIP Confirm Mix Glue',
    description: 'Xác nhận chất lượng keo trộn (QIP).',
    icon: checkmarkDoneOutline,
    color: '#10b981',
    bgLight: '#d1fae5'
  },
  {
    path: '/qip-confirm-repacking-mixed-glue',
    title: 'QIP Confirm Repacking',
    description: 'Xác nhận chất lượng keo đóng gói lại.',
    icon: documentTextOutline,
    color: '#8b5cf6',
    bgLight: '#ede9fe'
  },
  {
    path: '/glue-form-production',
    title: 'Glue Form Production',
    description: 'Quy trình sản xuất mẫu keo.',
    icon: colorPaletteOutline,
    color: '#f43f5e',
    bgLight: '#ffe4e6'
  }
]);

// Hàm điều hướng chung
const navigate = (path: string) => {
  router.push(path);
};

const goMobile = async () => {
  router.push('/mobile');
};

const goGlueReturned = async () => {
  router.push('/mobile/glue-returned');
};

const handleLogout = async () => {
  await authStore.logout();
};
</script>

<style scoped>
.custom-content {
  --background: #f4f7f9;
}

.menu-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 10px;
}

.welcome-banner {
  background: white;
  border-radius: 20px;
  padding: 25px;
  margin-bottom: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.welcome-text h2 {
  font-size: 1.8rem;
  font-weight: 800;
  color: #1e293b;
  margin: 0 0 8px 0;
}

.welcome-text p {
  color: #64748b;
  margin: 0;
  font-size: 1rem;
}

.feature-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.feature-card {
  background: white;
  border-radius: 20px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.feature-card:active {
  transform: scale(0.97);
}

.icon-wrapper {
  background: #f0f4ff;
  min-width: 65px;
  height: 65px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.icon-wrapper ion-icon {
  font-size: 32px;
}

.card-content h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1e293b;
  margin: 0 0 5px 0;
}

.card-content p {
  color: #64748b;
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.4;
}

.logout-btn {
  --color: white;
  font-weight: 600;
}

@media (min-width: 768px) {
  .menu-container {
    padding: 20px;
  }

  .welcome-banner {
    padding: 35px;
  }

  .welcome-text h2 {
    font-size: 2.2rem;
  }

  .welcome-text p {
    font-size: 1.1rem;
  }

  .feature-grid {
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 25px;
  }

  .feature-card {
    padding: 25px;
    flex-direction: column;
    align-items: flex-start;
    gap: 15px;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(56, 128, 255, 0.1) !important;
    border-color: rgba(56, 128, 255, 0.2);
  }

  .icon-wrapper {
    margin-bottom: 10px;
  }
}

@media (max-width: 480px) {
  .logout-text {
    display: none;
  }
}
</style>