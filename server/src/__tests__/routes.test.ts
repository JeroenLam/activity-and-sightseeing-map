import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import request from 'supertest';
import { createApp } from '../index';

describe('API Routes', () => {
    let app: any;
    let dataDir: string;
    let agent: any;

    beforeEach(async () => {
        dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'api-test-'));
        app = await createApp(dataDir);
        agent = request.agent(app);
    });

    afterEach(async () => {
        await fs.rm(dataDir, { recursive: true, force: true });
    });

    async function registerAndLogin() {
        await agent.post('/api/auth/register').send({
            email: 'test@test.com',
            password: 'password123',
            displayName: 'Tester',
        });
    }

    describe('Auth', () => {
        it('POST /api/auth/register - creates user', async () => {
            const res = await agent.post('/api/auth/register').send({
                email: 'new@test.com',
                password: 'password123',
                displayName: 'New User',
            });
            expect(res.status).toBe(201);
            expect(res.body.email).toBe('new@test.com');
            expect(res.body.displayName).toBe('New User');
            expect(res.body).not.toHaveProperty('passwordHash');
        });

        it('POST /api/auth/register - rejects short password', async () => {
            const res = await agent.post('/api/auth/register').send({
                email: 'bad@test.com',
                password: 'short',
                displayName: 'Bad',
            });
            expect(res.status).toBe(400);
        });

        it('POST /api/auth/register - rejects duplicate email', async () => {
            await agent.post('/api/auth/register').send({
                email: 'dup@test.com',
                password: 'password123',
                displayName: 'First',
            });
            const res = await agent.post('/api/auth/register').send({
                email: 'dup@test.com',
                password: 'password456',
                displayName: 'Second',
            });
            expect(res.status).toBe(409);
        });

        it('POST /api/auth/login - logs in with valid credentials', async () => {
            await agent.post('/api/auth/register').send({
                email: 'login@test.com',
                password: 'password123',
                displayName: 'Login',
            });
            const res = await agent.post('/api/auth/login').send({
                email: 'login@test.com',
                password: 'password123',
            });
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('login@test.com');
        });

        it('POST /api/auth/login - rejects invalid password', async () => {
            await agent.post('/api/auth/register').send({
                email: 'wrong@test.com',
                password: 'password123',
                displayName: 'Wrong',
            });
            const res = await agent.post('/api/auth/login').send({
                email: 'wrong@test.com',
                password: 'badpassword',
            });
            expect(res.status).toBe(401);
        });

        it('GET /api/auth/me - returns user when authenticated', async () => {
            await registerAndLogin();
            const res = await agent.get('/api/auth/me');
            expect(res.status).toBe(200);
            expect(res.body.email).toBe('test@test.com');
        });

        it('GET /api/auth/me - returns 401 when not authenticated', async () => {
            const res = await request(app).get('/api/auth/me');
            expect(res.status).toBe(401);
        });

        it('POST /api/auth/logout - clears session', async () => {
            await registerAndLogin();
            const logoutRes = await agent.post('/api/auth/logout');
            expect(logoutRes.status).toBe(200);
        });
    });

    describe('Types (authenticated)', () => {
        beforeEach(async () => {
            await registerAndLogin();
        });

        it('GET /api/types - returns default types', async () => {
            const res = await agent.get('/api/types');
            expect(res.status).toBe(200);
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body.some((t: any) => t.name === 'Dierentuin')).toBe(true);
        });

        it('POST /api/types - creates new type', async () => {
            const res = await agent.post('/api/types').send({
                name: 'Aquarium',
                color: '#00BCD4',
            });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Aquarium');
        });

        it('PUT /api/types/:id - updates type', async () => {
            const types = await agent.get('/api/types');
            const id = types.body[0].id;
            const res = await agent.put(`/api/types/${id}`).send({
                name: 'Updated',
                color: '#000',
            });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Updated');
        });

        it('DELETE /api/types/:id - deletes type', async () => {
            const types = await agent.get('/api/types');
            const id = types.body[0].id;
            const res = await agent.delete(`/api/types/${id}`);
            expect(res.status).toBe(200);
        });
    });

    describe('Locations (authenticated)', () => {
        beforeEach(async () => {
            await registerAndLogin();
        });

        it('GET /api/locations - returns empty array initially', async () => {
            const res = await agent.get('/api/locations');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('POST /api/locations - creates location', async () => {
            const res = await agent.post('/api/locations').send({
                name: 'Artis',
                type: 'zoo',
                city: 'Amsterdam',
                country: 'NL',
                latitude: 52.366,
                longitude: 4.916,
                visitedYears: [2024],
            });
            expect(res.status).toBe(201);
            expect(res.body.name).toBe('Artis');
        });

        it('POST /api/locations - requires name, type, lat, lng', async () => {
            const res = await agent.post('/api/locations').send({
                city: 'Amsterdam',
            });
            expect(res.status).toBe(400);
        });

        it('PUT /api/locations/:id - updates location', async () => {
            const created = await agent.post('/api/locations').send({
                name: 'Artis',
                type: 'zoo',
                latitude: 52.366,
                longitude: 4.916,
            });
            const res = await agent
                .put(`/api/locations/${created.body.id}`)
                .send({ name: 'Artis Zoo' });
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('Artis Zoo');
        });

        it('DELETE /api/locations/:id - deletes location', async () => {
            const created = await agent.post('/api/locations').send({
                name: 'Artis',
                type: 'zoo',
                latitude: 52.366,
                longitude: 4.916,
            });
            const res = await agent.delete(`/api/locations/${created.body.id}`);
            expect(res.status).toBe(200);
        });

        it('POST /api/locations/import/preview - previews CSV', async () => {
            const csv = 'Naam,Wat,Plaats,Land,Link,Geweest\nArtis,Dierentuin,Amsterdam,NL,https://artis.nl,2024';
            const res = await agent.post('/api/locations/import/preview').send({ csv });
            expect(res.status).toBe(200);
            expect(res.body.headers).toContain('Naam');
            expect(res.body.totalRows).toBe(1);
            expect(res.body.columnMap.name).toBe('Naam');
        });
    });

    describe('Unauthenticated access', () => {
        it('GET /api/locations - returns 401', async () => {
            const res = await request(app).get('/api/locations');
            expect(res.status).toBe(401);
        });

        it('GET /api/types - returns 401', async () => {
            const res = await request(app).get('/api/types');
            expect(res.status).toBe(401);
        });
    });
});
