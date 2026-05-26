<template>
  <ion-page>
    <ion-header class="ion-no-border header-container">
      <ion-toolbar color="primary" class="no-padding app-menu-toolbar">
        <ion-title class="app-menu-toolbar__title">{{ t('appMenu.title') }}</ion-title>

        <div slot="end" class="app-menu-toolbar__actions">
          <LocaleSelect :device-scope="isTablet ? 'tablet' : 'mobile'" />
          <ion-button fill="clear" @click="handleLogout" class="logout-btn">
            <ion-icon slot="start" :icon="logOutOutline"></ion-icon>
            <!-- <span class="logout-text">{{ t('appMenu.logout') }}</span> -->
          </ion-button>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding custom-content">
      <div class="menu-container">
        <div class="welcome-banner animate__animated animate__fadeInDown">
          <div class="welcome-text">
            <h2 v-if="isTablet">{{ t('appMenu.tabletH2title') }}</h2>
            <h2 v-else>{{ t('mobile.appMenu.hello') }}</h2>
            <p v-if="isTablet">{{ t('appMenu.tabletSubtitle') }}</p>
            <p v-else>{{ t('mobile.appMenu.system') }}</p>
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

          <template v-if="!isTablet">
            <div v-for="(feature, index) in mobileFeatures" :key="index" class="feature-card shadow-sm"
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
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonHeader, IonToolbar, IonTitle, IonContent,
  IonIcon, IonButton
} from '@ionic/vue';
import {
  scaleOutline, logOutOutline, qrCodeOutline, readerOutline,
  colorPaletteOutline, checkmarkDoneOutline,
  cubeOutline, documentTextOutline, searchOutline, gitCompareOutline, gitMergeOutline
} from 'ionicons/icons';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { ref, computed, onMounted, onUnmounted } from 'vue';
import LocaleSelect from '@/components/LocaleSelect.vue';
import { useAppLocale } from '@/composables/useAppLocale';

const router = useRouter();
const authStore = useAuthStore();

// --- LOGIC NHẬN DIỆN THIẾT BỊ ---
const isTablet = ref(window.innerWidth >= 768);

const { t, syncLocaleForDevice } = useAppLocale(() => (isTablet.value ? 'tablet' : 'mobile'));

const updateDeviceType = () => {
  const nextTablet = window.innerWidth >= 768;
  if (nextTablet !== isTablet.value) {
    isTablet.value = nextTablet;
    void syncLocaleForDevice();
  }
};

onMounted(() => {
  window.addEventListener('resize', updateDeviceType);
});

onUnmounted(() => {
  window.removeEventListener('resize', updateDeviceType);
});
// --------------------------------

// --- DATA MÔ PHỎNG API CHO TABLET FEATURES ---
const tabletFeatures = computed(() => [
  {
    path: '/list-mix-glue',
    title: t('appMenu.features.mixGlue.title'),
    description: t('appMenu.features.mixGlue.description'),
    icon: scaleOutline,
    color: '#0ea5e9',
    bgLight: '#e0f2fe'
  },
  {
    path: '/list-separate-mixed-glue-management',
    title: t('appMenu.features.separateMixedGlue.title'),
    description: t('appMenu.features.separateMixedGlue.description'),
    icon: gitMergeOutline,
    color: '#f59e0b',
    bgLight: '#fef3c7'
  },
  {
    path: '/glue-return-log',
    title: t('appMenu.features.glueReturnLog.title'),
    description: t('appMenu.features.glueReturnLog.description'),
    icon: readerOutline,
    color: '#8b5cf6',
    bgLight: '#ede9fe'
  },
  // {
  //   path: '/list-qip-confirm-mix-glue',
  //   title: 'QIP Confirm Mix Glue',
  //   description: 'Xác nhận chất lượng keo trộn (QIP).',
  //   icon: checkmarkDoneOutline,
  //   color: '#10b981',
  //   bgLight: '#d1fae5'
  // },
  // {
  //   path: '/list-qip-confirm-separate-mixed-glue',
  //   title: 'QIP Confirm Separate Mixed Glue',
  //   description: 'Xác nhận chất lượng keo đóng gói lại (QIP).',
  //   icon: documentTextOutline,
  //   color: '#8b5cf6',
  //   bgLight: '#ede9fe'
  // }
]);

// --- DATA CHO MOBILE FEATURES ---
const mobileFeatures = computed(() => [
  {
    path: '/mobile',
    title: t('mobile.appMenu.glueConfirm'),
    description: t('mobile.appMenu.description'),
    icon: gitCompareOutline,
    color: '#0ea5e9',
    bgLight: '#e0f2fe'
  },
  {
    path: '/mobile/glue-info-check',
    title: t('mobile.appMenu.glueInfoCheck'),
    description: t('mobile.appMenu.glueInfoCheckDescription'),
    icon: searchOutline,
    color: '#2563eb',
    bgLight: '#dbeafe'
  }
]);

// Hàm điều hướng chung
const navigate = (path: string) => {
  router.push(path);
};


const handleLogout = async () => {
  await authStore.logout();
};
</script>

<style scoped>
.app-menu-toolbar {
  --padding-top: 6px;
  --padding-bottom: 6px;
  --padding-start: 12px;
  --padding-end: 8px;
  --min-height: 56px;
}

.app-menu-toolbar__title {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  padding-inline: 0;
}

.app-menu-toolbar__actions {
  display: flex;
  align-items: center;
  gap: 6px;
  height: 100%;
}

.logout-btn {
  --color: #fff;
  --background-hover: rgba(255, 255, 255, 0.12);
  --border-radius: 999px;
  --padding-start: 10px;
  --padding-end: 12px;
  margin: 0;
  font-weight: 600;
  font-size: 1.5rem;
  height: 50px;
  margin-left: 20px;
}

.logout-btn ion-icon {
  font-size: 2rem;
}

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
    align-items: flex-start;
    gap: 15px;
  }

  .feature-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 15px 35px rgba(56, 128, 255, 0.1) !important;
    border-color: rgba(56, 128, 255, 0.2);
  }
}

@media (max-width: 480px) {
  .app-menu-toolbar__title {
    font-size: 1rem;
  }

  .logout-text {
    display: none;
  }

  .logout-btn {
    --padding-start: 8px;
    --padding-end: 8px;
    min-width: 40px;
  }
}
</style>