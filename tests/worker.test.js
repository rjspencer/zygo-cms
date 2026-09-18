import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';

describe('Cloudflare Worker Integration (Level 2: Real Worker)', () => {
    let worker;

    beforeAll(async () => {
        // Boots your compiled Rust WebAssembly Worker in an in-memory runtime
        worker = await unstable_dev('build/index.js', {
            config: 'wrangler.toml',
            vars: { TEST_AUTH_BYPASS: 'true' },
            experimental: { disableExperimentalWarning: true },
        });
    }, 30000); // 30s timeout for initial worker boot

    afterAll(async () => {
        if (worker) {
            await worker.stop();
        }
    });

    it('GET / responds with 200, HTML, and edge cache headers', async () => {
        const res = await worker.fetch('/');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        expect(res.headers.get('cache-control')).toContain('s-maxage=');

        const html = await res.text();
        expect(html).toContain('<link rel="canonical"');
    });

    it('GET /sitemap.xml responds with 200 and valid XML', async () => {
        const res = await worker.fetch('/sitemap.xml');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/xml');

        const xml = await res.text();
        expect(xml).toContain('<urlset');
    });

    it('GET /rss.xml responds with 200 and valid RSS feed', async () => {
        const res = await worker.fetch('/rss.xml');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('application/rss+xml');

        const xml = await res.text();
        expect(xml).toContain('<rss');
    });

    it('GET /non-existent-page responds with 404', async () => {
        const res = await worker.fetch('/non-existent-page-slug-12345');
        expect(res.status).toBe(404);
    });

    it('POST /entries rejects unauthenticated requests with 401', async () => {
        const res = await worker.fetch('/entries', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title: 'Unauthorized Test',
                slug: `unauth-test-${Date.now()}`,
                body_html: '<p>Test</p>',
                body_json: '{}',
            }),
        });
        expect(res.status).toBe(401);
    });

    it('POST /entries sanitizes malicious HTML before storing and serving via GET /post/:slug', async () => {
        const slug = `sanitized-post-${Date.now()}`;
        const maliciousHtml = '<p>Safe paragraph</p><script>alert("xss")</script><a href="javascript:steal()">Malicious Link</a><img src="/media/pic.jpg" alt="Photo" onerror="alert(1)"><pre><code class="language-rust">fn main() {}</code></pre>';

        const postRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Sanitization Test Post',
                slug,
                type: 'post',
                status: 'published',
                description: 'Test post for sanitization verification',
                body_html: maliciousHtml,
                body_json: '{}',
            }),
        });

        expect(postRes.status).toBe(200);
        const postJson = await postRes.json();
        expect(postJson.success).toBe(true);

        const getRes = await worker.fetch(`/post/${slug}`);
        expect(getRes.status).toBe(200);
        const html = await getRes.text();

        // Extract the rendered article prose container
        const proseMatch = html.match(/<div class="prose">([\s\S]*?)<\/div>/);
        expect(proseMatch).not.toBeNull();
        const prose = proseMatch[1];

        // Safe markup and allowed attributes preserved
        expect(prose).toContain('<p>Safe paragraph</p>');
        expect(prose).toContain('src="/media/pic.jpg"');
        expect(prose).toContain('alt="Photo"');
        expect(prose).toContain('<code class="language-rust">fn main() {}</code>');

        // Dangerous tags and attributes stripped
        expect(prose).not.toContain('<script');
        expect(prose).not.toContain('onerror');
        expect(prose).not.toContain('javascript:');
        expect(prose).not.toContain('steal()');
        expect(prose).not.toContain('alert(');

        // Cleanup created entry from database
        const postsRes = await worker.fetch('/posts');
        if (postsRes.ok) {
            const posts = await postsRes.json();
            const created = posts.find((p) => p.slug === slug);
            if (created) {
                await worker.fetch(`/entries/${created.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': 'Bearer test-token' },
                });
            }
        }
    });
});