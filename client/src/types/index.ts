export interface User {
    id: string;
    email: string;
    displayName: string;
    preferredLanguage: 'nl' | 'en';
    oauthProviders: { provider: string }[];
}

export interface Location {
    id: string;
    name: string;
    type: string;
    city: string;
    country: string;
    link: string | null;
    latitude: number;
    longitude: number;
    visitedYears: number[];
    visitedUnknownYear: boolean;
    rating: number | null;
    note: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface LocationType {
    id: string;
    name: string;
    color: string;
    icon: string;
}

export interface OAuthConfig {
    google: boolean;
    github: boolean;
}

export interface CsvPreview {
    headers: string[];
    columnMap: Record<string, string>;
    preview: Record<string, string>[];
    totalRows: number;
}

export interface ImportResult {
    imported: number;
    skipped: number;
    errors: string[];
}

export interface ImportProgress {
    current: number;
    total: number;
    name: string;
    status: 'ok' | 'skip' | 'error';
}
