<template>
  <ion-page>
    <ion-split-pane content-id="main-content" when="md" class="layout-container">
      <ion-menu content-id="main-content" type="overlay" class="verona-sidebar">
        <ion-content class="sidebar-content">
          <div class="sidebar-container">
            <div class="sidebar-top">
              <div class="logo-box">
                <img src="/assets/icon/icon1.png" alt="logo-company">
              </div>

              <div class="sidebar-menu">
                <ion-list lines="none" class="menu-list">
                  <ion-menu-toggle :auto-hide="false" v-for="item in menuItems" :key="item.title">
                    <router-link :to="item.url" custom v-slot="{ navigate, isActive }">
                      <button @click="navigate" :class="['nav-item', { 'active': isActive }]" :title="item.title">
                        <ion-icon :icon="item.icon" />
                      </button>
                    </router-link>
                  </ion-menu-toggle>
                </ion-list>
              </div>
            </div>
          </div>
        </ion-content>
      </ion-menu>

      <ion-page id="main-content">
        <ion-header class="ion-no-border verona-header">
          <ion-toolbar class="header-toolbar">
            <ion-buttons slot="start" class="header-left">
              <ion-menu-button class="ion-hide-md-up"></ion-menu-button>
            </ion-buttons>

            <ion-buttons slot="end">
              <ion-chip id="profile-trigger" class="profile-chip">
                <ion-avatar>
                  <img alt="User Avatar" src="https://i.pravatar.cc/100?img=3" />
                </ion-avatar>
                <div class="profile-info ion-hide-sm-down">
                  <span class="name">Thuận Cheat</span>
                  <span class="role">Developer</span>
                </div>
                <ion-icon :icon="chevronDownOutline" class="dropdown-icon ion-hide-sm-down"></ion-icon>
              </ion-chip>

              <ion-popover trigger="profile-trigger" dismiss-on-select="true">
                <ion-content>
                  <ion-list lines="none" class="ion-no-padding">
                    <ion-item button @click="handleLogout" :detail="false">
                      <ion-icon :icon="logOutOutline" slot="start" color="danger"></ion-icon>
                      <ion-label color="danger">Đăng xuất</ion-label>
                    </ion-item>
                  </ion-list>
                </ion-content>
              </ion-popover>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="verona-content" :scroll-y="false">
          <div class="content-wrapper">
            <div class="scrollable-area">
              <div class="breadcrumb-wrapper">
                <ion-breadcrumbs>
                  <ion-breadcrumb @click="router.push('/dashboard')" class="breadcrumb-link">
                    <ion-icon :icon="homeOutline"></ion-icon>
                    Dashboard
                  </ion-breadcrumb>
                  <ion-breadcrumb v-if="route.path !== '/dashboard'" active>
                    {{ currentRouteTitle }}
                  </ion-breadcrumb>
                </ion-breadcrumbs>
              </div>

              <div class="content-card">
                <ion-router-outlet></ion-router-outlet>
              </div>

              <footer class="layout-footer">
                <div class="copyright">© 2026 IT Jia Hsin CO., LTD</div>
              </footer>
            </div>
          </div>
        </ion-content>
      </ion-page>
    </ion-split-pane>
  </ion-page>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import {
  IonSplitPane, IonMenu, IonList, IonPage,
  IonHeader, IonToolbar, IonButtons, IonMenuButton, IonRouterOutlet,
  IonContent, IonMenuToggle, IonChip, IonAvatar,
  IonIcon, IonBreadcrumbs, IonBreadcrumb, IonPopover, IonLabel, IonItem
} from '@ionic/vue';
import { useRouter, useRoute } from 'vue-router';
import {
  chevronDownOutline, homeOutline, settingsOutline,
  logOutOutline
} from 'ionicons/icons';

import { useAuthStore } from '@/store/auth';

const router = useRouter();
const route = useRoute();

// 2. Khởi tạo store
const authStore = useAuthStore();

const handleLogout = async () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  await authStore.logout();
};

const menuItems = [
  { title: '404', url: '/404', icon: settingsOutline },
];

const currentRouteTitle = computed(() => {
  switch (route.path) {
    case '/404': return '404';
    default: return '';
  }
});
</script>

<style scoped lang="scss">
/* --- TỔNG THỂ --- */
.layout-container {
  --side-width: 80px;
  --side-max-width: 80px;
  --side-min-width: 80px;
}

