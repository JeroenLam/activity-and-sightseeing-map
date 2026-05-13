import { Router, Request, Response } from 'express';
import passport from 'passport';
import * as userService from '../services/userService';
import {
    generateToken,
    setTokenCookie,
    authMiddleware,
} from '../middleware/auth';

export function createAuthRouter(dataDir: string): Router {
    const router = Router();

    // Register
    router.post('/register', async (req: Request, res: Response) => {
        try {
            const { email, password, displayName } = req.body;
            if (!email || !password || !displayName) {
                res
                    .status(400)
                    .json({ error: 'email, password, and displayName are required' });
                return;
            }
            if (password.length < 8) {
                res
                    .status(400)
                    .json({ error: 'Password must be at least 8 characters' });
                return;
            }
            const user = await userService.createLocalUser(
                dataDir,
                email,
                password,
                displayName
            );
            const token = generateToken(user.id);
            setTokenCookie(res, token);
            res.status(201).json(userService.toPublic(user));
        } catch (err: any) {
            if (err.message === 'Email already registered') {
                res.status(409).json({ error: err.message });
                return;
            }
            res.status(500).json({ error: 'Internal server error' });
        }
    });

    // Login
    router.post('/login', (req: Request, res: Response, next) => {
        passport.authenticate(
            'local',
            { session: false },
            (err: any, user: any, info: any) => {
                if (err) return next(err);
                if (!user) {
                    res
                        .status(401)
                        .json({ error: info?.message || 'Invalid credentials' });
                    return;
                }
                const token = generateToken(user.id);
                setTokenCookie(res, token);
                res.json(userService.toPublic(user));
            }
        )(req, res, next);
    });

    // Logout
    router.post('/logout', (_req: Request, res: Response) => {
        res.clearCookie('token', { path: '/' });
        res.json({ ok: true });
    });

    // Current user
    router.get('/me', authMiddleware, async (req: Request, res: Response) => {
        const user = await userService.findById(dataDir, (req as any).userId);
        if (!user) {
            res.status(401).json({ error: 'User not found' });
            return;
        }
        res.json(userService.toPublic(user));
    });

    // Update language preference
    router.put(
        '/me/language',
        authMiddleware,
        async (req: Request, res: Response) => {
            const { language } = req.body;
            if (language !== 'nl' && language !== 'en') {
                res.status(400).json({ error: 'Language must be "nl" or "en"' });
                return;
            }
            await userService.updatePreferredLanguage(
                dataDir,
                (req as any).userId,
                language
            );
            res.json({ ok: true });
        }
    );

    // Change password
    router.put(
        '/me/password',
        authMiddleware,
        async (req: Request, res: Response) => {
            const { currentPassword, newPassword } = req.body;
            if (!currentPassword || !newPassword) {
                res.status(400).json({ error: 'currentPassword and newPassword are required' });
                return;
            }
            if (newPassword.length < 8) {
                res.status(400).json({ error: 'Password must be at least 8 characters' });
                return;
            }
            try {
                await userService.changePassword(
                    dataDir,
                    (req as any).userId,
                    currentPassword,
                    newPassword
                );
                res.json({ ok: true });
            } catch (err: any) {
                if (err.message === 'Current password is incorrect') {
                    res.status(403).json({ error: err.message });
                    return;
                }
                if (err.message === 'No password set') {
                    res.status(400).json({ error: err.message });
                    return;
                }
                res.status(500).json({ error: 'Internal server error' });
            }
        }
    );

    // OAuth config (tells frontend which providers are available)
    router.get('/oauth-config', (_req: Request, res: Response) => {
        res.json({
            google: !!(
                process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
            ),
            github: !!(
                process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET
            ),
        });
    });

    // Google OAuth
    if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
        router.get(
            '/google',
            passport.authenticate('google', { scope: ['profile', 'email'], session: false })
        );
        router.get(
            '/google/callback',
            passport.authenticate('google', {
                session: false,
                failureRedirect: '/login',
            }),
            (req: Request, res: Response) => {
                const user = req.user as any;
                const token = generateToken(user.id);
                setTokenCookie(res, token);
                res.redirect('/');
            }
        );
    }

    // GitHub OAuth
    if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
        router.get(
            '/github',
            passport.authenticate('github', { scope: ['user:email'], session: false })
        );
        router.get(
            '/github/callback',
            passport.authenticate('github', {
                session: false,
                failureRedirect: '/login',
            }),
            (req: Request, res: Response) => {
                const user = req.user as any;
                const token = generateToken(user.id);
                setTokenCookie(res, token);
                res.redirect('/');
            }
        );
    }

    return router;
}
