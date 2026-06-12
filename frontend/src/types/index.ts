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
}

export interface PointGeometry {
    type: 'Point';
    coordinates: [number, number]; // [longitude, latitude]
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
    created_at: string | null;
    updated_at: string | null;
}

export interface LocationFeature {
    type: 'Feature';
    id: string | null;
    geometry: PointGeometry;
    properties: LocationProperties;
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
}

export interface LocationUpdateFeature {
    type: 'Feature';
    geometry?: PointGeometry | null;
    properties: LocationUpdateProperties;
}

export interface UserSettings {
    preferred_language: string;
    default_map_lat: number | null;
    default_map_lng: number | null;
    default_map_zoom: number | null;
    profile_public: boolean;
    location_filter: string;
    show_ratings: boolean;
    show_comments: boolean;
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

export interface YearStat {
    year: number;
    count: number;
}

export interface TypeStat {
    type_id: string | null;
    type_name: string;
    color: string;
    count: number;
}

export interface CountryStat {
    country: string;
    count: number;
}

export interface Statistics {
    total_locations: number;
    total_visited: number;
    total_unvisited: number;
    total_countries: number;
    visits_per_year: YearStat[];
    locations_per_type: TypeStat[];
    locations_per_country: CountryStat[];
}
