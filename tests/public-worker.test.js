import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { unstable_dev } from 'wrangler';
import { Window } from 'happy-dom';
import { rmSync } from 'node:fs';

describe('Public Worker Integration', () => {
    let worker;

    beforeAll(async () => {
        const { execSync } = require('child_process');
        rmSync('./.wrangler/state/public-test', { recursive: true, force: true });
        execSync('CI=true npx wrangler d1 migrations apply zygo-cms-db --local --persist-to=./.wrangler/state/public-test -c packages/public-worker/wrangler.toml');
        execSync(`CI=true npx wrangler d1 execute zygo-cms-db --local --persist-to=./.wrangler/state/public-test -c packages/public-worker/wrangler.toml --command="INSERT OR REPLACE INTO entry_revisions (id, entry_id, title, body_html, body_json, preview_token) VALUES (999, 1, 'Preview Test Post', '<p>Preview Body</p>', '{}', 'test-valid-preview-token');"`);
        
        worker = await unstable_dev('packages/public-worker/build/index.js', {
            config: "packages/public-worker/wrangler.toml",
            vars: { ENVIRONMENT: "dev" },
            persistTo: './.wrangler/state/public-test',
            experimental: { disableExperimentalWarning: true },
        });
    }, 30000);

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

    it('simulates HappyDOM browser navigation from post index to a post', async () => {
        const res1 = await worker.fetch('/post');
        if (res1.status === 200) {
            const homeHtml = await res1.text();
            const window = new Window();
            const document = window.document;
            document.body.innerHTML = homeHtml;
            const firstPostLink = document.querySelector('ul.post-list a.post-link');
            if (firstPostLink) {
                const href = firstPostLink.getAttribute('href');
                const linkText = firstPostLink.textContent.trim();
                const res2 = await worker.fetch(href);
                expect(res2.status).toBe(200);
                const postHtml = await res2.text();
                document.body.innerHTML = postHtml;
                const postTitleEl = document.querySelector('article h1');
                expect(postTitleEl).not.toBeNull();
                expect(postTitleEl.textContent.trim()).toBe(linkText);
            }
        }
    });

    it('GET /post responds with 200 and post-list canonical path', async () => {
        const res = await worker.fetch('/post');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const html = await res.text();
        expect(html).toContain('<link rel="canonical"');
        expect(html).toContain('/post');
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

    it('GET /preview/:token responds with 200, HTML, and preview banner', async () => {
        const res = await worker.fetch('/preview/test-valid-preview-token');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const html = await res.text();
        expect(html).toContain('Preview Test Post');
        expect(html).toContain('Preview Mode');
    });

    it('GET /preview/invalid-token-xyz responds with 404', async () => {
        const res = await worker.fetch('/preview/invalid-token-xyz');
        expect(res.status).toBe(404);
    });
});
