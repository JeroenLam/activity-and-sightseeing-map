import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import * as typeService from '../services/typeService';

export function createTypesRouter(dataDir: string): Router {
    const router = Router();
    router.use(authMiddleware);

    router.get('/', async (req: Request, res: Response) => {
        const types = await typeService.getTypes(dataDir, (req as any).userId);
        res.json(types);
    });

    router.post('/', async (req: Request, res: Response) => {
        const { name, color, icon } = req.body;
        if (!name || !color) {
            res.status(400).json({ error: 'name and color are required' });
            return;
        }
        const type = await typeService.createType(dataDir, (req as any).userId, {
            name,
            color,
            icon,
        });
        res.status(201).json(type);
    });

    router.put('/:id', async (req: Request, res: Response) => {
        const { name, color, icon } = req.body;
        const type = await typeService.updateType(
            dataDir,
            (req as any).userId,
            req.params.id,
            { name, color, icon }
        );
        if (!type) {
            res.status(404).json({ error: 'Type not found' });
            return;
        }
        res.json(type);
    });

    router.delete('/:id', async (req: Request, res: Response) => {
        const ok = await typeService.deleteType(
            dataDir,
            (req as any).userId,
            req.params.id
        );
        if (!ok) {
            res.status(404).json({ error: 'Type not found' });
            return;
        }
        res.json({ ok: true });
    });

    return router;
}
