import type { LocationFeature, LocationUpdateFeature, LocationUpdateProperties } from '@/types';

/**
 * Nullable location properties that an update may clear by sending an
 * explicit `null` (mirrors `NULLABLE_UPDATE_FIELDS` in the backend's
 * `location_service`).
 */
const NULLABLE_FIELDS = ['address', 'link', 'rating', 'comments'] as const;

type NullableField = (typeof NULLABLE_FIELDS)[number];

/**
 * Returns `true` when `field` was explicitly included in the update payload,
 * even if its value is `null`.
 */
function isProvided(props: LocationUpdateProperties, field: NullableField): boolean {
    return Object.prototype.hasOwnProperty.call(props, field);
}

/**
 * Apply a (possibly partial) location update to a locally cached feature.
 *
 * Used for the optimistic update when the backend cannot be reached, so the
 * map reflects the user's edit straight away. The semantics match the
 * backend's `PUT /api/locations/{id}`:
 *
 * - A property that is omitted from `update.properties` keeps its current
 *   value, so partial updates such as the popup's "add current year" button
 *   do not wipe other data.
 * - A required property (name, city, country, years, ...) sent as `null` is
 *   treated as "unchanged".
 * - A nullable property (rating, link, comments, address) sent as `null` is
 *   cleared, so removing a rating with the "×" button takes effect at once.
 *
 * The input feature is not mutated; a new feature object is returned.
 */
export function applyLocationUpdate(current: LocationFeature, update: LocationUpdateFeature): LocationFeature {
    const props = update.properties;
    const nullable = Object.fromEntries(
        NULLABLE_FIELDS.map((field) => [
            field,
            isProvided(props, field) ? (props[field] ?? null) : current.properties[field],
        ]),
    ) as Pick<LocationFeature['properties'], NullableField>;

    return {
        ...current,
        geometry: update.geometry ?? current.geometry,
        properties: {
            ...current.properties,
            name: props.name ?? current.properties.name,
            city: props.city ?? current.properties.city,
            country: props.country ?? current.properties.country,
            years_visited: props.years_visited ?? current.properties.years_visited,
            visited_unknown_year: props.visited_unknown_year ?? current.properties.visited_unknown_year,
            tags: props.tags ?? current.properties.tags,
            ...nullable,
        },
    };
}
