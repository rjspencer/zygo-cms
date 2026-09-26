import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Admin API Worker Integration', () => {
    let worker;

    beforeAll(async () => {
        worker = await unstable_dev('packages/admin-api-worker/build/index.js', {
            config: 'wrangler.toml',
            vars: { ENVIRONMENT: 'test' },
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

        // 2. Read (from API)
        const getRes = await worker.fetch('/api/entries', { headers: getHeaders() });
        expect(getRes.status).toBe(200);
        const getJson = await getRes.json();
        const created = getJson.find((p) => p.slug === slug);
        expect(created).toBeDefined();

        // 3. Delete
        if (created) {
            const delRes = await worker.fetch(`/api/entries/${created.id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            expect(delRes.status).toBe(200);
        }
    });
});
