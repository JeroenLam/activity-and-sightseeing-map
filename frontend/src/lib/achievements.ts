import type { LocationFeature, Statistics } from '@/types';

export interface AchievementProgress {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    current: number;
    goal: number;
    progress: number;
    unlocked: boolean;
    secondaryCurrent?: number;
    secondaryGoal?: number;
}

function clampProgress(value: number): number {
    return Math.max(0, Math.min(1, value));
}

function getVisitedLocations(features: LocationFeature[]): LocationFeature[] {
    return features.filter(
        (feature) =>
            (feature.properties.years_visited ?? []).length > 0
            || feature.properties.visited_unknown_year,
    );
}

function getVisitedCountriesCount(features: LocationFeature[]): number {
    return new Set(
        getVisitedLocations(features)
            .map((feature) => feature.properties.country.trim())
            .filter(Boolean),
    ).size;
}

function buildSingleGoalAchievement(input: {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    current: number;
    goal: number;
}): AchievementProgress {
    return {
        ...input,
        progress: clampProgress(input.current / input.goal),
        unlocked: input.current >= input.goal,
    };
}

function buildDualGoalAchievement(input: {
    id: string;
    icon: string;
    titleKey: string;
    descriptionKey: string;
    current: number;
    goal: number;
    secondaryCurrent: number;
    secondaryGoal: number;
}): AchievementProgress {
    const primaryProgress = clampProgress(input.current / input.goal);
    const secondaryProgress = clampProgress(input.secondaryCurrent / input.secondaryGoal);

    return {
        ...input,
        progress: Math.min(primaryProgress, secondaryProgress),
        unlocked: input.current >= input.goal && input.secondaryCurrent >= input.secondaryGoal,
    };
}

export function buildAchievements(statistics: Statistics, features: LocationFeature[]): AchievementProgress[] {
    const visitedCountriesCount = getVisitedCountriesCount(features);

    return [
        buildSingleGoalAchievement({
            id: 'first-pin',
            icon: '📍',
            titleKey: 'stats.achievements.firstPin.title',
            descriptionKey: 'stats.achievements.firstPin.description',
            current: statistics.total_locations,
            goal: 1,
        }),
        buildSingleGoalAchievement({
            id: 'location-collector',
            icon: '🗺️',
            titleKey: 'stats.achievements.locationCollector.title',
            descriptionKey: 'stats.achievements.locationCollector.description',
            current: statistics.total_locations,
            goal: 10,
        }),
        buildSingleGoalAchievement({
            id: 'centurion',
            icon: '🏆',
            titleKey: 'stats.achievements.centurion.title',
            descriptionKey: 'stats.achievements.centurion.description',
            current: statistics.total_locations,
            goal: 100,
        }),
        buildSingleGoalAchievement({
            id: 'border-breaker',
            icon: '🏳️',
            titleKey: 'stats.achievements.borderBreaker.title',
            descriptionKey: 'stats.achievements.borderBreaker.description',
            current: visitedCountriesCount,
            goal: 2,
        }),
        buildSingleGoalAchievement({
            id: 'globe-trotter',
            icon: '🌍',
            titleKey: 'stats.achievements.globeTrotter.title',
            descriptionKey: 'stats.achievements.globeTrotter.description',
            current: visitedCountriesCount,
            goal: 10,
        }),
        buildDualGoalAchievement({
            id: 'cross-country-explorer',
            icon: '🧭',
            titleKey: 'stats.achievements.crossCountryExplorer.title',
            descriptionKey: 'stats.achievements.crossCountryExplorer.description',
            current: statistics.total_visited,
            goal: 10,
            secondaryCurrent: visitedCountriesCount,
            secondaryGoal: 2,
        }),
    ];
}
