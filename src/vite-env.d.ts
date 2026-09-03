/// <reference types="vite/client" />

import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresMixGlueRoom?: boolean;
    requiresMixGluePhone?: boolean;
    requiresQip?: boolean;
    skipRouteLoading?: boolean;
    /** Cache instance list tablet qua keep-alive (meta, không dùng :include tên SFC). */
    keepAlive?: boolean;
  }
}
