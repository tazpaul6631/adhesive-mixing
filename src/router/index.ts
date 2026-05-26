import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { Capacitor } from '@capacitor/core';
import MainLayout from '../views/MainLayout.vue';
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
    component: () => import('@/views/Login/LoginPage.vue'),
    meta: { requiresAuth: false }
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
    component: () => import('@/views/AppMenu/AppMenu.vue'),
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
    path: '/list-qip-confirm-mix-glue',
    component: () => import('@/views/Tablet/QIPMixGlue/ListQIPMixGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/qip-confirm-mix-glue',
    component: () => import('@/views/Tablet/QIPMixGlue/QIPConfirmMixGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/list-qip-confirm-separate-mixed-glue',
    component: () => import('@/views/Tablet/QIPSeparate/ListQIPConfirmSeparateMixedGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/qip-confirm-separate-mixed-glue',
    component: () => import('@/views/Tablet/QIPSeparate/QIPConfirmSeparateMixedGlue.vue'),
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
    path: '/mobile/glue-info-check',
    component: () => import('@/views/Mobile/GlueInfoCheck.vue'),
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

  if (to.fullPath !== from.fullPath) {
    startRouteLoading();
  }

  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }

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
    // App không được phép vào các route của Web (ví dụ: dashboard)
    if (to.path === '/dashboard') {
      return next('/app-menu');
    }
  } else {
    // Web không được phép vào các route của App
    if (to.path === '/app-menu') {
      return next('/dashboard'); // Hoặc đẩy ra 404 tùy bạn
    }
  }

  // 4. Mọi thứ hợp lệ -> Cho đi tiếp
  next();
});

router.afterEach(() => {
  stopRouteLoading();
});

router.onError(() => {
  stopRouteLoading();
});

export default router;