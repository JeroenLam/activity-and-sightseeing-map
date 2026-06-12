import type { LocationFeature } from '@/types';

export interface NearbyLocationMatch {
    feature: LocationFeature;
    distanceMeters: number;
}

const EARTH_RADIUS_METERS = 6371000;

function toRadians(value: number): number {
    return (value * Math.PI) / 180;
}

export function getDistanceMeters(
    latitudeA: number,
    longitudeA: number,
    latitudeB: number,
    longitudeB: number,
): number {
    const deltaLat = toRadians(latitudeB - latitudeA);
    const deltaLng = toRadians(longitudeB - longitudeA);
    const latA = toRadians(latitudeA);
    const latB = toRadians(latitudeB);

    const haversine =
        Math.sin(deltaLat / 2) ** 2 +
        Math.cos(latA) * Math.cos(latB) * Math.sin(deltaLng / 2) ** 2;
    const arc = 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
    return EARTH_RADIUS_METERS * arc;
}

export function findNearbyLocations(options: {
    latitude: number;
    longitude: number;
    features: LocationFeature[];
    thresholdMeters: number;
}): NearbyLocationMatch[] {
    const { latitude, longitude, features, thresholdMeters } = options;

    return features
        .map((feature) => {
            const [featureLongitude, featureLatitude] = feature.geometry.coordinates;
            const distanceMeters = getDistanceMeters(
                latitude,
                longitude,
                featureLatitude,
                featureLongitude,
            );
            return { feature, distanceMeters };
        })
        .filter((match) => match.distanceMeters <= thresholdMeters)
        .sort((left, right) => left.distanceMeters - right.distanceMeters);
}
