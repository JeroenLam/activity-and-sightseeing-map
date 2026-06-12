<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import * as mdiIcons from '@mdi/js';
import type { LocationFeature } from '@/types';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const props = withDefaults(defineProps<{
  features: LocationFeature[];
  markerSize: number;
  visitedOpacity: number;
  unvisitedOpacity: number;
  initialLat?: number;
  initialLng?: number;
  initialZoom?: number;
}>(), {
  initialLat: 52.1,
  initialLng: 5.3,
  initialZoom: 7,
});

const emit = defineEmits<{
  'bounds-change': [visible: LocationFeature[]];
  edit: [feature: LocationFeature];
  'add-year': [feature: LocationFeature];
}>();

const mapEl = ref<HTMLDivElement>();
let map: L.Map | null = null;
let markersLayer: L.LayerGroup | null = null;

function isVisited(f: LocationFeature): boolean {
  return (f.properties.years_visited ?? []).length > 0 || f.properties.visited_unknown_year;
}

function getIconPath(icon: string | undefined): string {
  if (!icon) return '';
  const camel = 'mdi' + icon.split('-').map((s: string) => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  return (mdiIcons as Record<string, string>)[camel] ?? '';
}

function createMarkerIcon(f: LocationFeature): L.DivIcon {
  const color = f.properties.type?.color || '#9E9E9E';
  const visited = isVisited(f);
  const size = props.markerSize;
  const opacity = visited ? props.visitedOpacity : props.unvisitedOpacity;
  const iconPath = getIconPath(f.properties.type?.icon);
  const iconSvg = iconPath
    ? `<svg viewBox="0 0 24 24" style="width:60%;height:60%;"><path d="${iconPath}" fill="#fff"/></svg>`
    : '';
  const borderRadius = visited ? '2px' : '50%';

  return L.divIcon({
    className: '',
    html: `<div style="width:${size}px;height:${size}px;background:${color};opacity:${opacity};border-radius:${borderRadius};border:2px solid #fff;box-shadow:0 1px 3px rgba(0,0,0,0.3);box-sizing:border-box;display:flex;align-items:center;justify-content:center;">${iconSvg}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}

function buildPopup(f: LocationFeature): string {
  const p = f.properties;
  const visited = isVisited(f);
  const yearsStr = p.visited_unknown_year
    ? t('map.unknownYear')
    : (p.years_visited ?? []).join(', ');
  const statusLabel = visited ? t('map.visited') : t('map.notVisited');
  const ratingStr = p.rating ? '★'.repeat(p.rating) + '☆'.repeat(5 - p.rating) : '';

  let html = `<div class="popup-content">`;
  html += `<strong>${p.name}</strong>`;
  if (p.city || p.country) html += `<br><small>${[p.city, p.country].filter(Boolean).join(', ')}</small>`;
  if (p.type) html += `<br><span style="color:${p.type.color};font-size:0.8rem;">● ${p.type.name}</span>`;
  html += `<br><span class="popup-status ${visited ? 'visited' : 'unvisited'}">${statusLabel}</span>`;
  if (yearsStr) html += ` <small>(${yearsStr})</small>`;
  if (ratingStr) html += `<br><span style="color:#f5a623">${ratingStr}</span>`;
  if (p.comments) html += `<br><em style="font-size:0.8rem;color:#666">${p.comments}</em>`;
  if (p.link) html += `<br><a href="${p.link}" target="_blank" rel="noopener">${t('map.openLink')}</a>`;
  html += `<div class="popup-actions">`;
  html += `<button class="popup-btn popup-edit" data-id="${f.id}">✏️ ${t('manage.edit')}</button>`;
  if (!visited) {
    html += `<button class="popup-btn popup-add-year" data-id="${f.id}">📅 ${new Date().getFullYear()}</button>`;
  }
  html += `</div></div>`;
  return html;
}

function renderMarkers() {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();

  for (const f of props.features) {
    const [lng, lat] = f.geometry.coordinates;
    if (lat === 0 && lng === 0) continue;

    const marker = L.marker([lat, lng], { icon: createMarkerIcon(f) });
    marker.bindPopup(buildPopup(f), { maxWidth: 280 });
    marker.on('popupopen', () => {
      const popup = marker.getPopup();
      if (!popup) return;
      const el = popup.getElement();
      if (!el) return;
      el.querySelector('.popup-edit')?.addEventListener('click', () => {
        emit('edit', f);
        marker.closePopup();
      });
      el.querySelector('.popup-add-year')?.addEventListener('click', () => {
        emit('add-year', f);
        marker.closePopup();
      });
    });
    markersLayer.addLayer(marker);
  }

  emitVisibleLocations();
}

function emitVisibleLocations() {
  if (!map) return;
  const bounds = map.getBounds();
  const visible = props.features.filter((f) => {
    const [lng, lat] = f.geometry.coordinates;
    return bounds.contains([lat, lng]);
  });
  emit('bounds-change', visible);
}

function panTo(f: LocationFeature) {
  if (!map) return;
  const [lng, lat] = f.geometry.coordinates;
  map.setView([lat, lng], 14);
}

defineExpose({ panTo });

onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, { zoomControl: false }).setView([props.initialLat, props.initialLng], props.initialZoom);
  L.control.zoom({ position: 'topright' }).addTo(map);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap',
    maxZoom: 19,
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  map.on('moveend', emitVisibleLocations);
  map.on('zoomend', emitVisibleLocations);

  renderMarkers();
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

let initialViewApplied = false;

watch(
  () => [props.initialLat, props.initialLng, props.initialZoom],
  ([lat, lng, zoom]) => {
    if (!map || initialViewApplied) return;
    if (lat !== 52.1 || lng !== 5.3 || zoom !== 7) {
      map.setView([lat as number, lng as number], zoom as number);
      initialViewApplied = true;
    }
  }
);

watch(
  () => [props.features, props.markerSize, props.visitedOpacity, props.unvisitedOpacity],
  () => renderMarkers(),
  { deep: true }
);
</script>

<style scoped>
.map-container {
  width: 100%;
  height: 100%;
}
</style>

<style>
.popup-content {
  font-size: 0.85rem;
  line-height: 1.5;
}

.popup-status.visited {
  color: #22c55e;
  font-weight: 500;
}

.popup-status.unvisited {
  color: #94a3b8;
}

.popup-actions {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.5rem;
}

.popup-btn {
  padding: 0.2rem 0.5rem;
  font-size: 0.75rem;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  background: #f8fafc;
  cursor: pointer;
}

.popup-btn:hover {
  background: #e2e8f0;
}
</style>
