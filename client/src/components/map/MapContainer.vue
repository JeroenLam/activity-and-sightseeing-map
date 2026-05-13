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
  viewMode: 'all' | 'visited' | 'unvisited';
  visitedOpacity: number;
  unvisitedOpacity: number;
  markerSize: number;
  darkMode: boolean;
}>();

const emit = defineEmits<{
  markerClick: [location: Location];
  addYear: [locationId: string, year: number];
  visibleLocationsChanged: [locations: Location[]];
}>();

const mapEl = ref<HTMLDivElement>();
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let tileLayer: L.TileLayer | null = null;
let hasFittedInitial = false;

const currentYear = new Date().getFullYear();

const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function lightenColor(hex: string, amount: number): string {
  const h = hex.replace('#', '');
  const r = Math.min(255, parseInt(h.substring(0, 2), 16) + amount);
  const g = Math.min(255, parseInt(h.substring(2, 4), 16) + amount);
  const b = Math.min(255, parseInt(h.substring(4, 6), 16) + amount);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function emitVisibleLocations() {
  if (!map) return;
  const bounds = map.getBounds();
  const visible = props.locations.filter(
    (loc) =>
      (loc.latitude !== 0 || loc.longitude !== 0) &&
      bounds.contains([loc.latitude, loc.longitude])
  );
  emit('visibleLocationsChanged', visible);
}

onMounted(() => {
  if (!mapEl.value) return;

  map = L.map(mapEl.value).setView([52.1, 5.3], 7);
  tileLayer = L.tileLayer(props.darkMode ? DARK_TILES : LIGHT_TILES, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  map.on('moveend', emitVisibleLocations);
  map.on('zoomend', emitVisibleLocations);

  renderMarkers();
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

watch(
  () => [props.locations, props.types, props.viewMode, props.visitedOpacity, props.unvisitedOpacity, props.markerSize, props.darkMode],
  () => renderMarkers(),
  { deep: true }
);

watch(
  () => props.darkMode,
  (dark) => {
    if (!map || !tileLayer) return;
    map.removeLayer(tileLayer);
    tileLayer = L.tileLayer(dark ? DARK_TILES : LIGHT_TILES, {
      attribution: TILE_ATTR,
      maxZoom: 19,
    }).addTo(map);
  }
);

function getTypeColor(typeId: string): string {
  const t = props.types.find((ty) => ty.id === typeId);
  const base = t?.color || '#9E9E9E';
  return props.darkMode ? lightenColor(base, 60) : base;
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

  // Render visited (squares) first, then unvisited (circles) so circles appear on top
  const sorted = [...validLocations].sort((a, b) => {
    const aVisited = isVisited(a) ? 1 : 0;
    const bVisited = isVisited(b) ? 1 : 0;
    return aVisited - bVisited;
  });

  for (const loc of sorted) {
    const color = getTypeColor(loc.type);
    const visited = isVisited(loc);

    let opacity = 1;
    let fillOpacity = 0.85;
    if (props.viewMode === 'all') {
      const pct = visited
        ? props.visitedOpacity / 100
        : props.unvisitedOpacity / 100;
      opacity = pct;
      fillOpacity = pct * 0.85;
    }

    let marker: L.CircleMarker | L.Marker;
    const borderColor = props.darkMode ? '#334155' : '#fff';
    if (visited) {
      const size = props.markerSize * 2;
      const icon = L.divIcon({
        className: '',
        html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid ${borderColor};opacity:${fillOpacity};box-sizing:border-box;"></div>`,
        iconSize: [size, size],
        iconAnchor: [size / 2, size / 2],
        popupAnchor: [0, -size / 2],
      });
      marker = L.marker([loc.latitude, loc.longitude], { icon, opacity });
    } else {
      marker = L.circleMarker([loc.latitude, loc.longitude], {
        radius: props.markerSize,
        fillColor: color,
        color: borderColor,
        weight: 2,
        opacity,
        fillOpacity,
      });
    }

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

  // Fit bounds only on initial load
  if (!hasFittedInitial && validLocations.length > 0) {
    const bounds = L.latLngBounds(
      validLocations.map((l) => [l.latitude, l.longitude])
    );
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    hasFittedInitial = true;
  }

  // Update visible locations list after markers change
  emitVisibleLocations();
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
