import { describe, it, expect } from 'vitest';
import { escapeXml, featuresToKml, featuresToGpx } from '@/lib/locationExport';
import type { LocationFeature } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeFeature(overrides: Partial<LocationFeature['properties']> = {}, coords: [number, number] = [5.0, 52.0]): LocationFeature {
    return {
        type: 'Feature',
        id: 'test-id',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
            name: 'Test Location',
            type: null,
            city: 'Amsterdam',
            country: 'NL',
            address: null,
            link: null,
            years_visited: [2023],
            visited_unknown_year: false,
            rating: null,
            comments: null,
            tags: [],
            created_at: null,
            updated_at: null,
            ...overrides,
        },
    };
}

// ---------------------------------------------------------------------------
// escapeXml
// ---------------------------------------------------------------------------

describe('escapeXml', () => {
    it('escapes all special XML characters', () => {
        expect(escapeXml('a & b')).toBe('a &amp; b');
        expect(escapeXml('<tag>')).toBe('&lt;tag&gt;');
        expect(escapeXml('"quoted"')).toBe('&quot;quoted&quot;');
        expect(escapeXml("it's")).toBe('it&apos;s');
    });

    it('leaves plain strings unchanged', () => {
        expect(escapeXml('Hello World')).toBe('Hello World');
    });
});

// ---------------------------------------------------------------------------
// KML
// ---------------------------------------------------------------------------

describe('featuresToKml', () => {
    it('produces valid KML XML declaration and root element', () => {
        const kml = featuresToKml([]);
        expect(kml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(kml).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">');
        expect(kml).toContain('<Document>');
        expect(kml).toContain('</Document>');
        expect(kml).toContain('</kml>');
    });

    it('emits no Placemark for empty feature list', () => {
        const kml = featuresToKml([]);
        expect(kml).not.toContain('<Placemark>');
    });

    it('includes name and coordinates for a feature', () => {
        const kml = featuresToKml([makeFeature()]);
        expect(kml).toContain('Test Location');
        // KML coordinates order: lon,lat,0
        expect(kml).toContain('5,52,0');
    });

    it('includes city, country, visited years and rating in description', () => {
        const kml = featuresToKml([makeFeature({ rating: 4 })]);
        expect(kml).toContain('Amsterdam');
        expect(kml).toContain('NL');
        expect(kml).toContain('2023');
        expect(kml).toContain('4/5');
    });

    it('includes type name when present', () => {
        const feature = makeFeature({ type: { id: 't1', name: 'Museum', color: '#fff', icon: 'museum' } });
        const kml = featuresToKml([feature]);
        expect(kml).toContain('Museum');
    });

    it('escapes special characters in names and descriptions', () => {
        const feature = makeFeature({ name: 'Café & Bistro <Nice>', comments: 'rating: 5/5 "great"' });
        const kml = featuresToKml([feature]);
        expect(kml).toContain('Caf\u00e9 &amp; Bistro &lt;Nice&gt;');
        expect(kml).toContain('&quot;great&quot;');
    });

    it('produces one Placemark per feature', () => {
        const kml = featuresToKml([makeFeature(), makeFeature({ name: 'Second' })]);
        const count = (kml.match(/<Placemark>/g) || []).length;
        expect(count).toBe(2);
    });

    it('shows "visited unknown year" when flag is set and no years', () => {
        const kml = featuresToKml([makeFeature({ years_visited: [], visited_unknown_year: true })]);
        expect(kml).toContain('year unknown');
    });
});

// ---------------------------------------------------------------------------
// GPX
// ---------------------------------------------------------------------------

describe('featuresToGpx', () => {
    it('produces valid GPX XML declaration and root element', () => {
        const gpx = featuresToGpx([]);
        expect(gpx).toContain('<?xml version="1.0" encoding="UTF-8"?>');
        expect(gpx).toContain('<gpx version="1.1"');
        expect(gpx).toContain('http://www.topografix.com/GPX/1/1');
        expect(gpx).toContain('</gpx>');
    });

    it('emits no wpt for empty feature list', () => {
        const gpx = featuresToGpx([]);
        expect(gpx).not.toContain('<wpt');
    });

    it('includes lat/lon attributes and name for a feature', () => {
        const gpx = featuresToGpx([makeFeature()]);
        expect(gpx).toContain('lat="52" lon="5"');
        expect(gpx).toContain('<name>Test Location</name>');
    });

    it('includes city, country, years and rating in desc', () => {
        const gpx = featuresToGpx([makeFeature({ rating: 3 })]);
        expect(gpx).toContain('Amsterdam');
        expect(gpx).toContain('NL');
        expect(gpx).toContain('2023');
        expect(gpx).toContain('3/5');
    });

    it('includes cmt element for comments', () => {
        const gpx = featuresToGpx([makeFeature({ comments: 'Nice place' })]);
        expect(gpx).toContain('<cmt>Nice place</cmt>');
    });

    it('includes link element when link is present', () => {
        const gpx = featuresToGpx([makeFeature({ link: 'https://example.com' })]);
        expect(gpx).toContain('href="https://example.com"');
    });

    it('includes type element when type is set', () => {
        const gpx = featuresToGpx([makeFeature({ type: { id: 't1', name: 'Park', color: '#0f0', icon: 'park' } })]);
        expect(gpx).toContain('<type>Park</type>');
    });

    it('escapes special characters in names and descriptions', () => {
        const feature = makeFeature({ name: 'River & Bridge', comments: '<note>' });
        const gpx = featuresToGpx([feature]);
        expect(gpx).toContain('River &amp; Bridge');
        expect(gpx).toContain('&lt;note&gt;');
    });

    it('produces one wpt per feature', () => {
        const gpx = featuresToGpx([makeFeature(), makeFeature({ name: 'Second' })]);
        const count = (gpx.match(/<wpt /g) || []).length;
        expect(count).toBe(2);
    });
});
