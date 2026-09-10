/**
 * Lazy chunk loaders khớp router — dùng preload trên AppMenu
 * để tránh đứng yên vài giây khi lần đầu bấm menu.
 */
export const MENU_ROUTE_CHUNK_LOADERS: Record<string, () => Promise<unknown>> = {
  '/list-mix-glue': () => import('@/views/Tablet/MixGlue/ListMixGlue.vue'),
  '/list-separate-mixed-glue-management': () =>
    import('@/views/Tablet/Separate/ListSeparateMixedglue.vue'),
  '/glue-return-log': () => import('@/views/Tablet/GlueReturnLog/ListGlueReturnLog.vue'),
  '/mobile': () => import('@/views/Mobile/GlueConfirm.vue'),
  '/mobile/glue-return': () => import('@/views/Mobile/GlueReturn.vue'),
  '/mobile/glue-return-in-room': () => import('@/views/Mobile/GlueRetuenInRoom.vue'),
  '/mobile/glue-info-check': () => import('@/views/Mobile/GlueInfoCheck.vue'),
  '/mobile/glue-check-list': () => import('@/views/Mobile/GlueCheckList.vue'),
};

/** Ưu tiên preload trước (tablet list nặng nhất). */
const PRELOAD_PRIORITY = [
  '/list-mix-glue',
  '/list-separate-mixed-glue-management',
  '/glue-return-log',
];

const preloadedPaths = new Set<string>();

export function preloadMenuRouteChunk(path: string): Promise<void> {
  const loader = MENU_ROUTE_CHUNK_LOADERS[path];
  if (!loader) {
    return Promise.resolve();
  }
  if (preloadedPaths.has(path)) {
    return Promise.resolve();
  }

  return loader()
    .then(() => {
      preloadedPaths.add(path);
    })
    .catch((error) => {
      console.warn('[AppMenu] preload chunk failed:', path, error);
    });
}

function sortPathsForPreload(paths: string[]): string[] {
  const unique = [...new Set(paths)];
  return unique.sort((a, b) => {
    const ia = PRELOAD_PRIORITY.indexOf(a);
    const ib = PRELOAD_PRIORITY.indexOf(b);
    const ra = ia === -1 ? PRELOAD_PRIORITY.length : ia;
    const rb = ib === -1 ? PRELOAD_PRIORITY.length : ib;
    return ra - rb;
  });
}

/** Preload song song (ưu tiên list tablet). */
export async function preloadMenuRouteChunks(paths: string[]) {
  const ordered = sortPathsForPreload(paths);
  await Promise.all(ordered.map((path) => preloadMenuRouteChunk(path)));
}
