<template>
  <div class="type-manager">
    <h3>{{ $t('types.title') }}</h3>

    <form @submit.prevent="onAdd">
      <input v-model="newType.name" type="text" :placeholder="$t('types.name')" required />
      <input v-model="newType.color" type="color" />
      <input v-model="newType.icon" type="text" :placeholder="$t('types.icon')" />
      <button type="submit">{{ $t('common.add') }}</button>
    </form>

    <table>
      <thead>
        <tr>
          <th>{{ $t('types.name') }}</th>
          <th>{{ $t('types.color') }}</th>
          <th>{{ $t('types.icon') }}</th>
          <th>{{ $t('common.actions') }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="t in typesStore.types" :key="t.id">
          <td>{{ t.name }}</td>
          <td><span :style="{ background: t.color, display: 'inline-block', width: '20px', height: '20px' }"></span></td>
          <td>{{ t.icon }}</td>
          <td>
            <button @click="onDelete(t.id)">{{ $t('common.delete') }}</button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted } from 'vue';
import { useTypesStore } from '@/stores/types';

const typesStore = useTypesStore();

const newType = reactive({ name: '', color: '#4CAF50', icon: '' });

onMounted(() => {
  typesStore.fetchTypes();
});

async function onAdd() {
  await typesStore.createType({ name: newType.name, color: newType.color, icon: newType.icon });
  newType.name = '';
  newType.icon = '';
}

async function onDelete(id: string) {
  await typesStore.deleteType(id);
}
</script>
