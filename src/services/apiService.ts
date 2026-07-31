import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import baseURLApi from '@/api/baseURLApi';
import i18n from '@/i18n';
import { notifyServerMaintenanceToast } from '@/services/toastBridge';

const baseURL = baseURLApi.url;

// Timeout mặc định 10s cho các API nhanh
// Các list API nặng (WorkOrder, GlueReturnLog) sẽ override timeout riêng
const DEFAULT_TIMEOUT = 10000;
export const SLOW_API_TIMEOUT = 30000;

/** Header requestBy cố định (chỉ gửi khi withRequestBy: true). */
const REQUEST_BY_KEY = 'key_666ttp10tyuio72612aqzvntnmyt1r2y9y3tre78';

const api = axios.create({
  baseURL,
  timeout: DEFAULT_TIMEOUT,
});

const tGlobal = (key: string) => String(i18n.global.t(key));

const isLoginApiRequest = (error: AxiosError) => {
  const url = String(error.config?.url || '');
  return url.includes('employee/login') || url.includes('/login');
};

const toastServerMaintenance = (error: AxiosError) => {
  // Login page đã hiện message trên form — tránh toast trùng.
  if (isLoginApiRequest(error)) return;

  notifyServerMaintenanceToast(tGlobal('login.serverMaintenance'));
};

/**
 * 1. REQUEST INTERCEPTOR: Tự động gắn Token vào mỗi yêu cầu
 * Header requestBy chỉ gửi khi caller bật withRequestBy: true
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig & { withRequestBy?: boolean }) => {
    const authStore = useAuthStore();
    const token = authStore.token;
    const employeeId =
      authStore.user?.employeeId?.trim() ||
      token ||
      localStorage.getItem('web_token_backup') ||
      '';

    if (config.headers) {
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      if (employeeId) {
        config.headers.requestBy = employeeId;
      }

      if (config.withRequestBy) {
        config.headers.requestKey = REQUEST_BY_KEY;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * 2. RESPONSE INTERCEPTOR: Xử lý Logic Online/Offline và lỗi tập trung
 */
api.interceptors.response.use(
  (response) => {
    const authStore = useAuthStore();

    // Nếu có phản hồi thành công -> Chắc chắn đang Online
    if (!authStore.isOnline) {
      authStore.setNetworkStatus(true);
    }
    return response;
  },
  async (error: AxiosError) => {
    const authStore = useAuthStore();

    // TH1: Lỗi không có response (Network Error, Timeout, CORS, Server Down)
    if (!error.response) {
      // Phân biệt timeout (server chậm) vs mất mạng thật sự
      // Axios timeout → error.code = 'ECONNABORTED'
      // Mất mạng thật  → error.code = 'ERR_NETWORK'
      const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
      if (isTimeout) {
        // Server đang chạy nhưng xử lý quá chậm → KHÔNG chuyển Offline
        console.warn(`[API] Request timeout: ${error.config?.url}. Server đang xử lý chậm.`);
      } else {
        // Mất mạng thật sự / BE tắt không bắt tay được
        console.warn(`[API] Mất kết nối mạng: ${error.config?.url}. Chuyển sang Offline Mode.`);
        authStore.setNetworkStatus(false);
      }

      // Mạng ổn nhưng BE tắt / timeout → báo bảo trì (debounce trong toastBridge)
      toastServerMaintenance(error);
      return Promise.reject(error);
    }

    const status = error.response.status;

    // TH2: Token hết hạn (401)
    if (status === 401) {
      console.error("Token hết hạn. Đang đăng xuất...");
      alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại!');
      await authStore.logout();
    }

    // TH3: Lỗi hệ thống Server (5xx) -> Ép về Offline để dùng dữ liệu SQLite
    if (status >= 500) {
      console.warn(`Server lỗi ${status}. Tạm thời chuyển sang chế độ offline.`);
      authStore.setNetworkStatus(false);
      toastServerMaintenance(error);
    }

    return Promise.reject(error);
  }
);

export type RequestConfig = {
  timeout?: number;
  /** true → gắn header requestBy = employeeId. Mặc định: không gửi */
  withRequestBy?: boolean;
};

/**
 * 3. EXPORT WRAPPER: chạy bằng Axios
 * config.timeout — override timeout cho request cụ thể
 * Ví dụ: { timeout: SLOW_API_TIMEOUT } cho các list API nặng
 */
const request = {
  get: (url: string, params?: any, config?: RequestConfig) =>
    api.get(url, { params, ...config }),
  post: (url: string, data?: any, config?: RequestConfig) =>
    api.post(url, data, config),
  put: (url: string, data?: any, config?: RequestConfig) =>
    api.put(url, data, config),
  patch: (url: string, data?: any, config?: RequestConfig) =>
    api.patch(url, data, config),
  delete: (url: string, config?: RequestConfig) =>
    api.delete(url, config),
};

export default request;
