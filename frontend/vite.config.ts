import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        proxy: !process.env.VITE_API_URL
            ? {
                  '/api': {
                      target: 'http://backend:8000',
                      changeOrigin: true,
                  },
              }
            : undefined,
    },
});
