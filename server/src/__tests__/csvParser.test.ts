import {
    parseCsvBuffer,
    mapCsvRow,
    detectColumnMap,
} from '../utils/csvParser';

const SAMPLE_CSV = `Naam,Wat,Plaats,Land,Link,Geweest
Aapenheul,Dierentuin,Apeldoorn,NL,https://apenheul.nl/,2025
AquaZoo,Dierentuin,Leeuwarden,NL,https://www.aquazoo.nl/,2024
Avifauna,Dierentuin,Alphen aan den Rijn,NL,Vogelpark Avifauna,
Storyworld,Museum,Groningen,NL,https://forum.nl/,2026
Universiteitsmuseum,Museum - Wetenschap,Groningen,NL,www.rug.nl/museum/,-
Randers Regnskov,Dierentuin,Randers,DK,regnskoven.dk,"2024,2025"`;

describe('csvParser', () => {
    describe('parseCsvBuffer', () => {
        it('should parse CSV string into rows', () => {
            const rows = parseCsvBuffer(SAMPLE_CSV);
            expect(rows).toHaveLength(6);
            expect(rows[0]).toHaveProperty('Naam', 'Aapenheul');
            expect(rows[0]).toHaveProperty('Wat', 'Dierentuin');
        });
    });

    describe('detectColumnMap', () => {
        it('should detect standard Dutch column names', () => {
            const headers = ['Naam', 'Wat', 'Plaats', 'Land', 'Link', 'Geweest'];
            const map = detectColumnMap(headers);
            expect(map).toEqual({
                name: 'Naam',
                type: 'Wat',
                city: 'Plaats',
                country: 'Land',
                link: 'Link',
                visited: 'Geweest',
            });
        });

        it('should detect English column names', () => {
            const headers = ['Name', 'Type', 'City', 'Country', 'URL', 'Visited'];
            const map = detectColumnMap(headers);
            expect(map.name).toBe('Name');
            expect(map.type).toBe('Type');
            expect(map.city).toBe('City');
            expect(map.country).toBe('Country');
            expect(map.link).toBe('URL');
            expect(map.visited).toBe('Visited');
        });
    });

    describe('mapCsvRow', () => {
        const columnMap = {
            name: 'Naam',
            type: 'Wat',
            city: 'Plaats',
            country: 'Land',
            link: 'Link',
            visited: 'Geweest',
        };

        it('should map a regular row', () => {
            const rows = parseCsvBuffer(SAMPLE_CSV);
            const parsed = mapCsvRow(rows[0], columnMap);
            expect(parsed.name).toBe('Aapenheul');
            expect(parsed.type).toBe('Dierentuin');
            expect(parsed.city).toBe('Apeldoorn');
            expect(parsed.country).toBe('NL');
            expect(parsed.visitedYears).toEqual([2025]);
            expect(parsed.visitedUnknownYear).toBe(false);
        });

        it('should handle empty visited field', () => {
            const rows = parseCsvBuffer(SAMPLE_CSV);
            const parsed = mapCsvRow(rows[2], columnMap); // Avifauna
            expect(parsed.visitedYears).toEqual([]);
            expect(parsed.visitedUnknownYear).toBe(false);
        });

        it('should handle "-" as unknown year', () => {
            const rows = parseCsvBuffer(SAMPLE_CSV);
            const parsed = mapCsvRow(rows[4], columnMap); // Universiteitsmuseum
            expect(parsed.visitedYears).toEqual([]);
            expect(parsed.visitedUnknownYear).toBe(true);
        });

        it('should handle multiple years', () => {
            const rows = parseCsvBuffer(SAMPLE_CSV);
            const parsed = mapCsvRow(rows[5], columnMap); // Randers Regnskov
            expect(parsed.visitedYears).toEqual([2024, 2025]);
            expect(parsed.visitedUnknownYear).toBe(false);
        });
    });
});
