import { createRouter, createWebHashHistory } from '@ionic/vue-router';
import { RouteRecordRaw } from 'vue-router';
import { useAuthStore } from '@/store/auth';
import { Capacitor } from '@capacitor/core';
import MainLayout from '../views/MainLayout.vue';

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
    path: '/mix-glue-management',
    component: () => import('@/views/Tablet/MixGlueManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/repacking-mixed-glue-management',
    component: () => import('@/views/Tablet/RePackingMixedGlueManagement.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/qip-confirm-mix-glue',
    component: () => import('@/views/Tablet/QIPConfirmMixGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/qip-confirm-repacking-mixed-glue',
    component: () => import('@/views/Tablet/QIPConfirmRePackingMixedGlue.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/glue-form-production',
    component: () => import('@/views/Tablet/GlueFromProduct.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/mobile',
    component: () => import('@/views/Mobile/GlueConfirm.vue'),
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
    // App không được phép vào các route của Web (ví dụ: dashboard)
    if (to.path === '/dashboard') {
      return next('/app-menu');
    }
  } else {
    // Web không được phép vào các route của App
    if (to.path === '/app-menu' || to.path === '/formExit' || to.path === '/testCan') {
      return next('/dashboard'); // Hoặc đẩy ra 404 tùy bạn
    }
  }

  // 4. Mọi thứ hợp lệ -> Cho đi tiếp
  next();
});

export default router;