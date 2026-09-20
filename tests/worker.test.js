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

    it('POST /entries rejects invalid Personal API Keys with 401', async () => {
        const res = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer invalid-personal-api-key',
            },
            body: JSON.stringify({
                title: 'Invalid PAK Test',
                slug: `invalid-pak-test-${Date.now()}`,
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

        // 7. Test type-conversion guard: changing page to post while it has children fails with 400
        const badTypeRes = await worker.fetch(`/entries/${parentEntry.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({ type: 'post' }),
        });
        expect(badTypeRes.status).toBe(400);
        const badTypeText = await badTypeRes.text();
        expect(badTypeText).toContain('Cannot change a page to a post while it has child pages');

        // 8. Test editor view: renders child pages panel and disabled delete button
        const editorRes = await worker.fetch(`/admin/editor/${parentEntry.id}`);
        expect(editorRes.status).toBe(200);
        const editorHtml = await editorRes.text();
        expect(editorHtml).toContain('id="child-pages-section"');
        expect(editorHtml).toContain('Subpages in this section');
        expect(editorHtml).toContain('About Corporate');
        expect(editorHtml).toContain('btn-delete-disabled');
        expect(editorHtml).toContain('Deletion blocked');

        // 9. Cleanup in leaf-to-root order
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

    it('supports media management: upload, D1 indexing, search, sync, and deletion', async () => {
        const uniqueName = `test-photo-${Date.now()}.png`;
        const fileContent = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]); // PNG magic bytes

        // 1. Upload new image
        const uploadRes = await worker.fetch(`/api/media?filename=${encodeURIComponent(uniqueName)}`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer test-token',
                'Content-Type': 'image/png',
            },
            body: fileContent,
        });
        expect(uploadRes.status).toBe(200);
        const uploadData = await uploadRes.json();
        expect(uploadData.key).toBeDefined();
        expect(uploadData.url).toContain('/media/');
        expect(uploadData.filename).toBe(uniqueName);
        expect(uploadData.mime_type).toBe('image/png');
        expect(uploadData.size_bytes).toBe(fileContent.length);

        const uploadedKey = uploadData.key;

        // 2. Fetch media list and verify indexed in D1 with pagination
        const listRes = await worker.fetch('/api/media', {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(listRes.status).toBe(200);
        const listData = await listRes.json();
        expect(Array.isArray(listData.media)).toBe(true);
        expect(listData.pagination).toBeDefined();
        expect(listData.pagination.total_items).toBeGreaterThanOrEqual(1);

        const found = listData.media.find((m) => m.key === uploadedKey);
        expect(found).toBeDefined();
        expect(found.filename).toBe(uniqueName);

        // 3. Test filename search
        const searchRes = await worker.fetch(`/api/media?search=${encodeURIComponent(uniqueName)}`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(searchRes.status).toBe(200);
        const searchData = await searchRes.json();
        expect(searchData.media.length).toBe(1);
        expect(searchData.media[0].key).toBe(uploadedKey);

        // 4. Test R2-to-D1 Sync endpoint
        const syncRes = await worker.fetch('/api/media/sync', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(syncRes.status).toBe(200);
        const syncData = await syncRes.json();
        expect(syncData.total_r2_objects).toBeGreaterThanOrEqual(1);
        expect(syncData.already_indexed).toBeGreaterThanOrEqual(1);
        expect(syncData.truncated).toBe(false);

        // 5. Delete uploaded image
        const deleteRes = await worker.fetch(`/api/media/${encodeURIComponent(uploadedKey)}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(deleteRes.status).toBe(200);
        const deleteData = await deleteRes.json();
        expect(deleteData.success).toBe(true);

        // 6. Verify item is removed from D1 list
        const verifyRes = await worker.fetch(`/api/media?search=${encodeURIComponent(uniqueName)}`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        const verifyData = await verifyRes.json();
        expect(verifyData.media.length).toBe(0);
    });

    it('executes scheduled cron trigger for background R2-to-D1 reconciliation', async () => {
        const cronRes = await worker.fetch('/cdn-cgi/local/scheduled');
        expect(cronRes.status).toBeLessThan(400);
    });

    it('supports revisions, draft saving, version history API, and tokenized preview mode', async () => {
        const slug = `rev-test-${Date.now()}`;

        // 1. Create a published post
        const createRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Initial Title',
                slug,
                type: 'post',
                status: 'published',
                description: 'Initial description',
                body_html: '<p>Initial published content</p>',
                body_json: '{}',
                category: 'Tech',
                tags: 'v1',
            }),
        });
        expect(createRes.status).toBe(200);
        const createJson = await createRes.json();
        expect(createJson.success).toBe(true);
        expect(createJson.preview_token).toBeDefined();

        // Fetch entry ID
        const postsRes = await worker.fetch('/posts');
        const posts = await postsRes.json();
        const entry = posts.find((p) => p.slug === slug);
        expect(entry).toBeDefined();

        // 2. Fetch revision history via GET /api/entries/:id/revisions
        const revsRes = await worker.fetch(`/api/entries/${entry.id}/revisions`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(revsRes.status).toBe(200);
        const revs = await revsRes.json();
        expect(revs.length).toBe(1);
        expect(revs[0].title).toBe('Initial Title');
        const rev1Id = revs[0].id;

        // 3. Fetch single revision detail via GET /api/revisions/:id
        const singleRevRes = await worker.fetch(`/api/revisions/${rev1Id}`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(singleRevRes.status).toBe(200);
        const singleRev = await singleRevRes.json();
        expect(singleRev.title).toBe('Initial Title');
        expect(singleRev.body_html).toBe('<p>Initial published content</p>');

        // 4. Save a draft update (draft_only: true)
        const draftRes = await worker.fetch(`/entries/${entry.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Draft Title (Unpublished)',
                body_html: '<p>Unpublished draft changes</p>',
                draft_only: true,
            }),
        });
        expect(draftRes.status).toBe(200);
        const draftJson = await draftRes.json();
        expect(draftJson.preview_token).toBeDefined();
        const draftToken = draftJson.preview_token;

        // 5. Verify public post STILL shows original published content (Option A decoupling)
        const publicRes = await worker.fetch(`/post/${slug}`);
        expect(publicRes.status).toBe(200);
        const publicHtml = await publicRes.text();
        expect(publicHtml).toContain('Initial Title');
        expect(publicHtml).toContain('<p>Initial published content</p>');
        expect(publicHtml).not.toContain('Draft Title (Unpublished)');
        expect(publicHtml).not.toContain('Preview Mode');

        // 6. Verify tokenized preview route GET /preview/:token renders draft snapshot with banner and no-store
        const previewRes = await worker.fetch(`/preview/${draftToken}`);
        expect(previewRes.status).toBe(200);
        expect(previewRes.headers.get('cache-control')).toContain('no-store');
        const previewHtml = await previewRes.text();
        expect(previewHtml).toContain('Draft Title (Unpublished)');
        expect(previewHtml).toContain('<p>Unpublished draft changes</p>');
        expect(previewHtml).toContain('Preview Mode');
        expect(previewHtml).toContain('Snapshot from');
        expect(previewHtml).toContain('Return to Editor');

        // 7. Verify revisions list now contains 2 revisions
        const revsRes2 = await worker.fetch(`/api/entries/${entry.id}/revisions`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        const revs2 = await revsRes2.json();
        expect(revs2.length).toBe(2);

        // 8. Publish the entry (draft_only: false)
        const publishRes = await worker.fetch(`/entries/${entry.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Updated Published Title',
                body_html: '<p>Updated published content</p>',
                draft_only: false,
            }),
        });
        expect(publishRes.status).toBe(200);

        // 9. Verify public post now renders updated content
        const updatedPublicRes = await worker.fetch(`/post/${slug}`);
        expect(updatedPublicRes.status).toBe(200);
        const updatedPublicHtml = await updatedPublicRes.text();
        expect(updatedPublicHtml).toContain('Updated Published Title');
        expect(updatedPublicHtml).toContain('<p>Updated published content</p>');

        // 10. Soft-delete entry
        const deleteRes = await worker.fetch(`/entries/${entry.id}`, {
            method: 'DELETE',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(deleteRes.status).toBe(200);
        const deleteJson = await deleteRes.json();
        expect(deleteJson.soft_deleted).toBe(true);

        // 11. Public route returns 404 after soft-delete
        const deletedPublicRes = await worker.fetch(`/post/${slug}`);
        expect(deletedPublicRes.status).toBe(404);

        // 12. Revisions are PRESERVED after soft-delete (Option A rollback guarantee)
        const revsRes3 = await worker.fetch(`/api/entries/${entry.id}/revisions`, {
            headers: { 'Authorization': 'Bearer test-token' },
        });
        const revs3 = await revsRes3.json();
        expect(revs3.length).toBe(3);

        // 13. Deleted entry appears in Trash list
        const trashRes = await worker.fetch('/entries?filter=trash');
        expect(trashRes.status).toBe(200);
        const trashEntries = await trashRes.json();
        const inTrash = trashEntries.find((e) => e.id === entry.id);
        expect(inTrash).toBeDefined();
        expect(inTrash.deleted_at).not.toBeNull();

        // 14. Creating new entry with same slug is rejected with helpful Trash message
        const duplicateRes = await worker.fetch('/entries', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token',
            },
            body: JSON.stringify({
                title: 'Duplicate Slug Attempt',
                slug,
                body_html: '<p>Test</p>',
                body_json: '{}',
            }),
        });
        expect(duplicateRes.status).toBe(400);
        const dupText = await duplicateRes.text();
        expect(dupText).toContain('already exists in the Trash');

        // 15. Restore the entry
        const restoreRes = await worker.fetch(`/entries/${entry.id}/restore`, {
            method: 'POST',
            headers: { 'Authorization': 'Bearer test-token' },
        });
        expect(restoreRes.status).toBe(200);
        const restoreJson = await restoreRes.json();
        expect(restoreJson.restored).toBe(String(entry.id));

        // 16. Verify public route is restored
        const restoredPublicRes = await worker.fetch(`/post/${slug}`);
        expect(restoredPublicRes.status).toBe(200);
        const restoredPublicHtml = await restoredPublicRes.text();
        expect(restoredPublicHtml).toContain('Updated Published Title');
    });
});