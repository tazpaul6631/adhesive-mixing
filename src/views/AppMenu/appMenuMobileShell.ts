import type { Component } from 'vue';

const loadNetworkStatusIcon = () =>
  import('@/views/Mobile/components/NetworkStatusIcon.vue');
const loadMobileOfflineNotice = () =>
  import('@/views/Mobile/components/MobileOfflineNotice.vue');
const loadPendingQueueButton = () =>
  import('@/views/Mobile/components/PendingQueueButton.vue');

let prefetchPromise: Promise<void> | null = null;

/** Tải trước chunk mobile header (kalimah, queue…) — gọi từ Login hoặc AppMenu. */
export function prefetchAppMenuMobileShell() {
  if (!prefetchPromise) {
    prefetchPromise = Promise.all([
      loadNetworkStatusIcon(),
      loadMobileOfflineNotice(),
      loadPendingQueueButton(),
    ]).then(() => undefined);
  }
  return prefetchPromise;
}

export type AppMenuMobileShell = {
  NetworkStatusIcon: Component;
  MobileOfflineNotice: Component;
  PendingQueueButton: Component;
};

export async function resolveAppMenuMobileShell(): Promise<AppMenuMobileShell> {
  await prefetchAppMenuMobileShell();
  const [network, notice, pending] = await Promise.all([
    loadNetworkStatusIcon(),
    loadMobileOfflineNotice(),
    loadPendingQueueButton(),
  ]);

  return {
    NetworkStatusIcon: network.default,
    MobileOfflineNotice: notice.default,
    PendingQueueButton: pending.default,
  };
}
