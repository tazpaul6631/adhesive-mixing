<template>
  <div class="error-container">
    <h1>404</h1>
    <p>Ối! Trang bạn tìm kiếm không tồn tại.</p>
    <button type="button" class="back-link" @click="handleGoBack">
      Quay lại Dashboard
    </button>
  </div>
</template>

<script setup lang="ts">
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
  min-height: 40vh;
  padding: 24px;
  text-align: center;
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

.back-link {
  margin-top: 8px;
  padding: 8px 12px;
  border: none;
  background: transparent;
  color: #3182ce;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
}

.back-link:hover,
.back-link:focus-visible {
  text-decoration: underline;
  outline: none;
}
</style>
