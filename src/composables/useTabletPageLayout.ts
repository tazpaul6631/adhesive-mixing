import { computed, type ComputedRef, type Ref } from 'vue';
import { useWindowSize } from '@vueuse/core';

/** Tablet 8.7" (Tab A9) vs 11.0" (Tab A9+ / A11). */
type TabletPageTier = 'inch87' | 'inch11';

const INCH11_LONG_SIDE_MIN = 1100;

const getTabletPageTier = (width: number, height: number): TabletPageTier => {
  const longSide = Math.max(width, height);
  return longSide >= INCH11_LONG_SIDE_MIN ? 'inch11' : 'inch87';
};

interface UseTabletPageLayoutOptions {
  stackedTables?: Ref<number> | ComputedRef<number> | number;
  /** Trừ px cho chrome trang (toolbar, header card, paginator…). */
  pageChromeOffset?: number;
  /** Màn danh sách 1 bảng full — chrome nhỏ hơn màn chi tiết. */
  listPage?: boolean;
  /** Màn danh sách có thêm toolbar (cân, chọn dòng…) phía trên bảng. */
  listPageWithToolbar?: boolean;
}

export function useTabletPageLayout(options: UseTabletPageLayoutOptions = {}) {
  const { width, height } = useWindowSize();

  const tier = computed(() => getTabletPageTier(width.value, height.value));
  const isPortrait = computed(() => height.value > width.value);
  const isInch11 = computed(() => tier.value === 'inch11');

  const stackedCount = computed(() => {
    const raw = options.stackedTables;
    if (raw == null) return 1;
    return typeof raw === 'number' ? raw : Math.max(1, raw.value);
  });

  const pageClass = computed(() => [
    'tablet-page',
    `tablet-page--${tier.value}`,
    isPortrait.value ? 'tablet-page--portrait' : 'tablet-page--landscape',
    options.listPage || options.listPageWithToolbar ? 'tablet-page--list' : '',
  ]);

  const resolveChromeOffset = () => {
    if (options.pageChromeOffset != null) return options.pageChromeOffset;
    const inch11 = isInch11.value;
    const portrait = isPortrait.value;
    if (options.listPageWithToolbar) {
      return portrait ? (inch11 ? 380 : 320) : (inch11 ? 360 : 300);
    }
    if (options.listPage) {
      return portrait ? (inch11 ? 260 : 220) : (inch11 ? 240 : 200);
    }
    return portrait ? (inch11 ? 400 : 340) : (inch11 ? 370 : 310);
  };

  const tableScrollHeight = computed(() => {
    const inch11 = isInch11.value;
    const portrait = isPortrait.value;
    const chrome = resolveChromeOffset();
    const stackGap = stackedCount.value > 1 ? (inch11 ? 24 : 16) : 0;
    const available = height.value - chrome - stackGap * (stackedCount.value - 1);
    const perTable = available / stackedCount.value;

    if (options.listPage || options.listPageWithToolbar) {
      const min = portrait ? (inch11 ? 200 : 140) : (inch11 ? 280 : 180);
      const max = portrait ? (inch11 ? 460 : 340) : (inch11 ? 580 : 420);
      return `${Math.min(max, Math.max(min, Math.round(perTable * 0.94)))}px`;
    }

    const min = portrait ? (inch11 ? 200 : 150) : (inch11 ? 280 : 190);
    const max = portrait ? (inch11 ? 380 : 260) : (inch11 ? 460 : 300);
    return `${Math.min(max, Math.max(min, Math.round(perTable * 0.92)))}px`;
  });

  const emptyStateMinHeight = computed(() => {
    if (options.listPage || options.listPageWithToolbar) {
      return isInch11.value ? '360px' : '250px';
    }
    return isInch11.value ? '240px' : '160px';
  });

  return {
    pageClass,
    tableScrollHeight,
    emptyStateMinHeight,
  };
}
