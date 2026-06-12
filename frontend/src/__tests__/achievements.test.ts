import { describe, expect, it } from 'vitest';
import { buildAchievements } from '@/lib/achievements';
import type { LocationFeature, Statistics } from '@/types';

function createFeature(input: {
    id: string;
    country: string;
    visitedYears?: number[];
    visitedUnknownYear?: boolean;
}): LocationFeature {
    return {
        type: 'Feature',
        id: input.id,
        geometry: { type: 'Point', coordinates: [4.9, 52.3] },
        properties: {
            name: input.id,
            type: null,
            city: '',
            country: input.country,
            address: null,
            link: null,
            years_visited: input.visitedYears ?? [],
            visited_unknown_year: input.visitedUnknownYear ?? false,
            rating: null,
            comments: null,
            tags: [],
            created_at: null,
            updated_at: null,
        },
    };
}

describe('buildAchievements', () => {
    it('computes locked and unlocked achievements from statistics and visited countries', () => {
        const statistics: Statistics = {
            total_locations: 12,
            total_visited: 10,
            total_unvisited: 2,
            total_countries: 3,
            visits_per_year: [],
            locations_per_type: [],
            locations_per_country: [],
        };

        const features = [
            createFeature({ id: 'a', country: 'NL', visitedYears: [2022] }),
            createFeature({ id: 'b', country: 'BE', visitedYears: [2023] }),
            createFeature({ id: 'c', country: 'DE', visitedUnknownYear: true }),
        ];

        const achievements = buildAchievements(statistics, features);

        expect(achievements.find((item) => item.id === 'location-collector')?.unlocked).toBe(true);
        expect(achievements.find((item) => item.id === 'globe-trotter')?.unlocked).toBe(false);
        expect(achievements.find((item) => item.id === 'cross-country-explorer')?.unlocked).toBe(true);
    });

    it('uses only visited countries for country-based achievements', () => {
        const statistics: Statistics = {
            total_locations: 5,
            total_visited: 1,
            total_unvisited: 4,
            total_countries: 5,
            visits_per_year: [],
            locations_per_type: [],
            locations_per_country: [],
        };

        const features = [
            createFeature({ id: 'visited', country: 'NL', visitedYears: [2024] }),
            createFeature({ id: 'planned-1', country: 'BE' }),
            createFeature({ id: 'planned-2', country: 'DE' }),
        ];

        const achievements = buildAchievements(statistics, features);
        const borderBreaker = achievements.find((item) => item.id === 'border-breaker');

        expect(borderBreaker?.current).toBe(1);
        expect(borderBreaker?.progress).toBe(0.5);
    });

    it('uses the strictest requirement for dual-goal badge progress', () => {
        const statistics: Statistics = {
            total_locations: 20,
            total_visited: 9,
            total_unvisited: 11,
            total_countries: 2,
            visits_per_year: [],
            locations_per_type: [],
            locations_per_country: [],
        };

        const features = [
            createFeature({ id: 'one', country: 'NL', visitedYears: [2020] }),
            createFeature({ id: 'two', country: 'BE', visitedYears: [2021] }),
        ];

        const achievements = buildAchievements(statistics, features);
        const explorer = achievements.find((item) => item.id === 'cross-country-explorer');

        expect(explorer?.progress).toBe(0.9);
        expect(explorer?.unlocked).toBe(false);
    });
});
