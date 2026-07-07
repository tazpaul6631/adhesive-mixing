import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { Capacitor } from '@capacitor/core';
import MainLayout from '../views/MainLayout.vue';
import LoginPage from '@/views/Login/LoginPage.vue';
import AppMenu from '@/views/AppMenu/AppMenu.vue';
import { startRouteLoading, stopRouteLoading } from './loading';

const routes: Array<RouteRecordRaw> = [
  {
    path: '/',
    // Điều hướng gốc: Cứ trỏ về trang chủ tương ứng, Guard ở dưới sẽ tự động chặn bắt đăng nhập nếu chưa có token
    redirect: () => Capacitor.isNativePlatform() ? '/app-menu' : '/dashboard'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPage,
    meta: { requiresAuth: false, skipRouteLoading: true }
  },
  {
    path: '/',
    component: MainLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '404',
        name: 'NotFound',
        component: () => import('@/views/404NotFoundPage/NotFoundPage.vue')
      },
    ]
  },
  {
    path: '/app-menu',
    name: 'AppMenu',
    component: AppMenu,
    meta: { requiresAuth: true }
  },
  {
    path: '/list-mix-glue',
    component: () => import('@/views/Tablet/MixGlue/ListMixGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mix-glue-management',
    component: () => import('@/views/Tablet/MixGlue/MixGlueManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/list-separate-mixed-glue-management',
    component: () => import('@/views/Tablet/Separate/ListSeparateMixedglue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/separate-mixed-glue-management',
    component: () => import('@/views/Tablet/Separate/SeparateMixedGlueManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/glue-return-log',
    component: () => import('@/views/Tablet/GlueReturnLog/ListGlueReturnLog.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mobile',
    component: () => import('@/views/Mobile/GlueConfirm.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mobile/glue-return',
    component: () => import('@/views/Mobile/GlueReturn.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mobile/glue-info-check',
    component: () => import('@/views/Mobile/GlueInfoCheck.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mobile/glue-check-list',
    component: () => import('@/views/Mobile/GlueCheckList.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/:catchAll(.*)',
    redirect: '/404'
  }
];

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes
});

/**
 * TÁCH BIỆT LUỒNG DỮ LIỆU BẰNG ROUTER GUARD
 */
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();
  const isAuthenticated = !!authStore.token;
  const isApp = Capacitor.isNativePlatform();

  // 1. Nếu trang yêu cầu đăng nhập NHƯNG chưa đăng nhập -> Đẩy về Login
  if (to.meta.requiresAuth && !isAuthenticated) {
    return next('/login');
  }

  // 2. Nếu đã đăng nhập NHƯNG lại cố vào trang Login -> Đẩy về trang chủ tương ứng
  if (to.path === '/login' && isAuthenticated) {
    return next(isApp ? '/app-menu' : '/dashboard');
  }

  // 3. Xử lý ngăn chặn truy cập chéo nền tảng (Sau khi đã qua khâu check Auth)
  if (isApp) {
    if (to.path === '/dashboard') {
      return next('/app-menu');
    }
  } else if (to.path === '/app-menu') {
    return next('/dashboard');
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

  const skipRouteLoading = Boolean(to.meta.skipRouteLoading);
  if (to.fullPath !== from.fullPath && !skipRouteLoading) {
    startRouteLoading();
  }

  next();
});

router.afterEach(() => {
  stopRouteLoading();
});

router.onError(() => {
  stopRouteLoading();
});

export default router;