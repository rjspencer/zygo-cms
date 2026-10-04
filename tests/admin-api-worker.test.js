import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Admin API Worker Integration', () => {
    let worker;

    beforeAll(async () => {
        const { execSync } = require('child_process');
        execSync('CI=true npx wrangler d1 migrations apply zygo-cms-db --local --persist-to=./.wrangler/state/admin-test -c packages/admin-api-worker/wrangler.toml');
        
        worker = await unstable_dev('packages/admin-api-worker/build/index.js', {
            config: 'packages/admin-api-worker/wrangler.toml',
            vars: { ENVIRONMENT: 'test' },
            persistTo: './.wrangler/state/admin-test',
            experimental: { disableExperimentalWarning: true },
        });
    }, 30000);

    afterAll(async () => {
        if (worker) {
            await worker.stop();
        }
    });

    const createDummyJwt = () => {
        const payload = {
            email: 'admin@test.local',
            sub: 'test-admin-uuid',
            aud: 'test-aud',
            exp: Math.floor(Date.now() / 1000) + 3600
        };
        const encodedPayload = Buffer.from(JSON.stringify(payload)).toString('base64url');
        return `header.${encodedPayload}.signature`;
    };

    const getHeaders = (token = createDummyJwt()) => ({
        'Content-Type': 'application/json',
        'Cf-Access-Jwt-Assertion': token
    });

    it('rejects unauthenticated requests with 401', async () => {
        const res = await worker.fetch('/api/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Unauthorized Test',
                slug: `unauth-test-${Date.now()}`,
                type: 'post',
                status: 'published',
                body_html: '<p>Test</p>',
                body_json: '{}',
            }),
        });
        expect(res.status).toBe(401);
    });

    it('accepts authenticated requests and performs CRUD on entries', async () => {
        const slug = `crud-test-${Date.now()}`;
        
        // 1. Create
        const createRes = await worker.fetch('/api/entries', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                title: 'CRUD Test Post',
                slug,
                type: 'post',
                status: 'published',
                description: 'Test post',
                body_html: '<p>CRUD</p>',
                body_json: '{}',
            }),
        });
        expect(createRes.status).toBe(200);
        const createJson = await createRes.json();
        expect(createJson.success).toBe(true);
        expect(typeof createJson.preview_token).toBe('string');
        expect(createJson.preview_token).toBeDefined();

        // 2. Read (from API)
        const getRes = await worker.fetch('/api/entries', { headers: getHeaders() });
        expect(getRes.status).toBe(200);
        const getJson = await getRes.json();
        const created = getJson.find((p) => p.slug === slug);
        expect(created).toBeDefined();

        // 3. Update
        if (created) {
            const updateRes = await worker.fetch(`/api/entries/${created.id}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({
                    title: 'CRUD Test Post Updated',
                    slug,
                    type: 'post',
                    status: 'published',
                    description: 'Test post updated',
                    body_html: '<p>CRUD Updated</p>',
                    body_json: '{}',
                }),
            });
            expect(updateRes.status).toBe(200);
            const updateJson = await updateRes.json();
            expect(updateJson.success).toBe(true);
            expect(updateJson).toMatchObject({
                preview_token: expect.any(String),
            });
        }

        // 4. Delete
        if (created) {
            const delRes = await worker.fetch(`/api/entries/${created.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            expect(delRes.status).toBe(200);
        }
    });

    it('manages users via admin API (list, create, update, soft-delete)', async () => {
        // 1. Unauthenticated request to /api/admin/users should be rejected with 401
        const unauthRes = await worker.fetch('/api/admin/users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
        });
        expect(unauthRes.status).toBe(401);

        // 2. List users (authenticated)
        const listRes = await worker.fetch('/api/admin/users', {
            method: 'GET',
            headers: getHeaders(),
        });
        expect(listRes.status).toBe(200);
        const usersList = await listRes.json();
        expect(Array.isArray(usersList)).toBe(true);

        // 3. Create a new user
        const uniqueEmail = `testuser-${Date.now()}@example.com`;
        const createRes = await worker.fetch('/api/admin/users', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                email: uniqueEmail,
                display_name: 'Test Member',
                role: 'author',
            }),
        });
        expect(createRes.status).toBe(200);
        const createdUser = await createRes.json();
        expect(createdUser.id).toBeDefined();
        expect(createdUser.email).toBe(uniqueEmail);
        expect(createdUser.display_name).toBe('Test Member');
        expect(createdUser.role).toBe('author');
        expect(createdUser.deleted_at).toBeNull();

        const userId = createdUser.id;

        // 4. Update the user
        const updateRes = await worker.fetch(`/api/admin/users/${userId}`, {
            method: 'PUT',
            headers: getHeaders(),
            body: JSON.stringify({
                role: 'editor',
                display_name: 'Updated Member',
                bio: 'Tech enthusiast',
                website: 'https://example.com',
                avatar_url: 'https://example.com/avatar.png',
            }),
        });
        expect(updateRes.status).toBe(200);
        const updatedUser = await updateRes.json();
        expect(updatedUser.id).toBe(userId);
        expect(updatedUser.role).toBe('editor');
        expect(updatedUser.display_name).toBe('Updated Member');
        expect(updatedUser.bio).toBe('Tech enthusiast');
        expect(updatedUser.website).toBe('https://example.com');
        expect(updatedUser.avatar_url).toBe('https://example.com/avatar.png');

        // 5. Soft delete the user
        const deleteRes = await worker.fetch(`/api/admin/users/${userId}`, {
            method: 'DELETE',
            headers: getHeaders(),
        });
        expect(deleteRes.status).toBe(200);
        const deleteResult = await deleteRes.json();
        expect(deleteResult.success).toBe(true);

        // 6. Verify user is soft-deleted
        const listAfterDelete = await worker.fetch('/api/admin/users', {
            method: 'GET',
            headers: getHeaders(),
        });
        const usersAfterDelete = await listAfterDelete.json();
        const deletedUserInList = usersAfterDelete.find(u => u.id === userId);
        expect(deletedUserInList).toBeDefined();
        expect(deletedUserInList.deleted_at).toBeTruthy();
    });

    it('handles settings retrieval with fallback canonical_origin and batch updates', async () => {
        // 1. Get settings initially (check fallback canonical origin)
        const getRes = await worker.fetch('/api/settings', { headers: getHeaders() });
        expect(getRes.status).toBe(200);
        const getJson = await getRes.json();
        expect(getJson.canonical_origin).toBeDefined();

        // 2. Batch update settings
        const postRes = await worker.fetch('/api/settings', {
            method: 'POST',
            headers: getHeaders(),
            body: JSON.stringify({
                settings: {
                    site_title: 'My Batch Site',
                    canonical_origin: 'https://custom.mysite.com',
                    description: 'Batch description',
                    analytics_enabled: 'true'
                }
            })
        });
        expect(postRes.status).toBe(200);
        const postJson = await postRes.json();
        expect(postJson.success).toBe(true);

        // 3. Read back updated settings
        const getUpdatedRes = await worker.fetch('/api/settings', { headers: getHeaders() });
        expect(getUpdatedRes.status).toBe(200);
        const updatedJson = await getUpdatedRes.json();
        expect(updatedJson.site_title).toBe('My Batch Site');
        expect(updatedJson.canonical_origin).toBe('https://custom.mysite.com');
        expect(updatedJson.description).toBe('Batch description');
        expect(updatedJson.analytics_enabled).toBe('true');
    });

    it('bypasses Cloudflare Access verification and returns mock admin in dev mode', async () => {
        const devWorker = await unstable_dev('packages/admin-api-worker/build/index.js', {
            config: 'packages/admin-api-worker/wrangler.toml',
            vars: { ENVIRONMENT: 'dev' },
            persistTo: './.wrangler/state/admin-test',
            experimental: { disableExperimentalWarning: true },
        });

        try {
            const res = await devWorker.fetch('/api/entries');
            expect(res.status).toBe(200);

            const meRes = await devWorker.fetch('/api/me');
            expect(meRes.status).toBe(200);
            const meJson = await meRes.json();
            expect(meJson.email).toBe('admin@localhost');
            expect(meJson.role).toBe('admin');
        } finally {
            await devWorker.stop();
        }
    });
});
