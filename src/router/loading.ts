import { ref } from 'vue';

/** Tự tắt overlay nếu navigation/chunk treo bất thường. */
const ROUTE_LOADING_TIMEOUT_MS = 30_000;
/** Giữ overlay tối thiểu để user kịp nhìn thấy khi chunk đã cache. */
const MIN_ROUTE_LOADING_MS = 250;

export const isRouteLoading = ref(false);

let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hideDelayId: ReturnType<typeof setTimeout> | null = null;
let loadingStartedAt = 0;
let loadingGeneration = 0;

export function startRouteLoading() {
  loadingGeneration += 1;
  loadingStartedAt = Date.now();
  isRouteLoading.value = true;

  if (hideDelayId) {
    clearTimeout(hideDelayId);
    hideDelayId = null;
  }

  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
  }

  loadingTimeoutId = setTimeout(() => {
    console.warn('[router] Route loading timeout — forcing overlay off');
    stopRouteLoading();
  }, ROUTE_LOADING_TIMEOUT_MS);
}

export function stopRouteLoading() {
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }

  const generation = loadingGeneration;
  const elapsed = Date.now() - loadingStartedAt;
  const remaining = Math.max(0, MIN_ROUTE_LOADING_MS - elapsed);

  const finish = () => {
    if (generation !== loadingGeneration) return;
    isRouteLoading.value = false;
    hideDelayId = null;
  };

  if (remaining > 0) {
    if (hideDelayId) {
      clearTimeout(hideDelayId);
    }
    hideDelayId = setTimeout(finish, remaining);
  } else {
    finish();
  }
}
