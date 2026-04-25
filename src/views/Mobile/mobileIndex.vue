<template>
  <ion-page>
    <ion-content>
      <ion-header class="header-container">
        <ion-toolbar color="primary">
          <ion-buttons slot="start">
            <ion-back-button default-href="/app-menu"></ion-back-button>
          </ion-buttons>
          <ion-title>Mobile</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="menu-container">
        Mobile
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import {
  IonPage, IonContent, IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle
} from '@ionic/vue';
</script>

<style scoped>
.menu-container {
  max-width: 1000px;
  margin: 0 auto;
  padding: 10px;
}
</style>