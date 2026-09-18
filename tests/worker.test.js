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

    it('supports page hierarchy: nested paths, breadcrumbs, sub-navigation, and delete guard', async () => {
        const timestamp = Date.now();
        const parentSlug = `corp-${timestamp}`;
        const childSlug = `about-${timestamp}`;
        const grandchildSlug = `team-${timestamp}`;

        // 1. Create top-level parent page
        const parentRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Corporate Inc',
                slug: parentSlug,
                type: 'page',
                status: 'published',
                body_html: '<p>Welcome to Corporate Inc.</p>',
                body_json: '{}',
                sort_order: 1,
            }),
        });
        expect(parentRes.status).toBe(200);

        // Fetch parent id
        const entriesRes = await worker.fetch('/entries');
        const entries = await entriesRes.json();
        const parentEntry = entries.find((e) => e.slug === parentSlug);
        expect(parentEntry).toBeDefined();
        expect(parentEntry.path).toBe(`/${parentSlug}`);

        // 2. Create child page
        const childRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'About Corporate',
                slug: childSlug,
                type: 'page',
                status: 'published',
                parent_id: parentEntry.id,
                body_html: '<p>About Corporate Inc info.</p>',
                body_json: '{}',
                sort_order: 2,
            }),
        });
        expect(childRes.status).toBe(200);

        const entriesRes2 = await worker.fetch('/entries');
        const entries2 = await entriesRes2.json();
        const childEntry = entries2.find((e) => e.slug === childSlug);
        expect(childEntry).toBeDefined();
        expect(childEntry.path).toBe(`/${parentSlug}/${childSlug}`);

        // 3. Create grandchild page
        const grandchildRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Our Team',
                slug: grandchildSlug,
                type: 'page',
                status: 'published',
                parent_id: childEntry.id,
                body_html: '<p>Meet our leadership team.</p>',
                body_json: '{}',
                sort_order: 1,
            }),
        });
        expect(grandchildRes.status).toBe(200);

        // 4. Test public reader on grandchild path: breadcrumbs rendered
        const pageRes = await worker.fetch(`/${parentSlug}/${childSlug}/${grandchildSlug}`);
        expect(pageRes.status).toBe(200);
        const pageHtml = await pageRes.text();

        // Check breadcrumbs
        expect(pageHtml).toContain('aria-label="Breadcrumb"');
        expect(pageHtml).toContain(`<a href="/${parentSlug}">Corporate Inc</a>`);
        expect(pageHtml).toContain(`<a href="/${parentSlug}/${childSlug}">About Corporate</a>`);
        expect(pageHtml).toContain('<span class="crumb-current">Our Team</span>');
        expect(pageHtml).toContain('"@type": "BreadcrumbList"');

        // 5. Test public reader on parent: subpages navigation rendered
        const parentPageRes = await worker.fetch(`/${parentSlug}`);
        expect(parentPageRes.status).toBe(200);
        const parentHtml = await parentPageRes.text();

        expect(parentHtml).toContain('In this section');
        expect(parentHtml).toContain(`href="/${parentSlug}/${childSlug}"`);
        expect(parentHtml).toContain('About Corporate');

        // 6. Test delete guard: deleting parent while it has active child fails with 400
        const badDeleteRes = await worker.fetch(`/entries/${parentEntry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(badDeleteRes.status).toBe(400);
        const badDeleteText = await badDeleteRes.text();
        expect(badDeleteText).toContain('Cannot delete a page that has child pages');

        // 7. Cleanup in leaf-to-root order
        const allEntriesRes = await worker.fetch('/entries');
        const allEntries = await allEntriesRes.json();
        const grandchildEntry = allEntries.find((e) => e.slug === grandchildSlug);

        if (grandchildEntry) {
            await worker.fetch(`/entries/${grandchildEntry.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': 'Bearer test-token' },
            });
        }
        await worker.fetch(`/entries/${childEntry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        const deleteParentRes = await worker.fetch(`/entries/${parentEntry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(deleteParentRes.status).toBe(200);
    });

    it('supports post list pagination and sub-template rendering on GET /', async () => {
        // 1. Verify page 1 default rendering via sub-template
        const res1 = await worker.fetch('/');
        expect(res1.status).toBe(200);
        const html1 = await res1.text();
        expect(html1).toContain('<ul class="post-list">');
        expect(html1).toContain('class="post-link"');
        expect(html1).toContain('<title>Home — Zygo</title>');

        // 2. Verify page 2 rendering with canonical link and title
        const res2 = await worker.fetch('/?page=2');
        expect(res2.status).toBe(200);
        const html2 = await res2.text();
        expect(html2).toContain('?page=2');
        expect(html2).toContain('Page 2');

        // 3. Verify tag archive rendering with sub-template
        const tagRes = await worker.fetch('/tag/welcome');
        expect(tagRes.status).toBe(200);
        const tagHtml = await tagRes.text();
        expect(tagHtml).toContain('Tag: #welcome');
        expect(tagHtml).toContain('<ul class="post-list">');

        // 4. Verify category archive rendering with sub-template
        const catRes = await worker.fetch('/category/General');
        expect(catRes.status).toBe(200);
        const catHtml = await catRes.text();
        expect(catHtml).toContain('Category: General');
        expect(catHtml).toContain('<ul class="post-list">');
    });
});