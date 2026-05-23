<template>
  <Select
    v-model="selectedLocaleOption"
    :options="localeOptions"
    option-label="name"
    :placeholder="t('login.changeLanguage')"
    class="locale-select"
    :class="selectClass"
    :aria-label="t('login.changeLanguage')"
    :append-to="appendTo"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import Select from 'primevue/select';
import { useAppLocale } from '@/composables/useAppLocale';
import { LOCALE_ORDER, LOCALE_NAMES, type AppLocale, type DeviceLocaleScope } from '@/i18n';

type LocaleOption = {
  value: AppLocale;
  name: string;
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
  name: LOCALE_NAMES[value],
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
.locale-select {
  min-width: 9rem;
}

.locale-select :deep(.p-select-label) {
  display: flex;
  align-items: center;
  padding-top: 0.35rem;
  padding-bottom: 0.35rem;
}

.locale-select :deep(.p-select-dropdown) {
  width: 2rem;
}
</style>
