import type { Statistics } from '@/types';

export interface AchievementProgress {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    trackingKey: string;
    current: number;
    levels: number[];
    currentLevel: number;
    progressToNextLevel: number;
    levelDescriptorKey?: string;
}

function getLevelColors(): string[] {
    return ['#64748b', '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981'];
}

function clampProgress(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function getCurrentLevelAndProgress(current: number, levels: number[]): { level: number; progress: number } {
    const achievedLevels = levels.filter((threshold) => current >= threshold).length;

    if (achievedLevels >= levels.length) {
        return { level: achievedLevels, progress: 1 };
    }

    const nextLevelThreshold = levels[achievedLevels];
    const progressToNext = clampProgress(nextLevelThreshold === 0 ? 1 : current / nextLevelThreshold);

    return { level: achievedLevels, progress: progressToNext };
}

function getVisitedCountriesCount(statistics: Statistics): number {
    return statistics.visited_locations_per_country.length;
}

function getCountriesWithAtLeastVisitedLocations(statistics: Statistics, minVisitedLocationsPerCountry: number): number {
    return statistics.visited_locations_per_country.filter((item) => item.count >= minVisitedLocationsPerCountry).length;
}

function getMaxVisitsInYear(statistics: Statistics): number {
    return statistics.visits_per_year.reduce((max, item) => Math.max(max, item.count), 0);
}

function getVisitedYearsCount(statistics: Statistics): number {
    return statistics.visits_per_year.length;
}

function getMaxCountriesVisitedInYear(statistics: Statistics): number {
    const perYear = new Map<number, Set<string>>();

    for (const item of statistics.visited_locations_per_year_by_country) {
        if (!perYear.has(item.year)) {
            perYear.set(item.year, new Set());
        }
        perYear.get(item.year)?.add(item.country);
    }

    return Math.max(0, ...Array.from(perYear.values(), (countries) => countries.size));
}

function getMaxTypesVisitedInYear(statistics: Statistics): number {
    const perYear = new Map<number, Set<string>>();

    for (const item of statistics.visited_locations_per_year_by_type) {
        if (!perYear.has(item.year)) {
            perYear.set(item.year, new Set());
        }

        perYear.get(item.year)?.add(item.type_id ?? item.type_name);
    }

    return Math.max(0, ...Array.from(perYear.values(), (types) => types.size));
}

function buildMultiLevelAchievement(input: {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    trackingKey: string;
    current: number;
    levels: number[];
    levelDescriptorKey?: string;
}): AchievementProgress {
    const { level, progress } = getCurrentLevelAndProgress(input.current, input.levels);

    return {
        ...input,
        currentLevel: level,
        progressToNextLevel: progress,
    };
}

export function buildAchievements(statistics: Statistics): AchievementProgress[] {
    const visitedCountriesCount = getVisitedCountriesCount(statistics);
    const countriesWithAtLeast10VisitedLocations = getCountriesWithAtLeastVisitedLocations(statistics, 10);
    const countriesWithAtLeast50VisitedLocations = getCountriesWithAtLeastVisitedLocations(statistics, 50);
    const countriesWithAtLeast100VisitedLocations = getCountriesWithAtLeastVisitedLocations(statistics, 100);
    const maxVisitsInYear = getMaxVisitsInYear(statistics);
    const visitedYearsCount = getVisitedYearsCount(statistics);
    const maxCountriesVisitedInYear = getMaxCountriesVisitedInYear(statistics);
    const maxTypesVisitedInYear = getMaxTypesVisitedInYear(statistics);

    return [
        // Log locations: 1/10/100/1000/10000
        buildMultiLevelAchievement({
            id: 'location-logger',
            icon: '📍',
            titleKey: 'stats.achievements.locationLogger.title',
            descriptionKey: 'stats.achievements.locationLogger.description',
            trackingKey: 'stats.badgeTracksAdded',
            current: statistics.total_locations,
            levels: [1, 10, 100, 1000, 10000],
        }),

        // Visit locations: 1/10/100/1000/10000
        buildMultiLevelAchievement({
            id: 'location-visitor',
            icon: '🌐',
            titleKey: 'stats.achievements.locationVisitor.title',
            descriptionKey: 'stats.achievements.locationVisitor.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_visited,
            levels: [1, 10, 100, 1000, 10000],
        }),

        // Visit different countries: 2/4/8/16/24/32
        buildMultiLevelAchievement({
            id: 'country-explorer',
            icon: '🏳️',
            titleKey: 'stats.achievements.countryExplorer.title',
            descriptionKey: 'stats.achievements.countryExplorer.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: visitedCountriesCount,
            levels: [2, 4, 8, 16, 24, 32],
        }),

        // Visit 10 location in 2/4/8 different countries
        buildMultiLevelAchievement({
            id: 'global-collector-10',
            icon: '🎯',
            titleKey: 'stats.achievements.globalCollector10.title',
            descriptionKey: 'stats.achievements.globalCollector10.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: countriesWithAtLeast10VisitedLocations,
            levels: [2, 4, 8],
        }),

        // Visit 50 location in 2/4/8 different countries
        buildMultiLevelAchievement({
            id: 'global-collector-50',
            icon: '🎯',
            titleKey: 'stats.achievements.globalCollector50.title',
            descriptionKey: 'stats.achievements.globalCollector50.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: countriesWithAtLeast50VisitedLocations,
            levels: [2, 4, 8],
        }),

        // Visit 100 location in 2/4/8 different countries
        buildMultiLevelAchievement({
            id: 'global-collector-100',
            icon: '🎯',
            titleKey: 'stats.achievements.globalCollector100.title',
            descriptionKey: 'stats.achievements.globalCollector100.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: countriesWithAtLeast100VisitedLocations,
            levels: [2, 4, 8],
        }),

        // Visit 5/25/50/100 locations in a single year
        buildMultiLevelAchievement({
            id: 'annual-adventurer',
            icon: '📅',
            titleKey: 'stats.achievements.annualAdventurer.title',
            descriptionKey: 'stats.achievements.annualAdventurer.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: maxVisitsInYear,
            levels: [5, 25, 50, 100],
        }),

        // Visit locations in 2/4/6/8/10 different years
        buildMultiLevelAchievement({
            id: 'year-round-explorer',
            icon: '🗓️',
            titleKey: 'stats.achievements.yearRoundExplorer.title',
            descriptionKey: 'stats.achievements.yearRoundExplorer.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: visitedYearsCount,
            levels: [2, 4, 6, 8, 10],
        }),

        // Visit 2/4/6/8/10 countries in a single year
        buildMultiLevelAchievement({
            id: 'country-hopper',
            icon: '✈️',
            titleKey: 'stats.achievements.countryHopper.title',
            descriptionKey: 'stats.achievements.countryHopper.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: maxCountriesVisitedInYear,
            levels: [2, 4, 6, 8, 10],
        }),

        // Visit 2/4/8/16 different location types in a single year
        buildMultiLevelAchievement({
            id: 'type-trailblazer',
            icon: '🧩',
            titleKey: 'stats.achievements.typeTrailblazer.title',
            descriptionKey: 'stats.achievements.typeTrailblazer.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: maxTypesVisitedInYear,
            levels: [2, 4, 8, 16],
        }),

        // Unique visited cities
        buildMultiLevelAchievement({
            id: 'city-scout',
            icon: '🏙️',
            titleKey: 'stats.achievements.cityScout.title',
            descriptionKey: 'stats.achievements.cityScout.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_cities,
            levels: [2, 10, 50, 200, 1000],
        }),

        // Number of ratings provided on visited locations
        buildMultiLevelAchievement({
            id: 'rating-critic',
            icon: '⭐',
            titleKey: 'stats.achievements.ratingCritic.title',
            descriptionKey: 'stats.achievements.ratingCritic.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_ratings_provided,
            levels: [1, 10, 50, 250, 1000],
        }),

        // Number of comments provided on visited locations
        buildMultiLevelAchievement({
            id: 'storyteller',
            icon: '💬',
            titleKey: 'stats.achievements.storyteller.title',
            descriptionKey: 'stats.achievements.storyteller.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_comments_provided,
            levels: [1, 10, 50, 250, 1000],
        }),

        // Locations visited in multiple years
        buildMultiLevelAchievement({
            id: 'time-traveler',
            icon: '⏳',
            titleKey: 'stats.achievements.timeTraveler.title',
            descriptionKey: 'stats.achievements.timeTraveler.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_locations_visited_multiple_years,
            levels: [1, 5, 25, 100, 500],
        }),

        // Unique continents visited
        buildMultiLevelAchievement({
            id: 'continental-explorer',
            icon: '🌍',
            titleKey: 'stats.achievements.continentalExplorer.title',
            descriptionKey: 'stats.achievements.continentalExplorer.description',
            trackingKey: 'stats.badgeTracksVisited',
            current: statistics.total_visited_continents,
            levels: [2, 3, 5, 7],
        }),
    ];
}
