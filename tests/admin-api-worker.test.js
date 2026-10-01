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
            sub: 'test-admin-uuid'
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
