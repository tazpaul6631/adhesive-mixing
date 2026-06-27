<template>
  <div class="mix-glue-data-validation-error" role="alert">
    <p class="mix-glue-data-validation-error__message">{{ message }}</p>
    <ol class="mix-glue-data-validation-error__list">
      <li v-for="item in checklistItems" :key="item">{{ item }}</li>
    </ol>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useAppLocale } from '@/composables/useAppLocale';

const props = defineProps<{
  type: 'orderDetails' | 'mixChemicals' | 'noMixChemicals';
}>();

const { t } = useAppLocale(() => 'tablet');
const { tm } = useI18n({ useScope: 'global' });

const message = computed(() =>
  t(`mixGlueManagement.dataValidation.${props.type}.message`)
);

const checklistItems = computed(() => {
  const items = tm(`mixGlueManagement.dataValidation.${props.type}.items`) as unknown;
  return Array.isArray(items) ? items.map(String) : [];
});
</script>

<style scoped>
.mix-glue-data-validation-error {
  margin: 1rem;
  padding: 1rem 1.25rem;
  border: 1px solid #fca5a5;
  border-radius: 0.75rem;
  background-color: #fef2f2;
  color: #b91c1c;
}

.mix-glue-data-validation-error__message {
  margin: 0 0 0.75rem;
  font-weight: 600;
  line-height: 1.5;
}

.mix-glue-data-validation-error__list {
  margin: 0;
  padding-left: 1.25rem;
  line-height: 1.6;
}

.mix-glue-data-validation-error__list li + li {
  margin-top: 0.25rem;
}
</style>
