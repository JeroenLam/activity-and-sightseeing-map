import type { LocationFeature } from '@/types';

/**
 * Escape a string for safe embedding in XML text content or attribute values.
 */
export function escapeXml(value: string): string {
    return value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

/**
 * Build a human-readable description from location properties.
 * Returns an array of lines.
 */
function buildDescriptionLines(feature: LocationFeature): string[] {
    const p = feature.properties;
    const lines: string[] = [];
    if (p.city) lines.push(`City: ${p.city}`);
    if (p.country) lines.push(`Country: ${p.country}`);
    if (p.type) lines.push(`Type: ${p.type.name}`);
    if (p.years_visited?.length) lines.push(`Visited: ${p.years_visited.join(', ')}`);
    else if (p.visited_unknown_year) lines.push('Visited: (year unknown)');
    if (p.rating != null) lines.push(`Rating: ${p.rating}/5`);
    if (p.comments) lines.push(`Notes: ${p.comments}`);
    if (p.link) lines.push(`Link: ${p.link}`);
    return lines;
}

// ---------------------------------------------------------------------------
// KML
// ---------------------------------------------------------------------------

function featureToKmlPlacemark(feature: LocationFeature): string {
    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const descLines = buildDescriptionLines(feature);

    const descTag = descLines.length
        ? `\n      <description>${escapeXml(descLines.join('\n'))}</description>`
        : '';

    return (
        `  <Placemark>\n` +
        `    <name>${escapeXml(p.name)}</name>${descTag}\n` +
        `    <Point><coordinates>${lon},${lat},0</coordinates></Point>\n` +
        `  </Placemark>`
    );
}

/**
 * Convert an array of LocationFeatures to a KML XML string.
 */
export function featuresToKml(features: LocationFeature[]): string {
    const placemarks = features.map(featureToKmlPlacemark).join('\n');
    return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<kml xmlns="http://www.opengis.net/kml/2.2">\n` +
        `  <Document>\n` +
        `    <name>Locations</name>\n` +
        (placemarks ? placemarks + '\n' : '') +
        `  </Document>\n` +
        `</kml>`
    );
}

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

function featureToGpxWaypoint(feature: LocationFeature): string {
    const p = feature.properties;
    const [lon, lat] = feature.geometry.coordinates;
    const descLines = buildDescriptionLines(feature);

    const descTag = descLines.length
        ? `\n    <desc>${escapeXml(descLines.join('\n'))}</desc>`
        : '';
    const cmtTag = p.comments ? `\n    <cmt>${escapeXml(p.comments)}</cmt>` : '';
    const linkTag = p.link
        ? `\n    <link href="${escapeXml(p.link)}"><text>${escapeXml(p.name)}</text></link>`
        : '';
    const typeTag = p.type ? `\n    <type>${escapeXml(p.type.name)}</type>` : '';

    return (
        `  <wpt lat="${lat}" lon="${lon}">\n` +
        `    <name>${escapeXml(p.name)}</name>${descTag}${cmtTag}${linkTag}${typeTag}\n` +
        `  </wpt>`
    );
}

/**
 * Convert an array of LocationFeatures to a GPX XML string.
 */
export function featuresToGpx(features: LocationFeature[]): string {
    const waypoints = features.map(featureToGpxWaypoint).join('\n');
    return (
        `<?xml version="1.0" encoding="UTF-8"?>\n` +
        `<gpx version="1.1" creator="Activiteiten"\n` +
        `  xmlns="http://www.topografix.com/GPX/1/1"\n` +
        `  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"\n` +
        `  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
        (waypoints ? waypoints + '\n' : '') +
        `</gpx>`
    );
}
