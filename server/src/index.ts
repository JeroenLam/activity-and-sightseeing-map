import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import passport from 'passport';
import { configurePassport } from './config/passport';
import { createAuthRouter } from './routes/auth';
import { createTypesRouter } from './routes/types';
import { createLocationsRouter } from './routes/locations';
import { ensureDir } from './utils/fileStore';

export async function createApp(dataDir?: string) {
    const DATA_DIR = dataDir || process.env.DATA_DIR || path.join(__dirname, '..', 'data');
    await ensureDir(DATA_DIR);

    const app = express();

    // Security
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'", "'unsafe-inline'"],
                    styleSrc: ["'self'", "'unsafe-inline'", 'https://unpkg.com'],
                    imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://*.openstreetmap.org', 'https://*.basemaps.cartocdn.com'],
                    connectSrc: ["'self'", 'https://nominatim.openstreetmap.org'],
                    fontSrc: ["'self'"],
                },
            },
            // OSM tile servers require a Referer header; default 'no-referrer' blocks it
            referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        })
    );

    app.use(cors({ origin: true, credentials: true }));
    app.use(express.json({ limit: '10mb' }));
    app.use(cookieParser());
    app.use(passport.initialize());

    configurePassport(DATA_DIR);

    // API routes
    app.use('/api/auth', createAuthRouter(DATA_DIR));
    app.use('/api/types', createTypesRouter(DATA_DIR));
    app.use('/api/locations', createLocationsRouter(DATA_DIR));

    // Serve static frontend in production
    const clientDist = path.join(__dirname, '..', '..', 'client', 'dist');
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => {
        res.sendFile(path.join(clientDist, 'index.html'));
    });

    return app;
}

// Start server if run directly
if (require.main === module) {
    const PORT = parseInt(process.env.PORT || '3000', 10);
    createApp().then((app) => {
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    });
}
