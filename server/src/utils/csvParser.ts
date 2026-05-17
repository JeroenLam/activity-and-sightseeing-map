import { parse } from 'csv-parse/sync';

export interface CsvRow {
    [key: string]: string;
}

export interface ParsedCsvLocation {
    name: string;
    type: string;
    city: string;
    country: string;
    link: string;
    visitedYears: number[];
    visitedUnknownYear: boolean;
    latitude: number | null;
    longitude: number | null;
    rating: number | null;
    note: string | null;
}

export function parseCsvBuffer(buffer: Buffer | string): CsvRow[] {
    return parse(typeof buffer === 'string' ? buffer : buffer.toString('utf-8'), {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        bom: true,
    });
}

export function mapCsvRow(
    row: CsvRow,
    columnMap: Record<string, string>
): ParsedCsvLocation {
    const raw = (field: string) => (row[columnMap[field]] ?? '').trim();

    const geweest = raw('visited');
    let visitedYears: number[] = [];
    let visitedUnknownYear = false;

    if (geweest === '-') {
        visitedUnknownYear = true;
    } else if (geweest) {
        visitedYears = geweest
            .split(',')
            .map((y) => parseInt(y.trim(), 10))
            .filter((y) => !isNaN(y));
    }

    const ratingRaw = raw('rating');
    let rating: number | null = null;
    if (ratingRaw) {
        const parsed = parseInt(ratingRaw, 10);
        if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) {
            rating = parsed;
        }
    }

    return {
        name: raw('name'),
        type: raw('type'),
        city: raw('city'),
        country: raw('country'),
        link: raw('link'),
        visitedYears,
        visitedUnknownYear,
        latitude: raw('latitude') ? parseFloat(raw('latitude')) || null : null,
        longitude: raw('longitude') ? parseFloat(raw('longitude')) || null : null,
        rating,
        note: raw('note') || null,
    };
}

export function detectColumnMap(headers: string[]): Record<string, string> {
    const map: Record<string, string> = {};
    const lower = headers.map((h) => h.toLowerCase());

    const patterns: [string, RegExp][] = [
        ['name', /^(naam|name)$/],
        ['type', /^(wat|type|categorie|category)$/],
        ['city', /^(plaats|city|stad)$/],
        ['country', /^(land|country)$/],
        ['link', /^(link|url|website)$/],
        ['visited', /^(geweest|visited|bezocht|jaar|year)$/],
        ['latitude', /^(latitude|lat|breedtegraad)$/],
        ['longitude', /^(longitude|lng|lon|lengtegraad)$/],
        ['rating', /^(rating|beoordeling|score)$/],
        ['note', /^(note|notitie|opmerking|notes)$/],
    ];

    for (const [field, regex] of patterns) {
        const idx = lower.findIndex((h) => regex.test(h));
        if (idx !== -1) {
            map[field] = headers[idx];
        }
    }

    return map;
}
