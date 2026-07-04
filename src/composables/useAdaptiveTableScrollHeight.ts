import { computed, type Ref } from 'vue';
import { useElementSize, useWindowSize } from '@vueuse/core';

export interface UseAdaptiveTableScrollHeightOptions {
  /** Chiều cao tối thiểu vùng scroll body (px). */
  minPx?: number;
  /** Trừ header/footer DataTable (px) — có thể là getter reactive. */
  getReservedPx?: () => number;
  /** Hệ số fallback khi wrapper chưa đo được (tỷ lệ viewport). */
  fallbackViewportRatio?: number;
}

const DEFAULT_RESERVED_PX = 108;

/**
 * Tính scrollHeight cho PrimeVue DataTable theo chiều cao thực của wrapper (flex/vh).
 * Wrapper cần `flex: 1; min-height: 0` trong layout cha để đo đúng.
 */
export function useAdaptiveTableScrollHeight(
  wrapperRef: Ref<HTMLElement | null>,
  options: UseAdaptiveTableScrollHeightOptions = {}
) {
  const {
    minPx = 140,
    getReservedPx = () => DEFAULT_RESERVED_PX,
    fallbackViewportRatio = 0.38,
  } = options;

  const { height: wrapperHeight } = useElementSize(wrapperRef);
  const { height: windowHeight } = useWindowSize();

  const tableScrollHeight = computed(() => {
    const reserved = getReservedPx();
    const measured = wrapperHeight.value;

    if (measured > minPx + reserved) {
      return `${Math.round(measured - reserved)}px`;
    }

    const fallback = Math.round(windowHeight.value * fallbackViewportRatio);
    return `${Math.max(minPx, fallback)}px`;
  });

  const emptyStateMinHeight = computed(() => {
    const parsed = Number.parseInt(tableScrollHeight.value, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return `${Math.max(120, Math.round(parsed * 0.55))}px`;
    }
    return '160px';
  });

  return {
    tableScrollHeight,
    emptyStateMinHeight,
  };
}
