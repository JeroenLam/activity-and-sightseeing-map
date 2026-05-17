<template>
  <div class="icon-picker">
    <div class="icon-trigger" @click="open = !open">
      <svg v-if="selectedPath" viewBox="0 0 24 24" class="icon-preview">
        <path :d="selectedPath" fill="currentColor" />
      </svg>
      <span v-else class="icon-placeholder">—</span>
      <span class="icon-label">{{ modelValue || t('types.selectIcon') }}</span>
    </div>

    <div v-if="open" class="icon-dropdown">
      <input
        ref="searchInput"
        v-model="search"
        type="text"
        class="icon-search"
        :placeholder="t('types.searchIcon')"
        @keydown.esc="open = false"
      />
      <div class="icon-grid">
        <button
          v-for="icon in filteredIcons"
          :key="icon.name"
          type="button"
          class="icon-cell"
          :class="{ selected: icon.name === modelValue }"
          :title="icon.name"
          @click="selectIcon(icon.name)"
        >
          <svg viewBox="0 0 24 24" class="icon-svg">
            <path :d="icon.path" fill="currentColor" />
          </svg>
        </button>
        <p v-if="filteredIcons.length === 0" class="no-results">{{ t('types.noIconsFound') }}</p>
      </div>
      <button v-if="modelValue" type="button" class="icon-clear" @click="selectIcon('')">
        {{ t('types.clearIcon') }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import * as mdiIcons from '@mdi/js';

const { t } = useI18n();

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{ 'update:modelValue': [value: string] }>();

const open = ref(false);
const search = ref('');
const searchInput = ref<HTMLInputElement>();

// Build icon list once (cached)
interface IconEntry { name: string; path: string; searchTerms: string }

let _iconList: IconEntry[] | null = null;
function getIconList(): IconEntry[] {
  if (_iconList) return _iconList;
  _iconList = [];
  for (const [key, path] of Object.entries(mdiIcons)) {
    if (!key.startsWith('mdi') || typeof path !== 'string') continue;
    // Convert mdiAccountCircle -> account-circle
    const name = key.slice(3).replace(/([A-Z])/g, '-$1').toLowerCase().slice(1);
    _iconList.push({ name, path, searchTerms: name });
  }
  _iconList.sort((a, b) => a.name.localeCompare(b.name));
  return _iconList;
}

// Popular/common icons shown when search is empty
const POPULAR_ICONS = [
  'map-marker', 'star', 'heart', 'home', 'castle', 'church', 'city',
  'pine-tree', 'palm-tree', 'flower', 'fish', 'paw', 'cat', 'dog',
  'food', 'food-fork-drink', 'coffee', 'beer', 'glass-wine',
  'shopping', 'cart', 'store', 'bank', 'office-building',
  'school', 'hospital', 'pharmacy', 'bus', 'train', 'airplane',
  'car', 'bike', 'walk', 'swim', 'soccer', 'basketball', 'tennis',
  'music', 'movie', 'theater', 'camera', 'palette', 'brush',
  'book', 'library', 'museum', 'binoculars', 'telescope',
  'mountain', 'beach', 'waves', 'weather-sunny', 'campfire',
  'tent', 'hiking', 'flag', 'trophy', 'medal',
  'ferris-wheel', 'roller-coaster', 'human-child',
  'elephant', 'horse', 'owl', 'penguin', 'duck', 'butterfly',
  'grill', 'fire', 'rocket', 'earth', 'island',
  'forest', 'water', 'bridge', 'lighthouse', 'anchor', 'sail-boat',
  'factory', 'shield', 'sword', 'crown', 'history',
  'atom', 'flask', 'microscope', 'dna', 'robot', 'dinosaur',
];

const selectedPath = computed(() => {
  if (!props.modelValue) return '';
  const list = getIconList();
  return list.find((i) => i.name === props.modelValue)?.path ?? '';
});

const filteredIcons = computed(() => {
  const list = getIconList();
  const q = search.value.toLowerCase().trim();
  if (!q) {
    // Show popular icons when no search
    const popularSet = new Set(POPULAR_ICONS);
    return list.filter((i) => popularSet.has(i.name));
  }
  const terms = q.split(/\s+/);
  return list
    .filter((i) => terms.every((term) => i.searchTerms.includes(term)))
    .slice(0, 200);
});

function selectIcon(name: string) {
  emit('update:modelValue', name);
  open.value = false;
  search.value = '';
}

watch(open, async (isOpen) => {
  if (isOpen) {
    await nextTick();
    searchInput.value?.focus();
  }
});

// Close on outside click
function onClickOutside(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest('.icon-picker');
  if (!el) open.value = false;
}

onMounted(() => document.addEventListener('click', onClickOutside));
onUnmounted(() => document.removeEventListener('click', onClickOutside));
</script>

<style scoped>
.icon-picker {
  position: relative;
}

.icon-trigger {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  background: var(--color-surface);
  min-width: 120px;
}

.icon-preview {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
}

.icon-placeholder {
  width: 20px;
  text-align: center;
  color: var(--color-text-secondary);
}

.icon-label {
  font-size: 0.8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.icon-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 100;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  width: 320px;
  max-height: 360px;
  display: flex;
  flex-direction: column;
  margin-top: 4px;
}

.icon-search {
  padding: 0.5rem;
  border: none;
  border-bottom: 1px solid var(--color-border);
  font-size: 0.85rem;
  outline: none;
  border-radius: 8px 8px 0 0;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 2px;
  padding: 0.5rem;
  overflow-y: auto;
  flex: 1;
}

.icon-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  background: none;
  color: var(--color-text);
  transition: background 0.1s;
}

.icon-cell:hover {
  background: var(--color-bg);
  border-color: var(--color-border);
}

.icon-cell.selected {
  background: var(--color-primary-light, #e0e7ff);
  border-color: var(--color-primary);
}

.icon-svg {
  width: 20px;
  height: 20px;
}

.no-results {
  grid-column: 1 / -1;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  padding: 1rem;
}

.icon-clear {
  padding: 0.4rem;
  border: none;
  border-top: 1px solid var(--color-border);
  background: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  border-radius: 0 0 8px 8px;
}

.icon-clear:hover {
  background: var(--color-bg);
}

@media (max-width: 768px) {
  .icon-dropdown {
    width: 280px;
  }

  .icon-grid {
    grid-template-columns: repeat(7, 1fr);
  }
}
</style>
