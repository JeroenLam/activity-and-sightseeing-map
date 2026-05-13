import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as locationService from '../services/locationService';
import * as typeService from '../services/typeService';
import {
    parseCsvBuffer,
    mapCsvRow,
    detectColumnMap,
} from '../utils/csvParser';
import https from 'https';
import http from 'http';

export function createLocationsRouter(dataDir: string): Router {
    const router = Router();
    router.use(authMiddleware);

    // List all
    router.get('/', async (req: Request, res: Response) => {
        const locations = await locationService.getLocations(
            dataDir,
            (req as any).userId
        );
        res.json(locations);
    });

    // Create
    router.post('/', async (req: Request, res: Response) => {
        const {
            name,
            type,
            city,
            country,
            link,
            latitude,
            longitude,
            visitedYears,
            visitedUnknownYear,
        } = req.body;
        if (!name || !type || latitude == null || longitude == null) {
            res
                .status(400)
                .json({ error: 'name, type, latitude, and longitude are required' });
            return;
        }
        const location = await locationService.createLocation(
            dataDir,
            (req as any).userId,
            {
                name,
                type,
                city: city || '',
                country: country || '',
                link: link || null,
                latitude: Number(latitude),
                longitude: Number(longitude),
                visitedYears: visitedYears || [],
                visitedUnknownYear: visitedUnknownYear || false,
            }
        );
        res.status(201).json(location);
    });

    // Update
    router.put('/:id', async (req: Request, res: Response) => {
        const location = await locationService.updateLocation(
            dataDir,
            (req as any).userId,
            req.params.id,
            req.body
        );
        if (!location) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }
        res.json(location);
    });

    // Delete
    router.delete('/:id', async (req: Request, res: Response) => {
        const ok = await locationService.deleteLocation(
            dataDir,
            (req as any).userId,
            req.params.id
        );
        if (!ok) {
            res.status(404).json({ error: 'Location not found' });
            return;
        }
        res.json({ ok: true });
    });

    // Retry geocoding for a single location
    router.post('/:id/geocode', async (req: Request, res: Response) => {
        try {
            const locations = await locationService.getLocations(
                dataDir,
                (req as any).userId
            );
            const location = locations.find((l) => l.id === req.params.id);
            if (!location) {
                res.status(404).json({ error: 'Location not found' });
                return;
            }

            const query = `${location.name}, ${location.city}, ${location.country}`;
            const coords = await geocode(query);

            const updated = await locationService.updateLocation(
                dataDir,
                (req as any).userId,
                req.params.id,
                { latitude: coords.lat, longitude: coords.lng }
            );
            res.json(updated);
        } catch (err: any) {
            res.status(422).json({ error: `Geocoding failed: ${err.message}` });
        }
    });

    // CSV Import (streams NDJSON progress events)
    router.post('/import', async (req: Request, res: Response) => {
        try {
            const { csv, columnMap: userColumnMap } = req.body;
            if (!csv) {
                res.status(400).json({ error: 'csv content is required' });
                return;
            }

            const rows = parseCsvBuffer(csv);
            if (rows.length === 0) {
                res.status(400).json({ error: 'No data rows found in CSV' });
                return;
            }

            const headers = Object.keys(rows[0]);
            const columnMap = userColumnMap || detectColumnMap(headers);

            // Stream NDJSON
            res.setHeader('Content-Type', 'application/x-ndjson');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('X-Accel-Buffering', 'no');
            res.flushHeaders();

            const sendEvent = (obj: Record<string, unknown>) => {
                res.write(JSON.stringify(obj) + '\n');
            };

            // Get or create types
            const types = await typeService.getTypes(dataDir, (req as any).userId);
            const typeMap = new Map(types.map((t) => [t.name.toLowerCase(), t.id]));

            const results: {
                imported: number;
                skipped: number;
                errors: string[];
            } = { imported: 0, skipped: 0, errors: [] };

            const locationsToCreate: any[] = [];
            const total = rows.length;

            for (let i = 0; i < rows.length; i++) {
                try {
                    const parsed = mapCsvRow(rows[i], columnMap);
                    if (!parsed.name) {
                        results.errors.push(`Row ${i + 1}: missing name`);
                        results.skipped++;
                        sendEvent({ type: 'progress', current: i + 1, total, name: `Row ${i + 1}`, status: 'skip' });
                        continue;
                    }

                    // Resolve type
                    let typeId = typeMap.get(parsed.type.toLowerCase());
                    if (!typeId) {
                        const newType = await typeService.createType(
                            dataDir,
                            (req as any).userId,
                            { name: parsed.type, color: '#9E9E9E' }
                        );
                        typeId = newType.id;
                        typeMap.set(parsed.type.toLowerCase(), typeId);
                    }

                    // Geocode
                    let lat = 0,
                        lng = 0;
                    let rowStatus = 'ok';
                    try {
                        const coords = await geocode(
                            `${parsed.name}, ${parsed.city}, ${parsed.country}`
                        );
                        lat = coords.lat;
                        lng = coords.lng;
                        // Rate limit: 1 request per second
                        await sleep(1100);
                    } catch {
                        results.errors.push(
                            `Row ${i + 1} (${parsed.name}): geocoding failed`
                        );
                        rowStatus = 'error';
                    }

                    locationsToCreate.push({
                        name: parsed.name,
                        type: typeId,
                        city: parsed.city,
                        country: parsed.country,
                        link: parsed.link || null,
                        latitude: lat,
                        longitude: lng,
                        visitedYears: parsed.visitedYears,
                        visitedUnknownYear: parsed.visitedUnknownYear,
                    });
                    results.imported++;
                    sendEvent({ type: 'progress', current: i + 1, total, name: parsed.name, status: rowStatus });
                } catch (err: any) {
                    results.errors.push(`Row ${i + 1}: ${err.message}`);
                    results.skipped++;
                    sendEvent({ type: 'progress', current: i + 1, total, name: `Row ${i + 1}`, status: 'error' });
                }
            }

            if (locationsToCreate.length > 0) {
                await locationService.bulkCreateLocations(
                    dataDir,
                    (req as any).userId,
                    locationsToCreate
                );
            }

            sendEvent({ type: 'result', ...results });
            res.end();
        } catch (err: any) {
            // If headers already sent, end stream with error event
            if (res.headersSent) {
                res.write(JSON.stringify({ type: 'error', error: err.message }) + '\n');
                res.end();
            } else {
                res.status(500).json({ error: err.message });
            }
        }
    });

    // CSV preview (returns headers + first rows)
    router.post('/import/preview', (req: Request, res: Response) => {
        try {
            const { csv } = req.body;
            if (!csv) {
                res.status(400).json({ error: 'csv content is required' });
                return;
            }
            const rows = parseCsvBuffer(csv);
            const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
            const columnMap = detectColumnMap(headers);
            res.json({
                headers,
                columnMap,
                preview: rows.slice(0, 5),
                totalRows: rows.length,
            });
        } catch (err: any) {
            res.status(400).json({ error: `Failed to parse CSV: ${err.message}` });
        }
    });

    return router;
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

function geocode(query: string): Promise<{ lat: number; lng: number }> {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(query)}`;
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client
            .get(
                url,
                {
                    headers: {
                        'User-Agent': 'ActiviteitenMap/1.0',
                        Accept: 'application/json',
                    },
                },
                (resp) => {
                    let data = '';
                    resp.on('data', (chunk) => (data += chunk));
                    resp.on('end', () => {
                        try {
                            const results = JSON.parse(data);
                            if (results.length === 0)
                                return reject(new Error('No results found'));
                            resolve({
                                lat: parseFloat(results[0].lat),
                                lng: parseFloat(results[0].lon),
                            });
                        } catch (err) {
                            reject(err);
                        }
                    });
                }
            )
            .on('error', reject);
    });
}
