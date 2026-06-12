import { describe, expect, it } from 'vitest';
import { buildAchievements } from '@/lib/achievements';
import type { Statistics } from '@/types';

describe('buildAchievements', () => {
    it('computes correct levels from statistics', () => {
        const statistics: Statistics = {
            total_locations: 12,
            total_visited: 10,
            total_unvisited: 2,
            total_countries: 3,
            visits_per_year: [{ year: 2022, count: 1 }, { year: 2023, count: 9 }],
            locations_per_type: [],
            visited_locations_per_type: [],
            locations_per_country: [],
            visited_locations_per_country: [
                { country: 'NL', count: 3 },
                { country: 'BE', count: 4 },
                { country: 'DE', count: 3 },
            ],
            visited_locations_per_year_by_country: [],
            visited_locations_per_year_by_type: [],
        };

        const achievements = buildAchievements(statistics);

        // Log locations badge should reach level 2 (thresholds 1 and 10 achieved)
        const locationLogger = achievements.find((item) => item.id === 'location-logger');
        expect(locationLogger?.currentLevel).toBe(2);
        expect(locationLogger?.levels).toEqual([1, 10, 100, 1000, 10000]);

        // Visit different countries badge should reach level 1 (3 countries >= 2, but < 4)
        const countryExplorer = achievements.find((item) => item.id === 'country-explorer');
        expect(countryExplorer?.currentLevel).toBe(1);
        expect(countryExplorer?.levels).toEqual([2, 4, 8, 16, 24, 32]);
    });

    it('calculates progress to next level correctly', () => {
        const statistics: Statistics = {
            total_locations: 55,
            total_visited: 10,
            total_unvisited: 45,
            total_countries: 1,
            visits_per_year: [{ year: 2024, count: 35 }],
            locations_per_type: [],
            visited_locations_per_type: [],
            locations_per_country: [],
            visited_locations_per_country: [{ country: 'NL', count: 10 }],
            visited_locations_per_year_by_country: [],
            visited_locations_per_year_by_type: [],
        };

        const achievements = buildAchievements(statistics);

        // Annual adventurer: 35 visits in a year. Levels are [5, 25, 50, 100]
        // At 35: achieved level count is 2 (5 and 25), next threshold is 50, progress = 35/50 = 0.7
        const annualAdventurer = achievements.find((item) => item.id === 'annual-adventurer');
        expect(annualAdventurer?.currentLevel).toBe(2);
        expect(annualAdventurer?.progressToNextLevel).toBeCloseTo(0.7, 1);
    });

    it('returns all badge types in the correct order', () => {
        const statistics: Statistics = {
            total_locations: 0,
            total_visited: 0,
            total_unvisited: 0,
            total_countries: 0,
            visits_per_year: [],
            locations_per_type: [],
            visited_locations_per_type: [],
            locations_per_country: [],
            visited_locations_per_country: [],
            visited_locations_per_year_by_country: [],
            visited_locations_per_year_by_type: [],
        };

        const achievements = buildAchievements(statistics);

        expect(achievements.length).toBe(10);
        expect(achievements.map((a) => a.id)).toEqual([
            'location-logger',
            'location-visitor',
            'country-explorer',
            'global-collector-10',
            'global-collector-50',
            'global-collector-100',
            'annual-adventurer',
            'year-round-explorer',
            'country-hopper',
            'type-trailblazer',
        ]);
    });

    it('computes global collector progress from countries with at least X visited locations each', () => {
        const statistics: Statistics = {
            total_locations: 400,
            total_visited: 300,
            total_unvisited: 100,
            total_countries: 5,
            visits_per_year: [],
            locations_per_type: [],
            visited_locations_per_type: [],
            locations_per_country: [],
            visited_locations_per_country: [
                { country: 'NL', count: 120 },
                { country: 'BE', count: 70 },
                { country: 'DE', count: 50 },
                { country: 'FR', count: 12 },
                { country: 'ES', count: 9 },
            ],
            visited_locations_per_year_by_country: [],
            visited_locations_per_year_by_type: [],
        };

        const achievements = buildAchievements(statistics);

        const collector10 = achievements.find((item) => item.id === 'global-collector-10');
        const collector50 = achievements.find((item) => item.id === 'global-collector-50');
        const collector100 = achievements.find((item) => item.id === 'global-collector-100');

        // Countries with >=10 visited locations: NL, BE, DE, FR => 4
        expect(collector10?.current).toBe(4);

        // Countries with >=50 visited locations: NL, BE, DE => 3
        expect(collector50?.current).toBe(3);

        // Countries with >=100 visited locations: NL => 1
        expect(collector100?.current).toBe(1);
    });
});

