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
        expect(html).not.toMatch(/<footer[\s\S]*href="\/theme-preview"[\s\S]*<\/footer>/);
    });

    it('serves dynamic stylesheet with 1920px max-width and no obsolete body padding/margin', async () => {
        const homeRes = await worker.fetch('/');
        const html = await homeRes.text();
        const styleMatch = html.match(/href="(\/style-[^"]+\.css)"/);
        expect(styleMatch).not.toBeNull();
        const styleUrl = styleMatch[1];
        expect(styleUrl).not.toBe('/style-default.css');

        const styleRes = await worker.fetch(styleUrl);
        expect(styleRes.status).toBe(200);
        const css = await styleRes.text();
        expect(css).toContain('--content-max-width: 1920px');
        expect(css).toContain('max-width: var(--content-max-width, 1920px)');
        expect(css).not.toContain('max-width: var(--content-max-width, 740px)');
        expect(css).not.toContain('margin: 3rem auto');
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

    it('GET /theme-preview responds with 200 and renders all preset section templates with theme tokens', async () => {
        const res = await worker.fetch('/theme-preview');
        expect(res.status).toBe(200);
        expect(res.headers.get('content-type')).toContain('text/html');
        const html = await res.text();

        // Title and canonical
        expect(html).toContain('Theme &amp; Section Showcase');

        // Verify all section templates rendered
        expect(html).toContain('template-hero');
        expect(html).toContain('Designing Autonomous Systems with Elegance');
        expect(html).toContain('template-text');
        expect(html).toContain('The Philosophy of Edge-First Publishing');
        expect(html).toContain('template-text-image');
        expect(html).toContain('Engineered for Extreme Performance');
        expect(html).toContain('template-gallery');
        expect(html).toContain('Visual Design &amp; System Architecture');
        expect(html).toContain('template-image-carousel');
        expect(html).toContain('Curated Workspaces &amp; Editorial Showcase');
        expect(html).toContain('template-call-to-action');
        expect(html).toContain('Ready to Transform Your Content Workflow?');
        expect(html).toContain('template-feature-grid');
        expect(html).toContain('Core Capabilities');
        expect(html).toContain('template-testimonial');
        expect(html).toContain('Elena Rostova');
        expect(html).toContain('template-faq');
        expect(html).toContain('Frequently Asked Questions');
        expect(html).toContain('template-video-embed');
        expect(html).toContain('Platform Architecture Walkthrough');
        expect(html).toContain('template-pricing');
        expect(html).toContain('Simple, Predictable Pricing');
        expect(html).toContain('template-stats');
        expect(html).toContain('Engineered for Zero Cold Starts');
        expect(html).toContain('template-logo-cloud');
        expect(html).toContain('Trusted by Next-Generation Media Leaders');
        expect(html).toContain('template-team');
        expect(html).toContain('Marcus Aurelius Vance');
        expect(html).toContain('template-steps');
        expect(html).toContain('How Zygo CMS Works');
        expect(html).toContain('template-contact-form');
        expect(html).toContain('Get in Touch with Our Team');
        expect(html).toContain('template-newsletter');
        expect(html).toContain('Subscribe to the Edge Dispatch');

        // Verify footer menu does not contain Theme Preview link
        expect(html).not.toMatch(/<footer[\s\S]*href="\/theme-preview"[\s\S]*<\/footer>/);

        // Verify theme CSS custom properties are applied
        expect(html).toContain('var(--color-surface');
        expect(html).toContain('var(--border-radius');
        expect(html).toContain('var(--color-border');

        // Verify feature-grid darker background and image-carousel light muted background
        expect(html).toContain('color-mix(in srgb, var(--color-text, #1c1917) 6%, var(--color-bg, #faf8f5))');
        expect(html).toContain('color-mix(in srgb, var(--color-accent, #991b1b) 7%, var(--color-bg, #faf8f5))');

        // Verify carousel full-width screen extension styling
        expect(html).toContain('.section-carousel { background: color-mix(in srgb, var(--color-accent, #991b1b) 7%, var(--color-bg, #faf8f5)); border-top: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); border-bottom: 1px solid color-mix(in srgb, var(--color-border, #e7e5e4) 60%, transparent); padding: 5rem 0; box-sizing: border-box; width: 100%; }');
        expect(html).toContain('.carousel-track { display: flex; overflow-x: auto; scroll-snap-type: x mandatory; gap: 1.5rem; padding: 0 5rem 1.5rem; width: 100%; box-sizing: border-box; scrollbar-width: thin; }');
    });
});
