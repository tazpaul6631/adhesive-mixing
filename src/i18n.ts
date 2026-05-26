import { createI18n } from 'vue-i18n';
import mobileVi from './locales/mobile/vi.json';
import mobileEn from './locales/mobile/en.json';
import mobileZh from './locales/mobile/zh-tw.json';
import tabletVi from './locales/tablet/vi.json';
import tabletEn from './locales/tablet/en.json';
import tabletZh from './locales/tablet/zh-tw.json';

export type AppLocale = 'vi' | 'en' | 'zh';
export type DeviceLocaleScope = 'mobile' | 'tablet';

export const LOCALE_ORDER: AppLocale[] = ['vi', 'en', 'zh'];

export const LOCALE_SHORT_LABELS: Record<AppLocale, string> = {
  vi: '',
  en: '',
  zh: '',
};

export const LOCALE_NAMES: Record<AppLocale, string> = {
  vi: 'Tiếng Việt',
  en: 'English',
  zh: '中文',
};

const deviceMessages: Record<DeviceLocaleScope, Record<AppLocale, Record<string, unknown>>> = {
  mobile: {
    vi: mobileVi,
    en: mobileEn,
    zh: mobileZh,
  },
  tablet: {
    vi: tabletVi,
    en: tabletEn,
    zh: tabletZh,
  },
};

const i18n = createI18n({
  legacy: false,
  locale: 'vi',
  fallbackLocale: 'en',
  globalInjection: true,
  messages: {
    vi: mobileVi,
    en: mobileEn,
    zh: mobileZh,
  } as any,
});

export function setI18nDeviceScope(device: DeviceLocaleScope, locale?: AppLocale) {
  const bundle = deviceMessages[device];
  LOCALE_ORDER.forEach((loc) => {
    i18n.global.setLocaleMessage(loc, bundle[loc] as any);
  });

  if (locale) {
    i18n.global.locale.value = locale;
  }
}

export default i18n;
