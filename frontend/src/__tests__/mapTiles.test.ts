import { describe, expect, it } from 'vitest';
import { getMapTileDefinition, MAP_TILE_OPTIONS, resolveMapTileSet } from '@/lib/mapTiles';

describe('mapTiles', () => {
    it('resolves auto to openstreetmap in light mode', () => {
        expect(resolveMapTileSet('auto', false)).toBe('openstreetmap');
    });

    it('resolves auto to carto-dark in dark mode', () => {
        expect(resolveMapTileSet('auto', true)).toBe('carto-dark');
    });

    it('returns the specific requested tile set unchanged', () => {
        expect(resolveMapTileSet('opentopomap', true)).toBe('opentopomap');
    });

    it('returns a usable tile definition with url and attribution', () => {
        const definition = getMapTileDefinition('esri-world-imagery', false);
        expect(definition.url).toContain('arcgisonline');
        expect(definition.options.attribution).toContain('Esri');
    });

    it('exposes auto and alternate tile choices', () => {
        expect(MAP_TILE_OPTIONS.map((option) => option.id)).toEqual([
            'auto',
            'openstreetmap',
            'carto-light',
            'carto-dark',
            'esri-world-imagery',
            'opentopomap',
        ]);
    });
});