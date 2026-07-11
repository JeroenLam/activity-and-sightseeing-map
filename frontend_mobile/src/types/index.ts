export interface User {
  id: string;
  email: string;
  display_name: string;
  preferred_language: 'nl' | 'en';
  oauth_providers: string[];
}

export interface LocationType {
  id: string;
  name: string;
  color: string;
  icon: string;
  sync_version: number;
  deleted_at?: string | null;
  sync_state?: SyncState;
}

export interface PointGeometry {
  type: 'Point';
  coordinates: [number, number];
}

export interface LocationProperties {
  name: string;
  type: LocationType | null;
  city: string;
  country: string;
  address: string | null;
  link: string | null;
  years_visited: number[];
  visited_unknown_year: boolean;
  rating: number | null;
  comments: string | null;
  tags: string[];
  sync_version: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface LocationFeature {
  type: 'Feature';
  id: string | null;
  geometry: PointGeometry;
  properties: LocationProperties;
}

export type SyncState = 'clean' | 'pending' | 'conflict';

export interface LocalLocationFeature extends LocationFeature {
  sync_state: SyncState;
  pending_mutation_id?: string | null;
}

export interface LocationFeatureCollection {
  type: 'FeatureCollection';
  features: LocationFeature[];
}

export interface LocationCreateProperties {
  name: string;
  type_id?: string | null;
  city?: string;
  country?: string;
  address?: string | null;
  link?: string | null;
  years_visited?: number[];
  visited_unknown_year?: boolean;
  rating?: number | null;
  comments?: string | null;
  tags?: string[];
}

export interface LocationCreateFeature {
  type: 'Feature';
  geometry: PointGeometry;
  properties: LocationCreateProperties;
}

export interface LocationUpdateProperties {
  name?: string | null;
  type_id?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  link?: string | null;
  years_visited?: number[] | null;
  visited_unknown_year?: boolean | null;
  rating?: number | null;
  comments?: string | null;
  tags?: string[] | null;
  base_sync_version?: number | null;
}

export interface LocationUpdateFeature {
  type: 'Feature';
  geometry?: PointGeometry | null;
  properties: LocationUpdateProperties;
}

export interface BulkLocationUpdateProperties {
  type_id?: string | null;
  rating?: number | null;
  year_to_add?: number | null;
}

export interface BulkLocationUpdateRequest {
  location_ids: string[];
  properties: BulkLocationUpdateProperties;
}

export type MapTileSet =
  | 'auto'
  | 'openstreetmap'
  | 'carto-light'
  | 'carto-dark'
  | 'esri-world-imagery'
  | 'opentopomap';

export interface UserSettings {
  preferred_language: string;
  default_map_lat: number | null;
  default_map_lng: number | null;
  default_map_zoom: number | null;
  map_tile_set: MapTileSet;
  profile_public: boolean;
  location_filter: string;
  show_ratings: boolean;
  show_comments: boolean;
  sync_version: number;
}

export interface OAuthConfig {
  google: boolean;
}

export interface GeocodingResult {
  display_name: string;
  lat: number;
  lon: number;
  city: string;
  country_code: string;
}

export interface ReverseGeocodingResult {
  display_name: string;
  city: string;
  country_code: string;
}

export interface CsvPreview {
  headers: string[];
  column_map: Record<string, string>;
  preview: Record<string, string>[];
  total_rows: number;
}

export interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export interface SyncStatus {
  cursor: number;
  entities: string[];
}

export interface SyncChange {
  id: number;
  entity_type: 'location' | 'type' | 'settings';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  entity_version: number;
  changed_fields?: string[] | null;
  payload?: Record<string, unknown> | null;
  created_at: string;
}

export interface SyncMutationRequest {
  mutation_id: string;
  entity_type: 'location' | 'type' | 'settings';
  operation: 'create' | 'update' | 'delete' | 'read';
  entity_id?: string | null;
  base_sync_version?: number | null;
  payload: Record<string, unknown>;
}

export interface SyncMutationResult {
  mutation_id: string;
  status: 'applied' | 'conflict' | 'error';
  entity_type: 'location' | 'type' | 'settings';
  entity_id?: string | null;
  entity_version?: number | null;
  conflict_id?: number | null;
  error?: string | null;
  payload?: Record<string, unknown> | null;
}

export interface SyncConflict {
  id: number;
  entity_type: 'location' | 'type' | 'settings';
  entity_id: string;
  operation: 'create' | 'update' | 'delete';
  base_sync_version?: number | null;
  client_version?: number | null;
  server_version: number;
  client_payload?: Record<string, unknown> | null;
  server_payload?: Record<string, unknown> | null;
  status: 'open' | 'resolved';
  created_at: string;
  resolved_at?: string | null;
  resolution_mode?: 'use_client' | 'use_server' | 'merge' | null;
  resolution_payload?: Record<string, unknown> | null;
}

export interface SyncBootstrapResponse {
  cursor: number;
  locations: { type: 'FeatureCollection'; features: LocationFeature[] };
  types: LocationType[];
  settings: UserSettings;
}

export interface OfflineSnapshot {
  user: User | null;
  locations: LocalLocationFeature[];
  types: LocationType[];
  settings: UserSettings;
  cursor: number;
  queue: SyncMutationRequest[];
  conflicts: SyncConflict[];
  lastSyncedAt: string | null;
}

export interface LocationDraft {
  id?: string;
  name: string;
  type_id: string | null;
  city: string;
  country: string;
  address: string;
  link: string;
  latitude: number;
  longitude: number;
  years_visited: string;
  visited_unknown_year: boolean;
  rating: string;
  comments: string;
  tags: string;
}

export interface TypeDraft {
  id?: string;
  name: string;
  color: string;
  icon: string;
}
