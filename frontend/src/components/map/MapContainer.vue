<template>
  <div ref="mapEl" class="map-container"></div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from 'vue';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import type { LocationFeature } from '@/types';
import { getIconPath, iconPathsVersion } from '@/composables/useIconPath';
import { useI18n } from 'vue-i18n';
import { useThemeStore } from '@/stores/theme';
import { useSettingsStore } from '@/stores/settings';
import { getMapTileDefinition } from '@/lib/mapTiles';

const { t } = useI18n();
const themeStore = useThemeStore();
const settingsStore = useSettingsStore();

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
let tileLayer: L.TileLayer | null = null;
let resizeObserver: ResizeObserver | null = null;
const tileDefinition = computed(() => getMapTileDefinition(settingsStore.settings.map_tile_set, themeStore.dark));

function invalidateMapSize() {
  if (!map) return;
  map.invalidateSize({ pan: false, animate: false });
}

function isVisited(f: LocationFeature): boolean {
  return (f.properties.years_visited ?? []).length > 0 || f.properties.visited_unknown_year;
}

/**
 * Everything that affects a marker's appearance, as a string. Markers with
 * the same key share one `L.DivIcon`, and a marker only gets a new icon when
 * its key changes.
 */
function markerIconKey(f: LocationFeature): string {
  const visited = isVisited(f);
  return [
    f.properties.type?.color || '#9E9E9E',
    visited ? 'v' : 'u',
    props.markerSize,
    visited ? props.visitedOpacity : props.unvisitedOpacity,
    f.properties.type?.icon ?? '',
    // Include the resolved path so markers update once icons have loaded.
    getIconPath(f.properties.type?.icon),
  ].join('|');
}

/** Cache of marker icons by {@link markerIconKey}; typically one per type x visited state. */
const iconCache = new Map<string, L.DivIcon>();

function getMarkerIcon(f: LocationFeature, key: string): L.DivIcon {
  let icon = iconCache.get(key);
  if (!icon) {
    icon = createMarkerIcon(f);
    iconCache.set(key, icon);
  }
  return icon;
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

/** A marker on the map together with the feature it currently shows. */
interface MarkerEntry {
  marker: L.Marker;
  feature: LocationFeature;
  iconKey: string;
}

/** Markers currently on the map, keyed by feature id (see {@link featureKey}). */
const markerEntries = new Map<string, MarkerEntry>();

function featureKey(f: LocationFeature, index: number): string {
  return f.id ?? `index:${index}`;
}

function createMarkerEntry(f: LocationFeature, lat: number, lng: number, iconKey: string): MarkerEntry {
  const marker = L.marker([lat, lng], { icon: getMarkerIcon(f, iconKey) });
  const entry: MarkerEntry = { marker, feature: f, iconKey };

  // Popup HTML is built lazily when it opens (Leaflet calls the function),
  // always from the entry's *current* feature, instead of eagerly for every
  // marker on every render.
  marker.bindPopup(() => buildPopup(entry.feature), { maxWidth: 280 });
  marker.on('popupopen', () => {
    const el = marker.getPopup()?.getElement();
    if (!el) return;
    el.querySelector('.popup-edit')?.addEventListener('click', () => {
      emit('edit', entry.feature);
      marker.closePopup();
    });
    el.querySelector('.popup-add-year')?.addEventListener('click', () => {
      emit('add-year', entry.feature);
      marker.closePopup();
    });
  });
  return entry;
}

/**
 * Bring the markers on the map in line with `props.features`.
 *
 * This reconciles instead of rebuilding: markers are reused by feature id,
 * only features that appeared or disappeared add or remove a marker, and an
 * existing marker only gets a new position or icon when those changed.
 * Toggling a type filter on a map with thousands of locations therefore
 * touches just the affected markers instead of recreating all of them.
 */
function renderMarkers() {
  if (!map || !markersLayer) return;

  const seen = new Set<string>();
  props.features.forEach((f, index) => {
    const [lng, lat] = f.geometry.coordinates;
    if (lat === 0 && lng === 0) return;

    const key = featureKey(f, index);
    seen.add(key);
    const iconKey = markerIconKey(f);
    const entry = markerEntries.get(key);

    if (!entry) {
      const created = createMarkerEntry(f, lat, lng, iconKey);
      markerEntries.set(key, created);
      markersLayer!.addLayer(created.marker);
      return;
    }

    if (entry.feature !== f) {
      const position = entry.marker.getLatLng();
      if (position.lat !== lat || position.lng !== lng) entry.marker.setLatLng([lat, lng]);
      entry.feature = f;
    }
    if (entry.iconKey !== iconKey) {
      entry.marker.setIcon(getMarkerIcon(f, iconKey));
      entry.iconKey = iconKey;
    }
  });

  for (const [key, entry] of markerEntries) {
    if (!seen.has(key)) {
      markersLayer.removeLayer(entry.marker);
      markerEntries.delete(key);
    }
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

function syncTileLayer() {
  if (!map) return;
  if (tileLayer) {
    map.removeLayer(tileLayer);
  }
  tileLayer = L.tileLayer(tileDefinition.value.url, tileDefinition.value.options).addTo(map);
}

defineExpose({ panTo });

onMounted(() => {
  if (!mapEl.value) return;
  map = L.map(mapEl.value, { zoomControl: false }).setView([props.initialLat, props.initialLng], props.initialZoom);
  L.control.zoom({ position: 'topright' }).addTo(map);
  syncTileLayer();
  markersLayer = L.layerGroup().addTo(map);

  // 'moveend' also fires after every zoom, so a separate 'zoomend' listener
  // would only recompute the visible locations twice.
  map.on('moveend', emitVisibleLocations);

  renderMarkers();

  // Keep Leaflet dimensions in sync when layout mode or breakpoints change.
  window.addEventListener('resize', invalidateMapSize);
  resizeObserver = new ResizeObserver(() => invalidateMapSize());
  resizeObserver.observe(mapEl.value);
  requestAnimationFrame(() => invalidateMapSize());
});

onUnmounted(() => {
  window.removeEventListener('resize', invalidateMapSize);
  resizeObserver?.disconnect();
  resizeObserver = null;
  map?.remove();
  map = null;
  markersLayer = null;
  markerEntries.clear();
  iconCache.clear();
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

// Shallow on purpose: both callers replace the features array (a new
// computed result or a reassigned ref) whenever any feature changes, so a
// `deep` watcher only added a traversal of every feature's properties on
// each change.
watch(() => props.features, () => renderMarkers());

watch(
  () => [props.markerSize, props.visitedOpacity, props.unvisitedOpacity],
  () => {
    // Every icon depends on these; drop cached icons so the cache stays small.
    iconCache.clear();
    renderMarkers();
  },
);

// Icon paths load lazily (see useIconPath); refresh markers when they arrive.
watch(iconPathsVersion, () => renderMarkers());

watch(
  () => tileDefinition.value.id,
  () => syncTileLayer(),
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
