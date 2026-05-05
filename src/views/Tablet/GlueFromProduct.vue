<template>
  <ion-page>
    <ion-content>
      <ion-header class="header-container">
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-back-button default-href="/app-menu"></ion-back-button>
          </ion-buttons>
          <ion-title>Glue from Product</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="main-container">
        <h2>Quản lý trộn keo</h2>
        <p>Chức năng này đang được phát triển...</p>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton,
  IonTitle
} from '@ionic/vue';
</script>

<style scoped></style>