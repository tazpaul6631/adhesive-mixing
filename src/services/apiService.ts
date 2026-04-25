import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/store/auth';
import baseURLApi from '@/api/baseURLApi';

const baseURL = baseURLApi.url;

const api = axios.create({
  baseURL,
  timeout: 10000, // 10 giây
});

/**
 * 1. REQUEST INTERCEPTOR: Tự động gắn Token vào mỗi yêu cầu
 */
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const authStore = useAuthStore(); // Pinia cho phép gọi store
    const token = authStore.token; // Lấy token đã được Pinia tự động load từ Storage

    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
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

    // TH1: Lỗi mất kết nối hoàn toàn (Network Error / CORS / Server Down)
    if (!error.response) {
      console.warn("Mất kết nối mạng hoặc Server không phản hồi. Chuyển sang Offline Mode.");
      authStore.setNetworkStatus(false);
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
      console.warn(`Server lỗi ${status}. Tạm thời chuyển sang chế độ Offline.`);
      authStore.setNetworkStatus(false);
    }

    return Promise.reject(error);
  }
);

/**
 * 3. EXPORT WRAPPER: chạy bằng Axios
 */
const request = {
  get: (url: string, params?: any) => api.get(url, { params }),
  post: (url: string, data?: any) => api.post(url, data),
  put: (url: string, data?: any) => api.put(url, data),
  patch: (url: string, data?: any) => api.patch(url, data),
  delete: (url: string) => api.delete(url),
};

export default request;