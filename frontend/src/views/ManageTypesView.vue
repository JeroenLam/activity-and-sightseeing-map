<template>
  <div class="page-container">
    <div class="page-header">
      <h2>{{ t('types.title') }}</h2>
    </div>

    <!-- Add type form -->
    <form class="add-type-form" @submit.prevent="addType">
      <input v-model="newName" type="text" :placeholder="t('types.name')" required />
      <input v-model="newColor" type="color" class="color-input" />
      <IconPicker v-model="newIcon" />
      <button type="submit" class="btn btn-primary btn-small">{{ t('types.add') }}</button>
    </form>

    <div v-if="typesStore.loading" class="text-secondary">{{ t('common.loading') }}</div>

    <div v-else-if="!typesStore.types.length" class="text-secondary">{{ t('manage.empty') }}</div>

    <div v-else class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>{{ t('types.icon') }}</th>
            <th>{{ t('types.name') }}</th>
            <th>{{ t('types.color') }}</th>
            <th class="hide-mobile">{{ t('common.count') }}</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="lt in sortedTypes" :key="lt.id">
            <td>
              <span class="type-color" :style="{ background: lt.color }">
                <svg v-if="getIconPath(lt.icon)" viewBox="0 0 24 24" class="type-color-icon"><path :d="getIconPath(lt.icon)" fill="#fff"/></svg>
              </span>
            </td>
            <td>
              <template v-if="editingId === lt.id">
                <input v-model="editName" class="edit-input" />
              </template>
              <template v-else>{{ lt.name }}</template>
            </td>
            <td>
              <template v-if="editingId === lt.id">
                <input v-model="editColor" type="color" class="color-input" />
              </template>
              <template v-else>
                <span class="color-swatch" :style="{ background: lt.color }"></span>
              </template>
            </td>
            <td class="hide-mobile">{{ typeUsageCount(lt.id) }}</td>
            <td class="actions-cell">
              <template v-if="editingId === lt.id">
                <IconPicker v-model="editIcon" />
                <button class="btn btn-small btn-primary" @click="saveType(lt.id)">{{ t('types.save') }}</button>
                <button class="btn btn-small" @click="editingId = null">{{ t('types.cancel') }}</button>
              </template>
              <template v-else>
                <button class="btn btn-small" @click="startEdit(lt)">{{ t('manage.edit') }}</button>
                <button class="btn btn-small btn-danger" @click="confirmDeleteType(lt)">{{ t('types.delete') }}</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Delete confirm -->
    <div v-if="typeToDelete" class="overlay" @click.self="typeToDelete = null">
      <div class="dialog">
        <h3>{{ t('types.delete') }}</h3>
        <p>{{ t('types.deleteConfirm') }}</p>
        <p v-if="deleteTypeUsage > 0" class="text-error">{{ t('types.deleteWarning', { count: deleteTypeUsage }) }}</p>
        <div class="dialog-actions">
          <button class="btn" @click="typeToDelete = null">{{ t('types.cancel') }}</button>
          <button class="btn btn-danger" @click="doDeleteType">{{ t('common.delete') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useTypesStore } from '@/stores/types';
import { useLocationsStore } from '@/stores/locations';
import { getIconPath } from '@/composables/useIconPath';
import IconPicker from '@/components/types/IconPicker.vue';
import type { LocationType } from '@/types';

const { t } = useI18n();
const typesStore = useTypesStore();
const locationsStore = useLocationsStore();

const newName = ref('');
const newColor = ref('#4f46e5');
const newIcon = ref('');
const editingId = ref<string | null>(null);
const editName = ref('');
const editColor = ref('');
const editIcon = ref('');
const typeToDelete = ref<LocationType | null>(null);

const sortedTypes = computed(() =>
  [...typesStore.types].sort((a, b) => a.name.localeCompare(b.name))
);

const deleteTypeUsage = computed(() => {
  if (!typeToDelete.value) return 0;
  return locationsStore.collection.features.filter(
    (f) => f.properties.type?.id === typeToDelete.value!.id
  ).length;
});

function typeUsageCount(typeId: string): number {
  return locationsStore.collection.features.filter(
    (f) => f.properties.type?.id === typeId
  ).length;
}

async function addType() {
  if (!newName.value.trim()) return;
  await typesStore.createType({ name: newName.value.trim(), color: newColor.value, icon: newIcon.value.trim() || undefined });
  newName.value = ''; newColor.value = '#4f46e5'; newIcon.value = '';
}

function startEdit(lt: LocationType) {
  editingId.value = lt.id;
  editName.value = lt.name;
  editColor.value = lt.color;
  editIcon.value = lt.icon || '';
}

async function saveType(id: string) {
  await typesStore.updateType(id, { name: editName.value, color: editColor.value, icon: editIcon.value.trim() });
  editingId.value = null;
}

function confirmDeleteType(lt: LocationType) { typeToDelete.value = lt; }

async function doDeleteType() {
  if (!typeToDelete.value) return;
  await typesStore.deleteType(typeToDelete.value.id);
  typeToDelete.value = null;
}

onMounted(async () => {
  await Promise.all([typesStore.fetchTypes(), locationsStore.fetchLocations()]);
});
</script>

<style scoped>
.page-container { max-width: 800px; margin: 0 auto; padding: 1.5rem; }
.page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.page-header h2 { margin: 0; }

.add-type-form {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.add-type-form input[type="text"] { flex: 1; }
.color-input { width: 36px; height: 36px; padding: 2px; cursor: pointer; border-radius: 4px; }

.table-wrap { overflow-x: auto; }

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

th, td {
  padding: 0.5rem 0.6rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

th {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--color-text-secondary);
  white-space: nowrap;
}

tr:hover td {
  background: var(--color-bg);
}

.type-color {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.type-color-icon { width: 14px; height: 14px; }

.color-swatch {
  display: inline-block;
  width: 18px;
  height: 18px;
  border-radius: 4px;
}

.edit-input { width: 100%; padding: 0.3rem 0.5rem; font-size: 0.85rem; }

.actions-cell {
  white-space: nowrap;
  text-align: right;
}

.actions-cell button, .actions-cell .icon-picker { display: inline-flex; vertical-align: middle; }

@media (max-width: 768px) {
  .hide-mobile { display: none; }
  .page-container { padding: 1rem; }
  .add-type-form {
    flex-wrap: wrap;
  }
  .add-type-form input[type="text"] {
    flex: 1 1 100%;
    min-width: 0;
  }
}
</style>
