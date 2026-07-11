import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from '@/router';
import { useAppStore } from '@/stores/app';
import { useAuthStore } from '@/stores/auth';
import '@/assets/mobile.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js');
  });
}

const auth = useAuthStore(pinia);
const store = useAppStore(pinia);
store.hydrate();
void auth.restoreSession().then(() => {
  if (auth.user) {
    store.setUser(auth.user);
    if (!store.locations.length) {
      void store.bootstrapFromServer();
    }
    void store.loadConflicts();
  }
});

app.mount('#app');
