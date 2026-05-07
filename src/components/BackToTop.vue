<template>
  <ion-fab slot="fixed" vertical="bottom" horizontal="end" class="mb-4 mr-4" v-if="showScrollButton"
    style="z-index: 9999;">
    <Button icon="pi pi-arrow-up" rounded size="large" severity="primary" @click="handleScrollClick" />
  </ion-fab>
</template>

<script setup lang="ts">
import { IonFab } from '@ionic/vue';
import Button from 'primevue/button';

const props = defineProps({
  showScrollButton: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['scrollToTop']);

const handleScrollClick = () => {
  emit('scrollToTop');
};
</script>

<style scoped></style>