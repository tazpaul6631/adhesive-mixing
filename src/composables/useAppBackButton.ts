import { onUnmounted } from 'vue';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';

export type AppBackButtonProcessNext = () => void;

/** API giống Ionic: không gọi processNextHandler = consume event. */
export type AppBackButtonHandler = (
  processNextHandler: AppBackButtonProcessNext,
  canGoBack: boolean,
) => void | Promise<void>;

type RegisteredHandler = {
  id: number;
  priority: number;
  handler: AppBackButtonHandler;
};

const handlers = new Map<number, RegisteredHandler>();
let nextId = 1;
let pluginListener: PluginListenerHandle | undefined;
let ensurePromise: Promise<void> | null = null;
let busy = false;

async function ensureCapacitorListener() {
  if (!Capacitor.isNativePlatform()) return;
  if (pluginListener || ensurePromise) {
    await ensurePromise;
    return;
  }

  ensurePromise = App.addListener('backButton', ({ canGoBack }) => {
    void dispatchBackButton(canGoBack);
  })
    .then((handle) => {
      pluginListener = handle;
    })
    .catch((error) => {
      ensurePromise = null;
      console.error('[useAppBackButton] Failed to listen backButton:', error);
    });

  await ensurePromise;
}

async function dispatchBackButton(canGoBack: boolean) {
  if (busy) return;

  const queue = [...handlers.values()].sort(
    (a, b) => b.priority - a.priority || b.id - a.id,
  );

  if (queue.length === 0) {
    if (canGoBack) {
      window.history.back();
    } else {
      await App.exitApp();
    }
    return;
  }

  busy = true;

  const runFrom = async (start: number) => {
    if (start >= queue.length) {
      busy = false;
      return;
    }

    let continued = false;
    const processNextHandler = () => {
      continued = true;
      void runFrom(start + 1);
    };

    try {
      await queue[start].handler(processNextHandler, canGoBack);
    } catch (error) {
      console.error('[useAppBackButton] Handler error:', error);
    }

    if (!continued) {
      busy = false;
    }
  };

  await runFrom(0);
}

/**
 * Thay Ionic `useBackButton(priority, handler)` — Capacitor `App.backButton`.
 * Priority cao chạy trước; gọi `processNextHandler()` để chuyển handler kế (giống Ionic).
 */
export function useAppBackButton(priority: number, handler: AppBackButtonHandler) {
  const id = nextId++;
  handlers.set(id, { id, priority, handler });
  void ensureCapacitorListener();

  onUnmounted(() => {
    handlers.delete(id);
  });
}
