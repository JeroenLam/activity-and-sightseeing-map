<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import type { LocationFeature, LocationType } from '@/types';

const props = defineProps<{
  locations: LocationFeature[];
  types: LocationType[];
  visitedOpacity: number;
  unvisitedOpacity: number;
  markerSize: number;
  darkMode: boolean;
  defaultLat: number | null;
  defaultLng: number | null;
  defaultZoom: number | null;
}>();

const emit = defineEmits<{
  markerClick: [feature: LocationFeature];
  mapClick: [latlng: { lat: number; lng: number }];
}>();

const mapEl = ref<HTMLDivElement>();
let map: L.Map | null = null;
let markerLayer: L.LayerGroup | null = null;
let tileLayer: L.TileLayer | null = null;

const LIGHT_TILES = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DARK_TILES = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

onMounted(() => {
  if (!mapEl.value) return;

  const initialLat = props.defaultLat ?? 52.1;
  const initialLng = props.defaultLng ?? 5.3;
  const initialZoom = props.defaultZoom ?? 7;

  map = L.map(mapEl.value).setView([initialLat, initialLng], initialZoom);
  tileLayer = L.tileLayer(props.darkMode ? DARK_TILES : LIGHT_TILES, {
    attribution: TILE_ATTR,
    maxZoom: 19,
  }).addTo(map);

  markerLayer = L.layerGroup().addTo(map);

  map.on('click', (e: L.LeafletMouseEvent) => {
    emit('mapClick', { lat: e.latlng.lat, lng: e.latlng.lng });
  });

  renderMarkers();

  // Fit bounds if no default view is set and there are locations
  if (!props.defaultLat && props.locations.length) {
    fitBounds();
  }
});

onUnmounted(() => {
  map?.remove();
  map = null;
});

watch(
  () => [props.locations, props.types, props.visitedOpacity, props.unvisitedOpacity, props.markerSize, props.darkMode],
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

function fitBounds() {
  if (!map || !props.locations.length) return;
  const bounds = L.latLngBounds(
    props.locations
      .filter((f) => f.geometry.coordinates[0] !== 0 || f.geometry.coordinates[1] !== 0)
      .map((f) => [f.geometry.coordinates[1], f.geometry.coordinates[0]] as [number, number])
  );
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

function isVisited(feature: LocationFeature): boolean {
  return feature.properties.years_visited.length > 0 || feature.properties.visited_unknown_year;
}

function getTypeColor(typeObj: LocationFeature['properties']['type']): string {
  return typeObj?.color || '#9E9E9E';
}

function renderMarkers() {
  if (!markerLayer || !map) return;
  markerLayer.clearLayers();

  for (const feature of props.locations) {
    const [lon, lat] = feature.geometry.coordinates;
    if (lat === 0 && lon === 0) continue;

    const color = getTypeColor(feature.properties.type);
    const visited = isVisited(feature);
    const opacity = visited
      ? props.visitedOpacity / 100
      : props.unvisitedOpacity / 100;

    const size = props.markerSize * 2;
    const borderRadius = visited ? '0' : '50%';
    const borderColor = props.darkMode ? '#334155' : '#fff';

    const icon = L.divIcon({
      className: '',
      html: `<div style="width:${size}px;height:${size}px;background:${color};border:2px solid ${borderColor};opacity:${opacity};box-sizing:border-box;border-radius:${borderRadius};"></div>`,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      popupAnchor: [0, -size / 2],
    });

    const marker = L.marker([lat, lon], { icon });

    const popupContent = `
      <strong>${feature.properties.name}</strong><br/>
      ${feature.properties.type?.name || ''}<br/>
      ${feature.properties.city}${feature.properties.country ? ', ' + feature.properties.country : ''}<br/>
      ${feature.properties.years_visited.length ? 'Visited: ' + feature.properties.years_visited.join(', ') : ''}
      ${feature.properties.rating ? '<br/>★'.repeat(feature.properties.rating) : ''}
      ${feature.properties.link ? `<br/><a href="${feature.properties.link}" target="_blank">Website</a>` : ''}
    `;
    marker.bindPopup(popupContent);

    marker.on('click', () => emit('markerClick', feature));
    marker.addTo(markerLayer);
  }
}

defineExpose({ fitBounds });
</script>

<style scoped>
.map-container {
  width: 100%;
  height: calc(100vh - 60px);
}
</style>
