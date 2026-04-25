<template>
  <ion-page>
    <div class="error-container">
      <h1>404</h1>
      <p>Ối! Trang bạn tìm kiếm không tồn tại.</p>
      <ion-button fill="clear" @click="handleGoBack">
        Quay lại Dashboard
      </ion-button>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonButton } from '@ionic/vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const handleGoBack = () => {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
  router.push('/dashboard');
};
</script>

<style scoped>
.error-container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  margin: auto;
}

h1 {
  font-size: 80px;
  font-weight: 900;
  color: #3182ce;
  margin: 0;
}

p {
  color: #718096;
  font-size: 18px;
}
</style>