<template>
  <!-- Desktop legacy shell — bỏ Ionic. Child routes (dashboard / 404) render qua router-view. -->
  <AppPage>
    <AppHeader no-border class="main-layout-header">
      <template #start>
        <div class="brand">
          <img src="/assets/icon/icon1.png" alt="" class="brand__logo" />
          <span class="brand__title">Mix Glue</span>
        </div>
      </template>
      <template #end>
        <button type="button" class="logout-btn" @click="handleLogout">
          <i class="pi pi-sign-out" aria-hidden="true"></i>
          <span>Đăng xuất</span>
        </button>
      </template>
    </AppHeader>

    <AppContent class="main-layout-content" :scroll="true" :padding="true">
      <div class="main-layout-body">
        <nav class="breadcrumb" aria-label="Breadcrumb">
          <button type="button" class="breadcrumb__link" @click="router.push('/dashboard')">
            <i class="pi pi-home" aria-hidden="true"></i>
            Dashboard
          </button>
          <template v-if="currentRouteTitle">
            <span class="breadcrumb__sep" aria-hidden="true">/</span>
            <span class="breadcrumb__current">{{ currentRouteTitle }}</span>
          </template>
        </nav>

        <div class="main-layout-card">
          <router-view />
        </div>

        <footer class="main-layout-footer">
          © 2026 IT Jia Hsin CO., LTD
        </footer>
      </div>
    </AppContent>
  </AppPage>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { AppPage, AppHeader, AppContent } from '@/components/layout';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const handleLogout = async () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  await authStore.logout();
};

const currentRouteTitle = computed(() => {
  switch (route.path) {
    case '/404':
      return '404';
    case '/dashboard':
      return '';
    default:
      return '';
  }
});
</script>

<style scoped>
.main-layout-header :deep(.app-header__toolbar) {
  min-height: 56px;
  padding-inline: 16px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.brand__logo {
  width: 36px;
  height: 36px;
  object-fit: contain;
}

.brand__title {
  color: #fff;
  font-size: 1.1rem;
  font-weight: 700;
}

.logout-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 8px 12px;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
  font-weight: 600;
  cursor: pointer;
}

.logout-btn:hover,
.logout-btn:focus-visible {
  background: rgba(255, 255, 255, 0.2);
  outline: none;
}

.main-layout-content {
  background: #f4f7fb;
}

.main-layout-body {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-height: 100%;
}

.breadcrumb {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.breadcrumb__link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #0b56d9;
  font-weight: 600;
  cursor: pointer;
}

.breadcrumb__sep {
  color: #94a3b8;
}

.breadcrumb__current {
  color: #334155;
  font-weight: 600;
}

.main-layout-card {
  flex: 1 1 auto;
  min-height: 240px;
  background: #fff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
  padding: 16px;
}

.main-layout-footer {
  color: #94a3b8;
  font-size: 0.85rem;
  text-align: center;
  padding-bottom: 8px;
}
</style>
