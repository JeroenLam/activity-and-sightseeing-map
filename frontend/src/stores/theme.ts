import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useThemeStore = defineStore('theme', () => {
  const dark = ref(localStorage.getItem('theme') === 'dark');

  function toggle() {
    dark.value = !dark.value;
  }

  function apply() {
    document.documentElement.classList.toggle('dark', dark.value);
    localStorage.setItem('theme', dark.value ? 'dark' : 'light');
  }

  apply();
  watch(dark, apply);

  return { dark, toggle };
});
