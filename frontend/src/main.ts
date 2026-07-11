import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import './assets/main.css';

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(i18n);

if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		void navigator.serviceWorker.register('/sw.js');
	});
}

app.mount('#app');
