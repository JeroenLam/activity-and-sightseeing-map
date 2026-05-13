import { fileURLToPath } from 'node:url';
import { mergeConfig, defineConfig } from 'vite';
import viteConfig from './vite.config';

export default mergeConfig(
    viteConfig,
    defineConfig({
        test: {
            environment: 'jsdom',
            globals: true,
            root: fileURLToPath(new URL('./', import.meta.url)),
        },
    })
);