/* SIDEBAR (80px) --- */
ion-menu.verona-sidebar {
  --width: 80px;
  --background: #ffffff;
  border-right: none;

  &::part(container) {
    box-shadow: none;
  }
}

.sidebar-content {
  --background: #ffffff;
  --padding-top: 1.5rem;
  --padding-bottom: 1.5rem;
}

.sidebar-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  align-items: center;
}

.sidebar-top {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.logo-box {
  margin-bottom: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 42px;
  height: 42px;
}

.menu-list {
  background: transparent;
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.nav-item {
  background: transparent;
  border: none;
  width: 48px;
  height: 48px;
  margin: 0.25rem auto;
  border-radius: 8px;
  display: flex;
  justify-content: center;
  align-items: center;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
  border-radius: 50%;

  ion-icon {
    font-size: 1.25rem;
  }

  &:hover {
    background-color: #f1f5f9;
    color: #0f172a;
  }

  &.active {
    background-color: #e0e7ff;
    color: #4f46e5;
  }
}

/* HEADER --- */
.verona-header {
  --background: #ffffff;
  background-color: #ffffff;
  position: relative;
  z-index: 999 !important;
  contain: none !important;
  overflow: visible !important;
  pointer-events: auto;

  .header-toolbar {
    --background: transparent;
    --min-height: 70px;
    --padding-start: 1.5rem;
    --padding-end: 1.5rem;
    contain: none !important;
    overflow: visible !important;
    pointer-events: auto;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 1rem;
}

/* --- PROFILE CHIP & DROPDOWN --- */
.profile-chip {
  --background: transparent;
  border-radius: 30px;
  padding: 0.25rem 0.5rem 0.25rem 0.25rem;
  height: auto;
  gap: 0.75rem;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    --background: #f1f5f9;
  }

  ion-avatar {
    width: 36px;
    height: 36px;

    &:first-child {
      margin-inline: 0;
    }
  }

  .profile-info {
    display: flex;
    flex-direction: column;
    text-align: left;
    line-height: 1.2;

    .name {
      font-size: 0.875rem;
      font-weight: 600;
      color: #0f172a;
    }

    .role {
      font-size: 0.75rem;
      color: #64748b;
    }
  }

  .dropdown-icon {
    font-size: 1rem;
    color: #64748b;
  }
}

/* NỘI DUNG CHÍNH */
#main-content {
  background: #ffffff;
  display: flex;
  flex-direction: column;
}

.verona-content {
  --background: transparent;
}

.content-wrapper {
  background-color: #f8fafc;
  border-top-left-radius: 30px;
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  border-top: 1px solid #e2e8f0;
  border-left: 1px solid #e2e8f0;
  position: relative;
  z-index: 1;
  box-shadow: inset 0 0 20px rgba(0, 0, 0, 0.1);
}

/* --- THÊM CLASS MỚI NÀY --- */
.scrollable-area {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2rem 0;

  display: flex;
  flex-direction: column;
  min-height: 100%;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    background-color: #cbd5e1;
    border-radius: 10px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background-color: #94a3b8;
  }
}

.content-card {
  background-color: #ffffff;
  border-radius: 30px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.1);
  margin-bottom: 2rem;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: auto;

  ion-router-outlet {
    position: relative;
    flex: 1;
    display: block;
    contain: none;
  }

  :deep(.ion-page:not(.ion-page-hidden)) {
    position: relative !important;
    flex: 1;
    display: flex !important;
    flex-direction: column;
    height: auto !important;
    min-height: 100%;
    contain: none !important;
    overflow: visible !important;
    background: transparent !important;
  }
}

/* --- CUSTOM BREADCRUMB IONIC --- */
.breadcrumb-wrapper {
  margin-bottom: 1.5rem;

  ion-breadcrumbs {
    --color: #64748b;
    --color-active: #0f172a;
    --separator-color: #cbd5e1;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .breadcrumb-link {
    cursor: pointer;
    transition: color 0.2s ease;

    &:hover {
      color: #0f172a;
    }

    ion-icon {
      margin-right: 4px;
      font-size: 1.1rem;
    }
  }
}

/* --- FOOTER TRONG CONTENT --- */
.layout-footer {
  display: flex;
  justify-content: end;
  align-items: center;
  padding-top: 1rem;
  color: #64748b;
  font-size: 0.875rem;

  .copyright {
    width: fit-content;
    padding-bottom: 15px;
  }
}
</style>