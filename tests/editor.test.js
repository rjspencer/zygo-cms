import { describe, it, expect, beforeEach } from 'vitest';
import { screen, fireEvent } from '@testing-library/dom';
import fs from 'fs';
import path from 'path';
import { initEditor } from '../public/editor.js';

function loadRealEditorTemplate() {
    const templatePath = path.resolve(__dirname, '../templates/editor.html');
    let html = fs.readFileSync(templatePath, 'utf8');

    // Strip Askama block tags ({% ... %}) and expression tags ({{ ... }})
    html = html
        .replace(/\{%[\s\S]*?%\}/g, '')
        .replace(/\{\{[\s\S]*?\}\}/g, '');

    document.body.innerHTML = html;
}

describe('Editor UI with Testing Library & HappyDOM (Level 1: Real Template)', () => {
    beforeEach(async () => {
        loadRealEditorTemplate();
        const titleInput = document.querySelector('#title');
        if (titleInput) titleInput.value = 'My Test Post';
        const typeSelect = document.querySelector('#type');
        if (typeSelect) typeSelect.value = 'post';
        await initEditor('<p>Hello</p>', null);
    });

    describe('Schema JSON-LD Validation & Formatting', () => {
        it('marks invalid JSON with an error class and message', () => {
            const schemaInput = screen.getByLabelText(/schema json-ld/i);
            const statusEl = document.querySelector('#schema-status');

            fireEvent.input(schemaInput, { target: { value: '{ invalid: json }' } });

            expect(schemaInput.classList.contains('has-error')).toBe(true);
            expect(statusEl.textContent).toMatch(/invalid json/i);
        });

        it('marks valid JSON as valid', () => {
            const schemaInput = screen.getByLabelText(/schema json-ld/i);
            const statusEl = document.querySelector('#schema-status');

            fireEvent.input(schemaInput, { target: { value: '{"@type": "BlogPosting"}' } });

            expect(schemaInput.classList.contains('has-error')).toBe(false);
            expect(statusEl.textContent).toContain('✓ Valid JSON-LD');
        });

        it('formats JSON with 2-space indentation on button click', () => {
            const schemaInput = screen.getByLabelText(/schema json-ld/i);
            const formatBtn = screen.getByRole('button', { name: /format json/i });

            schemaInput.value = '{"title":"Test","author":"Zygo"}';
            fireEvent.click(formatBtn);

            expect(schemaInput.value).toBe('{\n  "title": "Test",\n  "author": "Zygo"\n}');
        });

        it('populates standard template on "Use Template" click', () => {
            const schemaInput = screen.getByLabelText(/schema json-ld/i);
            const templateBtn = screen.getByRole('button', { name: /use template/i });

            fireEvent.click(templateBtn);

            const parsed = JSON.parse(schemaInput.value);
            expect(parsed['@context']).toBe('https://schema.org');
            expect(parsed['@type']).toBe('BlogPosting');
            expect(parsed['headline']).toBe('My Test Post');
        });

        it('blocks form submission when JSON syntax is invalid', () => {
            const form = document.querySelector('#post-form');
            const schemaInput = screen.getByLabelText(/schema json-ld/i);
            const statusMsg = document.querySelector('#status-msg');

            schemaInput.value = '{ bad json';
            fireEvent.input(schemaInput);

            fireEvent.submit(form);

            expect(statusMsg.textContent).toContain('Cannot save: please fix JSON-LD syntax errors first.');
        });
    });

    describe('Cover Image Widget', () => {
        it('clears input and toggles preview/dropzone on Remove click', () => {
            const coverInput = document.querySelector('#cover-image');
            const previewContainer = document.querySelector('#cover-preview-container');
            const dropzone = document.querySelector('#cover-dropzone');

            // 1. Simulate having an image active first so container is visible
            coverInput.value = 'https://example.com/cover.webp';
            previewContainer.style.display = 'block';
            dropzone.style.display = 'none';

            // 2. Query the button now that it's visible
            const removeBtn = screen.getByRole('button', { name: /remove/i });

            fireEvent.click(removeBtn);

            expect(coverInput.value).toBe('');
            expect(previewContainer.style.display).toBe('none');
            expect(dropzone.style.display).toBe('block');
        });
    });

    describe('Media Gallery Modal', () => {
        it('opens modal on "Browse Library" click and closes on close button', () => {
            const browseBtn = document.querySelector('#btn-gallery');
            const modal = document.querySelector('#media-modal');
            const closeBtn = document.querySelector('#modal-close-btn');

            expect(modal.style.display).toBe('none');

            fireEvent.click(browseBtn);
            expect(modal.style.display).toBe('flex');

            fireEvent.click(closeBtn);
            expect(modal.style.display).toBe('none');
        });

        it('renders search input, sort selector, sync button, and pagination controls', () => {
            const searchInput = document.querySelector('#media-search-input');
            const sortSelect = document.querySelector('#media-sort-select');
            const syncBtn = document.querySelector('#modal-sync-btn');
            const pagination = document.querySelector('#media-pagination');
            const prevBtn = document.querySelector('#media-prev-btn');
            const nextBtn = document.querySelector('#media-next-btn');
            const pageInfo = document.querySelector('#media-page-info');

            expect(searchInput).not.toBeNull();
            expect(sortSelect).not.toBeNull();
            expect(syncBtn).not.toBeNull();
            expect(pagination).not.toBeNull();
            expect(prevBtn).not.toBeNull();
            expect(nextBtn).not.toBeNull();
            expect(pageInfo).not.toBeNull();

            // Test interaction with search and sort
            fireEvent.input(searchInput, { target: { value: 'hero' } });
            expect(searchInput.value).toBe('hero');

            fireEvent.change(sortSelect, { target: { value: 'name_asc' } });
            expect(sortSelect.value).toBe('name_asc');
        });
    });

    describe('Toolbar Commands', () => {
        it('renders the Code Block button and handles clicks', () => {
            const codeBlockBtn = screen.getByRole('button', { name: /code block/i });
            expect(codeBlockBtn).not.toBeNull();
            expect(codeBlockBtn.getAttribute('data-cmd')).toBe('code-block');

            expect(() => fireEvent.click(codeBlockBtn)).not.toThrow();
        });
    });

    describe('Taxonomy Controls', () => {
        it('renders category and tags inputs and updates value', () => {
            const categoryInput = screen.getByLabelText(/category/i);
            const tagsInput = screen.getByLabelText(/tags/i);

            expect(categoryInput).not.toBeNull();
            expect(tagsInput).not.toBeNull();

            fireEvent.input(categoryInput, { target: { value: 'Engineering' } });
            fireEvent.input(tagsInput, { target: { value: 'rust, cloudflare, wasm' } });

            expect(categoryInput.value).toBe('Engineering');
            expect(tagsInput.value).toBe('rust, cloudflare, wasm');
        });
    });

    describe('Page Hierarchy Controls', () => {
        it('toggles page hierarchy fields based on content type', () => {
            const typeSelect = document.querySelector('#type');
            const hierarchyContainer = document.querySelector('#page-hierarchy-fields');
            const parentSelect = document.querySelector('#parent-id');
            const sortOrderInput = document.querySelector('#sort-order');

            expect(typeSelect).not.toBeNull();
            expect(hierarchyContainer).not.toBeNull();
            expect(parentSelect).not.toBeNull();
            expect(sortOrderInput).not.toBeNull();

            // Default is post -> hidden
            typeSelect.value = 'post';
            fireEvent.change(typeSelect);
            expect(hierarchyContainer.style.display).toBe('none');

            // Switch to page -> visible
            typeSelect.value = 'page';
            fireEvent.change(typeSelect);
            expect(hierarchyContainer.style.display).toBe('block');

            // Switch back to post -> hidden
            typeSelect.value = 'post';
            fireEvent.change(typeSelect);
            expect(hierarchyContainer.style.display).toBe('none');
        });

        it('blocks changing page to post when entry has child pages', () => {
            const form = document.querySelector('#post-form');
            form.dataset.hasChildren = 'true';
            form.dataset.childCount = '2';

            const typeSelect = document.querySelector('#type');
            typeSelect.value = 'page';
            fireEvent.change(typeSelect);

            // Attempt to change to post
            typeSelect.value = 'post';
            fireEvent.change(typeSelect);

            // Should revert back to page
            expect(typeSelect.value).toBe('page');
        });
    });

    describe('Version History & Draft Saving', () => {
        it('opens and closes version history modal', async () => {
            const historyBtn = document.querySelector('#btn-history');
            const historyModal = document.querySelector('#history-modal');
            const closeBtn = document.querySelector('#history-close-btn');
            const postIdInput = document.querySelector('#post-id');

            expect(historyBtn).not.toBeNull();
            expect(historyModal).not.toBeNull();
            expect(closeBtn).not.toBeNull();

            // Set an active entry ID
            postIdInput.value = '42';

            // Mock fetch for revisions
            global.fetch = async (url) => {
                if (url.includes('/api/entries/42/revisions')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 1,
                                entry_id: 42,
                                title: 'Older Revision',
                                description: 'Old description',
                                category: 'Tech',
                                tags: 'rust',
                                preview_token: 'prev-tok-123',
                                created_at: '2026-09-20 12:00:00',
                            },
                        ],
                    };
                }
                return { ok: false, json: async () => ({}) };
            };

            fireEvent.click(historyBtn);
            expect(historyModal.style.display).toBe('flex');

            // Wait for mock fetch and render
            await new Promise((r) => setTimeout(r, 10));

            const revTitle = screen.getByText('Older Revision');
            expect(revTitle).not.toBeNull();

            // Close modal
            fireEvent.click(closeBtn);
            expect(historyModal.style.display).toBe('none');
        });

        it('restores content when clicking Restore on a revision', async () => {
            const historyBtn = document.querySelector('#btn-history');
            const postIdInput = document.querySelector('#post-id');
            postIdInput.value = '42';

            const titleInput = document.querySelector('#title');
            const descInput = document.querySelector('#description');
            const statusMsg = document.querySelector('#status-msg');

            global.fetch = async (url) => {
                if (url.includes('/api/entries/42/revisions')) {
                    return {
                        ok: true,
                        json: async () => [
                            {
                                id: 5,
                                entry_id: 42,
                                title: 'Restored Post Title',
                                description: 'Restored Desc',
                                category: 'Restored Cat',
                                tags: 'alpha, beta',
                                preview_token: 'prev-tok-555',
                                created_at: '2026-09-20 14:00:00',
                            },
                        ],
                    };
                }
                if (url.includes('/api/revisions/5')) {
                    return {
                        ok: true,
                        json: async () => ({
                            id: 5,
                            entry_id: 42,
                            title: 'Restored Post Title',
                            description: 'Restored Desc',
                            cover_image: null,
                            category: 'Restored Cat',
                            tags: 'alpha, beta',
                            body_html: '<p>Restored body</p>',
                            body_json: JSON.stringify({ type: 'doc', content: [{ type: 'paragraph', text: 'Restored' }] }),
                            preview_token: 'prev-tok-555',
                            created_at: '2026-09-20 14:00:00',
                        }),
                    };
                }
                return { ok: false, json: async () => ({}) };
            };

            // Open modal
            fireEvent.click(historyBtn);
            await new Promise((r) => setTimeout(r, 10));

            const restoreBtn = screen.getByRole('button', { name: /^Restore$/i });
            expect(restoreBtn).not.toBeNull();

            fireEvent.click(restoreBtn);
            await new Promise((r) => setTimeout(r, 10));

            expect(titleInput.value).toBe('Restored Post Title');
            expect(descInput.value).toBe('Restored Desc');
            expect(statusMsg.textContent).toContain('Restored revision #5');
        });

        it('saves draft revision when clicking Save Draft', async () => {
            const btnSaveDraft = document.querySelector('#btn-save-draft');
            const postIdInput = document.querySelector('#post-id');
            const statusMsg = document.querySelector('#status-msg');
            const previewBtn = document.querySelector('#preview-btn');

            postIdInput.value = '10';

            let capturedPayload = null;
            global.fetch = async (url, options) => {
                if (url.includes('/api/entries/10') && options.method === 'PUT') {
                    capturedPayload = JSON.parse(options.body);
                    return {
                        ok: true,
                        json: async () => ({
                            success: true,
                            id: '10',
                            preview_token: 'draft-token-999',
                            draft_only: true,
                        }),
                    };
                }
                return { ok: false, json: async () => ({}) };
            };

            fireEvent.click(btnSaveDraft);
            await new Promise((r) => setTimeout(r, 10));

            expect(capturedPayload).not.toBeNull();
            expect(capturedPayload.draft_only).toBe(true);
            expect(statusMsg.textContent).toContain('Draft revision saved');
            expect(previewBtn.href).toContain('/preview/draft-token-999');
            expect(previewBtn.style.display).not.toBe('none');
        });

        it('restores entry when clicking Restore Entry on trash banner', async () => {
            const btnRestoreEntry = document.querySelector('#btn-restore-entry');
            const postIdInput = document.querySelector('#post-id');
            postIdInput.value = '42';

            let restoreCalled = false;
            global.fetch = async (url, options) => {
                if (url === '/api/entries/42/restore' && options.method === 'POST') {
                    restoreCalled = true;
                    return {
                        ok: true,
                        json: async () => ({ success: true, restored: '42' }),
                    };
                }
                return { ok: false, json: async () => ({}) };
            };

            expect(btnRestoreEntry).not.toBeNull();
            fireEvent.click(btnRestoreEntry);
            await new Promise((r) => setTimeout(r, 10));

            expect(restoreCalled).toBe(true);
        });
    });
});