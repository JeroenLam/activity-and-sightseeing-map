import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { i18n } from './i18n';
import './assets/main.css';

// Some mobile browsers can emit click targets that are Nodes without Element.closest.
// Provide a defensive fallback so delegated handlers do not crash.
if (!(Node.prototype as any).closest) {
    (Node.prototype as any).closest = function (selector: string) {
        const element = this instanceof Element ? this : this.parentElement;
        return element?.closest(selector) ?? null;
    };
}

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
