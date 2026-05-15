import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import * as userService from '../services/userService';

describe('userService', () => {
    let dataDir: string;

    beforeEach(async () => {
        dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'user-test-'));
    });

    afterEach(async () => {
        await fs.rm(dataDir, { recursive: true, force: true });
    });

    describe('createLocalUser', () => {
        it('should create a user with hashed password', async () => {
            const user = await userService.createLocalUser(
                dataDir, 'test@example.com', 'password123', 'Test User'
            );
            expect(user.id).toBeDefined();
            expect(user.email).toBe('test@example.com');
            expect(user.displayName).toBe('Test User');
            expect(user.passwordHash).not.toBe('password123');
            expect(user.passwordHash).toBeTruthy();
        });

        it('should reject duplicate emails', async () => {
            await userService.createLocalUser(dataDir, 'test@example.com', 'pass1234', 'User 1');
            await expect(
                userService.createLocalUser(dataDir, 'test@example.com', 'pass5678', 'User 2')
            ).rejects.toThrow('Email already registered');
        });

        it('should be case-insensitive for emails', async () => {
            await userService.createLocalUser(dataDir, 'Test@Example.com', 'pass1234', 'User 1');
            await expect(
                userService.createLocalUser(dataDir, 'test@example.com', 'pass5678', 'User 2')
            ).rejects.toThrow('Email already registered');
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            await userService.createLocalUser(dataDir, 'find@test.com', 'pass1234', 'Find Me');
            const found = await userService.findByEmail(dataDir, 'find@test.com');
            expect(found).toBeDefined();
            expect(found!.displayName).toBe('Find Me');
        });

        it('should return undefined for non-existent email', async () => {
            const found = await userService.findByEmail(dataDir, 'nobody@test.com');
            expect(found).toBeUndefined();
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const user = await userService.createLocalUser(dataDir, 'id@test.com', 'pass1234', 'By ID');
            const found = await userService.findById(dataDir, user.id);
            expect(found).toBeDefined();
            expect(found!.email).toBe('id@test.com');
        });
    });

    describe('verifyPassword', () => {
        it('should verify correct password', async () => {
            const user = await userService.createLocalUser(dataDir, 'pw@test.com', 'correct123', 'PW');
            const valid = await userService.verifyPassword(user, 'correct123');
            expect(valid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const user = await userService.createLocalUser(dataDir, 'pw@test.com', 'correct123', 'PW');
            const valid = await userService.verifyPassword(user, 'wrong');
            expect(valid).toBe(false);
        });

        it('should return false for OAuth-only user', async () => {
            const user = await userService.createOAuthUser(
                dataDir, 'google', '123', 'oauth@test.com', 'OAuth User'
            );
            const valid = await userService.verifyPassword(user, 'anything');
            expect(valid).toBe(false);
        });
    });

    describe('createOAuthUser', () => {
        it('should create OAuth user without password', async () => {
            const user = await userService.createOAuthUser(
                dataDir, 'github', 'gh-123', 'gh@test.com', 'GH User'
            );
            expect(user.passwordHash).toBeNull();
            expect(user.oauthProviders).toHaveLength(1);
            expect(user.oauthProviders[0]).toEqual({ provider: 'github', providerId: 'gh-123' });
        });

        it('should link OAuth to existing email', async () => {
            const existing = await userService.createLocalUser(
                dataDir, 'link@test.com', 'pass1234', 'Local'
            );
            const linked = await userService.createOAuthUser(
                dataDir, 'google', 'g-456', 'link@test.com', 'Google Name'
            );
            expect(linked.id).toBe(existing.id);
            expect(linked.oauthProviders).toHaveLength(1);
        });
    });

    describe('findByOAuth', () => {
        it('should find user by OAuth provider', async () => {
            await userService.createOAuthUser(
                dataDir, 'google', 'g-789', 'guser@test.com', 'Google'
            );
            const found = await userService.findByOAuth(dataDir, 'google', 'g-789');
            expect(found).toBeDefined();
            expect(found!.email).toBe('guser@test.com');
        });
    });

    describe('toPublic', () => {
        it('should exclude passwordHash', () => {
            const pub = userService.toPublic({
                id: '1',
                email: 'a@b.com',
                passwordHash: 'secret',
                oauthProviders: [{ provider: 'google', providerId: '123' }],
                displayName: 'A',
                preferredLanguage: 'nl',
                createdAt: '2024-01-01',
            });
            expect(pub).not.toHaveProperty('passwordHash');
            expect(pub.oauthProviders[0]).not.toHaveProperty('providerId');
        });
    });

    describe('updatePreferredLanguage', () => {
        it('should update user language preference', async () => {
            const user = await userService.createLocalUser(
                dataDir, 'lang@test.com', 'pass1234', 'Lang User'
            );
            expect(user.preferredLanguage).toBe('nl');

            await userService.updatePreferredLanguage(dataDir, user.id, 'en');

            const found = await userService.findById(dataDir, user.id);
            expect(found!.preferredLanguage).toBe('en');
        });

        it('should do nothing for non-existent user', async () => {
            // Should not throw
            await userService.updatePreferredLanguage(dataDir, 'nonexistent', 'en');
        });
    });

    describe('changePassword', () => {
        it('should change password with correct current password', async () => {
            const user = await userService.createLocalUser(
                dataDir, 'chpw@test.com', 'oldpass123', 'ChPw'
            );

            await userService.changePassword(dataDir, user.id, 'oldpass123', 'newpass456');

            // Verify new password works
            const updated = await userService.findById(dataDir, user.id);
            const valid = await userService.verifyPassword(updated!, 'newpass456');
            expect(valid).toBe(true);

            // Verify old password no longer works
            const invalid = await userService.verifyPassword(updated!, 'oldpass123');
            expect(invalid).toBe(false);
        });

        it('should reject incorrect current password', async () => {
            const user = await userService.createLocalUser(
                dataDir, 'chpw2@test.com', 'correct123', 'ChPw2'
            );

            await expect(
                userService.changePassword(dataDir, user.id, 'wrong', 'newpass456')
            ).rejects.toThrow('Current password is incorrect');
        });

        it('should reject for non-existent user', async () => {
            await expect(
                userService.changePassword(dataDir, 'nobody', 'a', 'b')
            ).rejects.toThrow('User not found');
        });

        it('should reject for OAuth-only user (no password set)', async () => {
            const user = await userService.createOAuthUser(
                dataDir, 'google', 'g-pw', 'oauth-pw@test.com', 'OAuth PW'
            );

            await expect(
                userService.changePassword(dataDir, user.id, 'anything', 'new')
            ).rejects.toThrow('No password set');
        });
    });
});
