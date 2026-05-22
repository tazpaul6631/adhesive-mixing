import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import storageService from '@/services/storage.service';
import {
  type AppLocale,
  type DeviceLocaleScope,
  LOCALE_ORDER,
  LOCALE_SHORT_LABELS,
  setI18nDeviceScope,
} from '@/i18n';

const STORAGE_KEYS: Record<DeviceLocaleScope, string> = {
  mobile: 'LOCALE_MOBILE',
  tablet: 'LOCALE_TABLET',
};

function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === 'vi' || value === 'en' || value === 'zh';
}

function getDeviceScope(width = window.innerWidth): DeviceLocaleScope {
  return width >= 768 ? 'tablet' : 'mobile';
}

async function getSavedLocale(device: DeviceLocaleScope): Promise<AppLocale> {
  const saved = await storageService.get(STORAGE_KEYS[device]);
  return isAppLocale(saved) ? saved : 'vi';
}

export async function initAppLocale(width = window.innerWidth): Promise<AppLocale> {
  const device = getDeviceScope(width);
  const locale = await getSavedLocale(device);
  setI18nDeviceScope(device, locale);
  return locale;
}

export function useAppLocale(getDeviceScopeFn: () => DeviceLocaleScope = () => getDeviceScope()) {
  const { t, locale } = useI18n({ useScope: 'global' });

  const currentLocaleLabel = computed(() => LOCALE_SHORT_LABELS[locale.value as AppLocale] ?? locale.value);
  const currentLocaleIndex = computed(() => {
    const index = LOCALE_ORDER.indexOf(locale.value as AppLocale);
    return index >= 0 ? index : 0;
  });

  const applyLocale = async (nextLocale: AppLocale) => {
    const device = getDeviceScopeFn();
    await storageService.set(STORAGE_KEYS[device], nextLocale);
    setI18nDeviceScope(device, nextLocale);
  };

  const cycleLocale = async () => {
    const nextLocale = LOCALE_ORDER[(currentLocaleIndex.value + 1) % LOCALE_ORDER.length];
    await applyLocale(nextLocale);
  };

  const syncLocaleForDevice = async () => {
    const device = getDeviceScopeFn();
    const savedLocale = await getSavedLocale(device);
    setI18nDeviceScope(device, savedLocale);
  };

  return {
    t,
    locale,
    currentLocaleLabel,
    cycleLocale,
    applyLocale,
    syncLocaleForDevice,
  };
}
