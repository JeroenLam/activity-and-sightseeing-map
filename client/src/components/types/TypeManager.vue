<template>
  <div class="type-manager">
    <h2>{{ t('types.title') }}</h2>

    <!-- Add new type -->
    <form class="type-add-form" @submit.prevent="onAdd">
      <input v-model="newName" type="text" :placeholder="t('types.name')" required />
      <input v-model="newColor" type="color" class="color-input" />
      <button type="submit" class="btn-primary btn-small">{{ t('types.add') }}</button>
    </form>

    <!-- Types list -->
    <div class="types-list">
      <div
        v-for="lt in sortedTypes"
        :key="lt.id"
        class="type-row"
      >
        <template v-if="editingId === lt.id">
          <input v-model="editName" type="text" class="edit-input" />
          <input v-model="editColor" type="color" class="color-input" />
          <button class="btn-small btn-primary" @click="onSaveEdit(lt.id)">{{ t('types.save') }}</button>
          <button class="btn-small btn-ghost" @click="editingId = ''">{{ t('types.cancel') }}</button>
        </template>
        <template v-else>
          <span class="type-color" :style="{ background: lt.color }"></span>
          <span class="type-name">{{ lt.name }}</span>
          <span class="type-count">({{ countLocations(lt.id) }})</span>
          <div class="type-actions">
            <button class="btn-ghost" @click="startEdit(lt)">✏️</button>
            <button class="btn-ghost btn-danger" @click="onDelete(lt)">🗑️</button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import type { LocationType } from '@/types';

const { t } = useI18n();
const typesStore = useTypesStore();
const locationsStore = useLocationsStore();

const sortedTypes = computed(() =>
  [...typesStore.types].sort((a, b) => a.name.localeCompare(b.name))
);

const newName = ref('');
const newColor = ref('#9E9E9E');
const editingId = ref('');
const editName = ref('');
const editColor = ref('');

function countLocations(typeId: string): number {
  return locationsStore.locations.filter((l) => l.type === typeId).length;
}

async function onAdd() {
  if (!newName.value) return;
  await typesStore.createType({ name: newName.value, color: newColor.value });
  newName.value = '';
  newColor.value = '#9E9E9E';
}

function startEdit(lt: LocationType) {
  editingId.value = lt.id;
  editName.value = lt.name;
  editColor.value = lt.color;
}

async function onSaveEdit(id: string) {
  await typesStore.updateType(id, { name: editName.value, color: editColor.value });
  editingId.value = '';
}

async function onDelete(lt: LocationType) {
  const count = countLocations(lt.id);
  let msg = t('types.deleteConfirm');
  if (count > 0) {
    msg += '\n' + t('types.deleteWarning', { count });
  }
  if (confirm(msg)) {
    await typesStore.deleteType(lt.id);
  }
}
</script>

<style scoped>
.type-manager h2 {
  margin: 0 0 1rem;
}

.type-add-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.25rem;
}

.type-add-form input[type='text'] {
  flex: 1;
  max-width: 250px;
}

.color-input {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  padding: 2px;
  cursor: pointer;
}

.types-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.type-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.type-color {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  flex-shrink: 0;
}

.type-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.type-count {
  font-size: 0.8rem;
  color: var(--color-text-secondary);
}

.type-actions {
  margin-left: auto;
  display: flex;
  gap: 0.25rem;
}

.edit-input {
  flex: 1;
  max-width: 200px;
}

.btn-small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.btn-danger:hover {
  color: var(--color-error) !important;
}

@media (max-width: 768px) {
  .type-add-form {
    flex-wrap: wrap;
  }

  .type-add-form input[type='text'] {
    max-width: 100%;
    flex-basis: 100%;
  }

  .type-row {
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .type-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
