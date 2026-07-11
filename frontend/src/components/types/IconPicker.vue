<template>
  <div class="icon-picker" ref="pickerRef">
    <button type="button" class="picker-trigger btn btn-small" @click.stop="open = !open">
      <svg v-if="currentPath" viewBox="0 0 24 24" class="picker-icon"><path :d="currentPath" fill="currentColor"/></svg>
      <span v-else>{{ t('types.icon') }}</span>
    </button>
    <div v-if="open" class="picker-popup" @click.stop>
      <input v-model="search" type="text" :placeholder="t('types.searchIcon')" class="picker-search" ref="searchInput" />
      <div class="picker-grid">
        <button
          v-for="icon in filteredIcons"
          :key="icon.name"
          type="button"
          class="picker-cell"
          :class="{ active: modelValue === icon.name }"
          :title="icon.name"
          @click="select(icon.name)"
        >
          <svg viewBox="0 0 24 24"><path :d="icon.path" fill="currentColor"/></svg>
        </button>
      </div>
      <p v-if="!filteredIcons.length" class="picker-empty">{{ t('types.noIconsFound') }}</p>
      <button v-if="modelValue" type="button" class="btn btn-small picker-clear" @click="select('')">{{ t('types.clearIcon') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import * as mdiIcons from '@mdi/js';
import { getIconPath } from '@/composables/useIconPath';

const { t } = useI18n();

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const search = ref('');
const pickerRef = ref<HTMLElement>();
const searchInput = ref<HTMLInputElement>();

interface IconEntry { name: string; path: string; }

const allIcons = computed<IconEntry[]>(() => {
  const entries: IconEntry[] = [];
  for (const [key, value] of Object.entries(mdiIcons)) {
    if (!key.startsWith('mdi') || typeof value !== 'string') continue;
    const name = key.slice(3).replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
    entries.push({ name, path: value });
  }
  return entries;
});

const filteredIcons = computed(() => {
  const q = search.value.toLowerCase();
  const list = q ? allIcons.value.filter((i) => i.name.includes(q)) : allIcons.value;
  return list.slice(0, 50);
});

const currentPath = computed(() => getIconPath(props.modelValue));

function select(name: string) {
  emit('update:modelValue', name);
  open.value = false;
  search.value = '';
}

function onClickOutside(e: MouseEvent) {
  const target = e.target;
  if (!(target instanceof Node)) {
    return;
  }
  if (pickerRef.value && !pickerRef.value.contains(target)) {
    open.value = false;
  }
}

watch(open, (v) => {
  if (v) setTimeout(() => searchInput.value?.focus(), 50);
});

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
.icon-picker { position: relative; display: inline-block; }

.picker-trigger {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.picker-icon { width: 18px; height: 18px; }

.picker-popup {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  padding: 0.5rem;
  z-index: 1000;
}

.picker-search {
  width: 100%;
  margin-bottom: 0.5rem;
  font-size: 0.8rem;
  padding: 0.4rem 0.5rem;
}

.picker-grid {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 4px;
}

.picker-cell {
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: 6px;
  background: none;
  cursor: pointer;
  padding: 6px;
  color: var(--color-text);
}
.picker-cell:hover { background: var(--color-bg); }
.picker-cell.active { border-color: var(--color-primary); background: var(--color-primary-light); }
.picker-cell svg { width: 20px; height: 20px; }

.picker-empty { font-size: 0.75rem; color: var(--color-text-secondary); text-align: center; padding: 0.5rem; }
.picker-clear { margin-top: 0.5rem; width: 100%; }
</style>
