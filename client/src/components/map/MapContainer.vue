<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import type { Location, LocationType } from '@/types';

const props = defineProps<{
  locations: Location[];
  types: LocationType[];
  viewMode: 'all' | 'transparency';
  visitedOpacity: number;
}>();

const emit = defineEmits<{
  markerClick: [location: Location];
  addYear: [locationId: string, year: number];
}>();

const mapEl = ref<HTMLDivElement>();
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;

const currentYear = new Date().getFullYear();

onMounted(() => {
  if (!mapEl.value) return;

  map = L.map(mapEl.value).setView([52.1, 5.3], 7);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);
  renderMarkers();
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

watch(
  () => [props.locations, props.types, props.viewMode, props.visitedOpacity],
  () => renderMarkers(),
  { deep: true }
);

function getTypeColor(typeId: string): string {
  const t = props.types.find((ty) => ty.id === typeId);
  return t?.color || '#9E9E9E';
}

function isVisited(loc: Location): boolean {
  return loc.visitedYears.length > 0 || loc.visitedUnknownYear;
}

function renderMarkers() {
  if (!markerLayer || !map) return;
  markerLayer.clearLayers();

  const validLocations = props.locations.filter(
    (loc) => loc.latitude !== 0 || loc.longitude !== 0
  );

  for (const loc of validLocations) {
    const color = getTypeColor(loc.type);
    const visited = isVisited(loc);

    let opacity = 1;
    let fillOpacity = 0.85;
    if (props.viewMode === 'transparency' && visited) {
      opacity = props.visitedOpacity / 100;
      fillOpacity = (props.visitedOpacity / 100) * 0.85;
    }

    const marker = L.circleMarker([loc.latitude, loc.longitude], {
      radius: 8,
      fillColor: color,
      color: '#fff',
      weight: 2,
      opacity,
      fillOpacity,
    });

    const typeName =
      props.types.find((t) => t.id === loc.type)?.name || loc.type;
    const yearsStr = loc.visitedYears.length
      ? loc.visitedYears.join(', ')
      : loc.visitedUnknownYear
        ? '?'
        : '-';

    const linkHtml = loc.link
      ? `<a href="${escapeHtml(loc.link)}" target="_blank" rel="noopener noreferrer">🔗 Website</a>`
      : '';

    const addYearId = `add-year-${loc.id}`;
    const addYearInputId = `year-input-${loc.id}`;

    const popupContent = `<div class="marker-popup">
        <strong>${escapeHtml(loc.name)}</strong><br/>
        <span style="color:${color}">●</span> ${escapeHtml(typeName)}<br/>
        📍 ${escapeHtml(loc.city)}${loc.country ? ', ' + escapeHtml(loc.country) : ''}<br/>
        📅 ${yearsStr}<br/>
        ${linkHtml}
        <div style="margin-top:6px;border-top:1px solid #eee;padding-top:6px;display:flex;gap:4px;align-items:center">
          <input id="${addYearInputId}" type="number" value="${currentYear}" min="1900" max="${currentYear}"
            style="width:65px;padding:2px 4px;border:1px solid #ccc;border-radius:4px;font-size:0.8rem"/>
          <button id="${addYearId}"
            style="padding:2px 8px;font-size:0.78rem;border:1px solid var(--color-primary,#4f46e5);border-radius:4px;background:var(--color-primary,#4f46e5);color:#fff;cursor:pointer">
            + 📅
          </button>
        </div>
      </div>`;

    const popup = L.popup().setContent(popupContent);
    marker.bindPopup(popup);

    marker.on('popupopen', () => {
      const btn = document.getElementById(addYearId);
      const input = document.getElementById(addYearInputId) as HTMLInputElement | null;
      if (btn && input) {
        btn.addEventListener('click', () => {
          const year = parseInt(input.value, 10);
          if (year && year >= 1900 && year <= currentYear) {
            emit('addYear', loc.id, year);
            marker.closePopup();
          }
        });
      }
    });

    marker.on('click', () => emit('markerClick', loc));
    marker.addTo(markerLayer!);
  }

  // Fit bounds if we have locations
  if (validLocations.length > 0) {
    const bounds = L.latLngBounds(
      validLocations.map((l) => [l.latitude, l.longitude])
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
  }
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
  min-height: 400px;
  border-radius: 10px;
  overflow: hidden;
}
</style>
