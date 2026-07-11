import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
    const dark = ref(localStorage.getItem('theme') === 'dark');
    const layoutMode = ref<'desktop' | 'mobile'>(
        localStorage.getItem('layoutMode') === 'mobile' ? 'mobile' : 'desktop',
    );

    function toggle() {
        dark.value = !dark.value;
    }

    function toggleLayoutMode() {
        layoutMode.value = layoutMode.value === 'desktop' ? 'mobile' : 'desktop';
    }

    function apply() {
        document.documentElement.classList.toggle('dark', dark.value);
        document.documentElement.classList.toggle('layout-mobile', layoutMode.value === 'mobile');
        document.documentElement.classList.toggle('layout-desktop', layoutMode.value === 'desktop');
        localStorage.setItem('theme', dark.value ? 'dark' : 'light');
        localStorage.setItem('layoutMode', layoutMode.value);
    }

    apply();
    watch(dark, apply);
    watch(layoutMode, apply);

    return { dark, layoutMode, toggle, toggleLayoutMode };
});
