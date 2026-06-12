import { describe, expect, it } from 'vitest';
import { findNearbyLocations, getDistanceMeters } from '@/utils/locationProximity';
import type { LocationFeature } from '@/types';

function createFeature(id: string, name: string, longitude: number, latitude: number): LocationFeature {
    return {
        type: 'Feature',
        id,
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
        properties: {
            name,
            type: null,
            city: '',
            country: '',
            address: null,
            link: null,
            years_visited: [],
            visited_unknown_year: false,
            rating: null,
            comments: null,
            tags: [],
            created_at: null,
            updated_at: null,
        },
    };
}

describe('locationProximity', () => {
    it('returns zero distance for the same point', () => {
        expect(getDistanceMeters(52.37, 4.89, 52.37, 4.89)).toBe(0);
    });

    it('finds nearby locations within threshold and sorts by distance', () => {
        const features = [
            createFeature('1', 'Closest', 4.9001, 52.3701),
            createFeature('2', 'Farther', 4.901, 52.371),
            createFeature('3', 'Too Far', 4.91, 52.38),
        ];

        const matches = findNearbyLocations({
            latitude: 52.37,
            longitude: 4.89,
            features,
            thresholdMeters: 1500,
        });

        expect(matches).toHaveLength(2);
        expect(matches[0].feature.properties.name).toBe('Closest');
        expect(matches[1].feature.properties.name).toBe('Farther');
    });

    it('excludes locations outside the threshold', () => {
        const features = [createFeature('1', 'Far Away', 5.0, 53.0)];

        const matches = findNearbyLocations({
            latitude: 52.37,
            longitude: 4.89,
            features,
            thresholdMeters: 500,
        });

        expect(matches).toEqual([]);
    });
});
