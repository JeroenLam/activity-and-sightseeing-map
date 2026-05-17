export interface User {
    id: string;
    email: string;
    passwordHash: string | null;
    oauthProviders: OAuthLink[];
    displayName: string;
    preferredLanguage: 'nl' | 'en';
    createdAt: string;
}

export interface OAuthLink {
    provider: 'google' | 'github';
    providerId: string;
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

export interface UserPublic {
    id: string;
    email: string;
    displayName: string;
    preferredLanguage: 'nl' | 'en';
    oauthProviders: { provider: string }[];
}

export const DEFAULT_TYPES: Omit<LocationType, 'id'>[] = [
    { name: 'Dierentuin', color: '#4CAF50', icon: 'paw' },
    { name: 'Museum', color: '#2196F3', icon: 'museum' },
    { name: 'Museum - Historie', color: '#795548', icon: 'history' },
    { name: 'Museum - Kunst', color: '#9C27B0', icon: 'palette' },
    { name: 'Museum - Oorlog', color: '#F44336', icon: 'shield' },
    { name: 'Museum - Wetenschap', color: '#FF9800', icon: 'science' },
    { name: 'Pretpark', color: '#E91E63', icon: 'park' },
];
