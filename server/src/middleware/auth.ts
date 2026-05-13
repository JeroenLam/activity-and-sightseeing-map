import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = () => process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRY = () => process.env.JWT_EXPIRY || '7d';

export interface JwtPayload {
    userId: string;
}

export function generateToken(userId: string): string {
    const secret: jwt.Secret = JWT_SECRET();
    const options: jwt.SignOptions = { expiresIn: JWT_EXPIRY() as any };
    return jwt.sign({ userId } as JwtPayload, secret, options);
}

export function setTokenCookie(res: Response, token: string): void {
    res.cookie('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        path: '/',
    });
}

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    const token = req.cookies?.token;
    if (!token) {
        res.status(401).json({ error: 'Not authenticated' });
        return;
    }

    try {
        const payload = jwt.verify(token, JWT_SECRET()) as JwtPayload;
        (req as any).userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ error: 'Invalid or expired token' });
    }
}
