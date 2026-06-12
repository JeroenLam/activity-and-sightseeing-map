import type { TileLayerOptions } from 'leaflet';
import type { MapTileSet } from '@/types';

export type ResolvedMapTileSet = Exclude<MapTileSet, 'auto'>;

export interface MapTileOption {
    id: MapTileSet;
    label: string;
}

export interface MapTileDefinition {
    id: ResolvedMapTileSet;
    label: string;
    url: string;
    options: TileLayerOptions;
}

export const MAP_TILE_OPTIONS: MapTileOption[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'openstreetmap', label: 'OpenStreetMap' },
    { id: 'carto-light', label: 'Carto Light' },
    { id: 'carto-dark', label: 'Carto Dark' },
    { id: 'esri-world-imagery', label: 'Esri Satellite' },
    { id: 'opentopomap', label: 'OpenTopoMap' },
];

const MAP_TILE_DEFINITIONS: Record<ResolvedMapTileSet, MapTileDefinition> = {
    'openstreetmap': {
        id: 'openstreetmap',
        label: 'OpenStreetMap',
        url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        },
    },
    'carto-light': {
        id: 'carto-light',
        label: 'Carto Light',
        url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 20,
            subdomains: 'abcd',
        },
    },
    'carto-dark': {
        id: 'carto-dark',
        label: 'Carto Dark',
        url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        options: {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            maxZoom: 20,
            subdomains: 'abcd',
        },
    },
    'esri-world-imagery': {
        id: 'esri-world-imagery',
        label: 'Esri Satellite',
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        options: {
            attribution: 'Tiles &copy; Esri',
            maxZoom: 19,
        },
    },
    'opentopomap': {
        id: 'opentopomap',
        label: 'OpenTopoMap',
        url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        options: {
            attribution: 'Map data: &copy; OpenStreetMap contributors, SRTM | Map style: &copy; OpenTopoMap',
            maxZoom: 17,
        },
    },
};

export function resolveMapTileSet(tileSet: MapTileSet, darkMode: boolean): ResolvedMapTileSet {
    if (tileSet === 'auto') {
        return darkMode ? 'carto-dark' : 'openstreetmap';
    }
    return tileSet;
}

export function getMapTileDefinition(tileSet: MapTileSet, darkMode: boolean): MapTileDefinition {
    return MAP_TILE_DEFINITIONS[resolveMapTileSet(tileSet, darkMode)];
}