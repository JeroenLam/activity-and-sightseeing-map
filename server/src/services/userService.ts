import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuid } from 'uuid';
import { readJSONArray, writeJSON } from '../utils/fileStore';
import { User, UserPublic } from '../types';

const SALT_ROUNDS = 12;

function usersFile(dataDir: string): string {
    return path.join(dataDir, 'users.json');
}

export function toPublic(user: User): UserPublic {
    return {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        preferredLanguage: user.preferredLanguage,
        oauthProviders: user.oauthProviders.map((p) => ({ provider: p.provider })),
    };
}

export async function getAllUsers(dataDir: string): Promise<User[]> {
    return readJSONArray<User>(usersFile(dataDir));
}

async function saveUsers(dataDir: string, users: User[]): Promise<void> {
    await writeJSON(usersFile(dataDir), users);
}

export async function findByEmail(
    dataDir: string,
    email: string
): Promise<User | undefined> {
    const users = await getAllUsers(dataDir);
    return users.find((u) => u.email.toLowerCase() === email.toLowerCase());
}

export async function findById(
    dataDir: string,
    id: string
): Promise<User | undefined> {
    const users = await getAllUsers(dataDir);
    return users.find((u) => u.id === id);
}

export async function findByOAuth(
    dataDir: string,
    provider: string,
    providerId: string
): Promise<User | undefined> {
    const users = await getAllUsers(dataDir);
    return users.find((u) =>
        u.oauthProviders.some(
            (p) => p.provider === provider && p.providerId === providerId
        )
    );
}

export async function createLocalUser(
    dataDir: string,
    email: string,
    password: string,
    displayName: string
): Promise<User> {
    const users = await getAllUsers(dataDir);
    if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
        throw new Error('Email already registered');
    }
    const user: User = {
        id: uuid(),
        email: email.toLowerCase(),
        passwordHash: await bcrypt.hash(password, SALT_ROUNDS),
        oauthProviders: [],
        displayName,
        preferredLanguage: 'nl',
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    await saveUsers(dataDir, users);
    return user;
}

export async function createOAuthUser(
    dataDir: string,
    provider: 'google' | 'github',
    providerId: string,
    email: string,
    displayName: string
): Promise<User> {
    const users = await getAllUsers(dataDir);
    // Check if email already exists — link the OAuth provider
    const existing = users.find(
        (u) => u.email.toLowerCase() === email.toLowerCase()
    );
    if (existing) {
        if (
            !existing.oauthProviders.some(
                (p) => p.provider === provider && p.providerId === providerId
            )
        ) {
            existing.oauthProviders.push({ provider, providerId });
            await saveUsers(dataDir, users);
        }
        return existing;
    }

    const user: User = {
        id: uuid(),
        email: email.toLowerCase(),
        passwordHash: null,
        oauthProviders: [{ provider, providerId }],
        displayName,
        preferredLanguage: 'nl',
        createdAt: new Date().toISOString(),
    };
    users.push(user);
    await saveUsers(dataDir, users);
    return user;
}

export async function verifyPassword(
    user: User,
    password: string
): Promise<boolean> {
    if (!user.passwordHash) return false;
    return bcrypt.compare(password, user.passwordHash);
}

export async function updatePreferredLanguage(
    dataDir: string,
    userId: string,
    language: 'nl' | 'en'
): Promise<void> {
    const users = await getAllUsers(dataDir);
    const user = users.find((u) => u.id === userId);
    if (user) {
        user.preferredLanguage = language;
        await saveUsers(dataDir, users);
    }
}
