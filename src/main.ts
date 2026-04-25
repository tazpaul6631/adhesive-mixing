import { createApp } from 'vue'
import App from './App.vue'
import router from './router';
import i18n from '@/i18n';
import { createPinia } from 'pinia';
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate';
import PrimeVue from 'primevue/config';
import Aura from '@primeuix/themes/aura';
import { IonicVue } from '@ionic/vue';

// --- IMPORT FILE PLUGIN VỪA TẠO ---
import PrimeComponents from '@/plugins/prime';

import '@ionic/vue/css/core.css';
import './theme/variables.css';
import 'primeflex/primeflex.css';

const pinia = createPinia();
pinia.use(piniaPluginPersistedstate);

const app = createApp(App)
  .use(IonicVue)
  .use(pinia)
  .use(router)
  .use(i18n)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      options: {
        prefix: 'p',
        darkModeSelector: '.ion-palette-dark',
      }
    },
    ripple: true,
    zIndex: {
      modal: 1100,
      overlay: 1000,
      menu: 1000,
      tooltip: 1100
    }
  })
  // --- KÍCH HOẠT ĐĂNG KÝ COMPONENT TẠI ĐÂY ---
  .use(PrimeComponents);

router.isReady().then(() => {
  app.mount('#app');
});