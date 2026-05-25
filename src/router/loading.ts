import { ref } from 'vue';

export const isRouteLoading = ref(false);

export function startRouteLoading() {
  isRouteLoading.value = true;
}

export function stopRouteLoading() {
  isRouteLoading.value = false;
}
