import { nextTick, ref } from 'vue';

/** Tự tắt overlay nếu navigation/chunk treo bất thường. */
const ROUTE_LOADING_TIMEOUT_MS = 30_000;
/** Tổng thời gian overlay tối thiểu kể từ lúc start (chunk cache vẫn thấy được). */
const MIN_ROUTE_LOADING_MS = 800;
/** Sau khi route settle, luôn giữ thêm tối thiểu (lần 2+ vào menu vẫn rõ). */
const MIN_AFTER_NAV_MS = 700;

export const isRouteLoading = ref(false);

let loadingTimeoutId: ReturnType<typeof setTimeout> | null = null;
let hideDelayId: ReturnType<typeof setTimeout> | null = null;
let loadingStartedAt = 0;
let loadingGeneration = 0;

function clearHideDelay() {
  if (hideDelayId) {
    clearTimeout(hideDelayId);
    hideDelayId = null;
  }
}

function clearLoadingTimeout() {
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }
}

function waitTwoAnimationFrames(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => resolve());
    });
  });
}

export function startRouteLoading() {
  loadingGeneration += 1;
  loadingStartedAt = Date.now();
  isRouteLoading.value = true;

  clearHideDelay();
  clearLoadingTimeout();

  loadingTimeoutId = setTimeout(() => {
    console.warn('[router] Route loading timeout — forcing overlay off');
    stopRouteLoading({ force: true });
  }, ROUTE_LOADING_TIMEOUT_MS);
}

/**
 * Bật overlay rồi đợi Vue paint + 2 rAF trước khi tải chunk nặng,
 * tránh main thread block khiến user không thấy loading.
 */
export async function startRouteLoadingVisible() {
  startRouteLoading();
  await nextTick();
  await waitTwoAnimationFrames();
}

export function stopRouteLoading(options?: { force?: boolean }) {
  clearLoadingTimeout();

  if (options?.force) {
    clearHideDelay();
    isRouteLoading.value = false;
    return;
  }

  if (!isRouteLoading.value) {
    return;
  }

  const generation = loadingGeneration;
  const elapsed = Date.now() - loadingStartedAt;
  const remaining = Math.max(MIN_ROUTE_LOADING_MS - elapsed, MIN_AFTER_NAV_MS);

  clearHideDelay();
  hideDelayId = setTimeout(() => {
    if (generation !== loadingGeneration) return;
    isRouteLoading.value = false;
    hideDelayId = null;
  }, remaining);
}
