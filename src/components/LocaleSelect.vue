<template>
  <Select v-model="selectedLocaleOption" :options="localeOptions" option-label="label"
    :placeholder="t('login.changeLanguage')" class="locale-select" :class="selectClass"
    :aria-label="t('login.changeLanguage')" :append-to="appendTo">
    <template #value="{ value, placeholder }">
      <div v-if="value" class="locale-option">
        <img :src="value.flag" :alt="value.label" class="locale-option__flag" />
        <!-- <span class="locale-option__label">{{ value.label }}</span> -->
      </div>
      <span v-else>{{ placeholder }}</span>
    </template>

    <template #option="{ option }">
      <div class="locale-option">
        <img :src="option.flag" :alt="option.label" class="locale-option__flag" />
        <!-- <span class="locale-option__label">{{ option.label }}</span> -->
      </div>
    </template>
  </Select>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Select from 'primevue/select';
import { useAppLocale } from '@/composables/useAppLocale';
import {
  LOCALE_ORDER,
  LOCALE_SHORT_LABELS,
  type AppLocale,
  type DeviceLocaleScope,
} from '@/i18n';
import flagVi from '@/assets/locale/vi.png';
import flagEn from '@/assets/locale/en.png';
import flagZh from '@/assets/locale/zh-tw.png';

type LocaleOption = {
  value: AppLocale;
  label: string;
  flag: string;
};

const LOCALE_FLAGS: Record<AppLocale, string> = {
  vi: flagVi,
  en: flagEn,
  zh: flagZh,
};

const props = withDefaults(
  defineProps<{
    deviceScope?: DeviceLocaleScope;
    appendTo?: 'body' | 'self' | HTMLElement;
    selectClass?: string;
  }>(),
  {
    appendTo: 'body',
    selectClass: '',
  }
);

const viewportWidth = ref(window.innerWidth);

const resolvedDeviceScope = computed<DeviceLocaleScope>(() =>
  props.deviceScope ?? (viewportWidth.value >= 768 ? 'tablet' : 'mobile')
);

const { t, locale, applyLocale } = useAppLocale(() => resolvedDeviceScope.value);

const localeOptions: LocaleOption[] = LOCALE_ORDER.map((value) => ({
  value,
  label: LOCALE_SHORT_LABELS[value],
  flag: LOCALE_FLAGS[value],
}));

const selectedLocaleOption = computed({
  get: () => localeOptions.find((option) => option.value === (locale.value as AppLocale)) ?? localeOptions[0],
  set: (option: LocaleOption | null) => {
    if (option?.value) {
      void applyLocale(option.value);
    }
  },
});

const onResize = () => {
  viewportWidth.value = window.innerWidth;
};

onMounted(() => window.addEventListener('resize', onResize));
onUnmounted(() => window.removeEventListener('resize', onResize));
</script>

<style scoped>
.locale-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
}

.locale-select :deep(.p-select-dropdown) {
  width: 2rem;
}

.locale-option {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.locale-option__flag {
  width: 1.5rem;
  height: 1rem;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
}

.locale-option__label {
  font-weight: 600;
  line-height: 1;
}
</style>
