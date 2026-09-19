import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import Image from 'https://esm.sh/@tiptap/extension-image';
import { createClient } from 'https://esm.sh/@propelauth/javascript';

export async function initEditor(initialContent, authUrl) {
    let isDirty = false;

    window.addEventListener('beforeunload', (e) => {
        if (isDirty) {
            e.preventDefault();
            e.returnValue = '';
        }
    });

    const setup = async () => {
        // 1. Initialize PropelAuth if configured
        let authClient = null;
        let authInfo = null;

        if (authUrl) {
            authClient = createClient({
                authUrl: authUrl,
                enableBackgroundTokenRefresh: true,
            });

            authInfo = await authClient.getAuthenticationInfoOrNull();

            if (!authInfo) {
                authClient.redirectToLoginPage();
                return;
            }

            const actionsEl = document.querySelector('.actions');
            if (actionsEl) {
                const userBadge = document.createElement('span');
                userBadge.style.marginLeft = 'auto';
                userBadge.style.fontSize = '0.85rem';
                userBadge.style.fontFamily = 'var(--font-headline)';
                userBadge.innerHTML = `Logged in as <strong>${authInfo.user.email}</strong> &bull; <a href="#" id="logout-btn" style="color:#d32f2f;">Log out</a>`;
                actionsEl.appendChild(userBadge);

                const logoutBtn = document.querySelector('#logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        authClient.logout(true);
                    });
                }
            }
        }

        const getAuthToken = async () => {
            if (!authClient) return null;
            const info = await authClient.getAuthenticationInfoOrNull();
            return info ? info.accessToken : null;
        };

        // 2. Initialize TipTap Editor
        const editor = new Editor({
            element: document.querySelector('#editor'),
            extensions: [StarterKit, Image],
            content: initialContent,
        });

        if (typeof editor.on === 'function') {
            editor.on('update', () => { isDirty = true; });
        }

        // Toolbar commands
        const toolbar = document.querySelector('#toolbar');
        if (toolbar) {
            toolbar.addEventListener('click', (e) => {
                const cmd = e.target.getAttribute('data-cmd');
                if (!cmd) return;
                if (cmd === 'bold') editor.chain().focus().toggleBold().run();
                if (cmd === 'italic') editor.chain().focus().toggleItalic().run();
                if (cmd === 'h1') editor.chain().focus().toggleHeading({ level: 1 }).run();
                if (cmd === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                if (cmd === 'bullet') editor.chain().focus().toggleBulletList().run();
                if (cmd === 'quote') editor.chain().focus().toggleBlockquote().run();
                if (cmd === 'code-block') editor.chain().focus().toggleCodeBlock().run();
            });
        }

        // 3. Shared Media Processing & Upload Pipeline
        async function resizeImage(file, maxDimension = 1600, quality = 0.85) {
            if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
                return file;
            }
            try {
                const bitmap = await createImageBitmap(file);
                let { width, height } = bitmap;
                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width);
                        width = maxDimension;
                    } else {
                        width = Math.round((width * maxDimension) / height);
                        height = maxDimension;
                    }
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(bitmap, 0, 0, width, height);
                return new Promise((resolve) => {
                    canvas.toBlob(
                        (blob) => resolve(blob || file),
                        'image/webp',
                        quality
                    );
                });
            } catch {
                return file;
            }
        }

        async function uploadMedia(fileOrBlob, filename) {
            const token = await getAuthToken();
            const headers = { 'Content-Type': fileOrBlob.type || 'image/webp' };
            if (token) {
                headers['Authorization'] = 'Bearer ' + token;
            }
            const res = await fetch('/api/media?filename=' + encodeURIComponent(filename), {
                method: 'POST',
                headers: headers,
                body: fileOrBlob,
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || 'Server error uploading file');
            }
            return data;
        }

        async function optimizeAndUpload(file) {
            const resizedBlob = await resizeImage(file);
            const webpName = file.name.replace(/\.[^/.]+$/, '') + '.webp';
            return await uploadMedia(resizedBlob, webpName);
        }

        // 3a. TipTap Inline Image Upload
        const imageBtn = document.querySelector('#btn-image');
        const imageInput = document.querySelector('#image-input');
        const statusEl = document.querySelector('#status-msg');

        if (imageBtn && imageInput) {
            imageBtn.addEventListener('click', () => imageInput.click());
            imageInput.addEventListener('change', async () => {
                const file = imageInput.files[0];
                if (!file) return;

                if (statusEl) statusEl.textContent = 'Optimizing & uploading image...';
                try {
                    const data = await optimizeAndUpload(file);
                    editor.chain().focus().setImage({ src: data.url, alt: file.name }).run();
                    if (statusEl) statusEl.textContent = 'Image inserted!';
                } catch (err) {
                    if (statusEl) statusEl.textContent = 'Upload failed: ' + err.message;
                }
                imageInput.value = '';
            });
        }

        // 3b. Cover Image Controller
        const coverInput = document.querySelector('#cover-image');
        const coverDropzone = document.querySelector('#cover-dropzone');
        const coverPreviewContainer = document.querySelector('#cover-preview-container');
        const coverPreviewImg = document.querySelector('#cover-preview-img');
        const coverFileInput = document.querySelector('#cover-file-input');
        const btnUploadCover = document.querySelector('#btn-upload-cover');
        const btnReplaceCover = document.querySelector('#btn-replace-cover');
        const btnRemoveCover = document.querySelector('#btn-remove-cover');
        const btnGalleryCover = document.querySelector('#btn-gallery-cover');

        function setCoverImage(url) {
            if (coverInput) coverInput.value = url || '';
            if (url) {
                if (coverPreviewImg) coverPreviewImg.src = url;
                if (coverPreviewContainer) coverPreviewContainer.style.display = 'block';
                if (coverDropzone) coverDropzone.style.display = 'none';
            } else {
                if (coverPreviewImg) coverPreviewImg.src = '';
                if (coverPreviewContainer) coverPreviewContainer.style.display = 'none';
                if (coverDropzone) coverDropzone.style.display = 'block';
            }
        }

        async function handleCoverFileUpload(file) {
            if (!file || !file.type.startsWith('image/')) return;
            if (statusEl) statusEl.textContent = 'Optimizing & uploading cover image...';
            try {
                const data = await optimizeAndUpload(file);
                setCoverImage(data.url);
                if (statusEl) statusEl.textContent = 'Cover image uploaded!';
            } catch (err) {
                if (statusEl) statusEl.textContent = 'Cover upload failed: ' + err.message;
            }
        }

        if (btnUploadCover && coverFileInput) {
            btnUploadCover.addEventListener('click', () => coverFileInput.click());
        }
        if (btnReplaceCover && coverFileInput) {
            btnReplaceCover.addEventListener('click', () => coverFileInput.click());
        }
        if (coverFileInput) {
            coverFileInput.addEventListener('change', () => {
                const file = coverFileInput.files[0];
                if (file) handleCoverFileUpload(file);
                coverFileInput.value = '';
            });
        }
        if (btnRemoveCover) {
            btnRemoveCover.addEventListener('click', () => setCoverImage(''));
        }
        if (coverInput) {
            coverInput.addEventListener('input', () => {
                const val = coverInput.value.trim();
                if (val) setCoverImage(val);
            });
        }

        if (coverDropzone) {
            ['dragenter', 'dragover'].forEach((name) => {
                coverDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    coverDropzone.classList.add('dragover');
                });
            });

            ['dragleave', 'drop'].forEach((name) => {
                coverDropzone.addEventListener(name, (e) => {
                    e.preventDefault();
                    coverDropzone.classList.remove('dragover');
                });
            });

            coverDropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file) handleCoverFileUpload(file);
            });
        }

        // 3c. Media Gallery Modal Controller
        let currentPickerCallback = null;

        const modal = document.querySelector('#media-modal');
        const modalCloseBtn = document.querySelector('#modal-close-btn');
        const mediaGrid = document.querySelector('#media-grid');
        const modalUploadBtn = document.querySelector('#modal-upload-btn');
        const modalFileInput = document.querySelector('#modal-file-input');
        const modalStatus = document.querySelector('#modal-status');
        const modalSyncBtn = document.querySelector('#modal-sync-btn');
        const mediaSearchInput = document.querySelector('#media-search-input');
        const mediaSortSelect = document.querySelector('#media-sort-select');
        const mediaPagination = document.querySelector('#media-pagination');
        const mediaPrevBtn = document.querySelector('#media-prev-btn');
        const mediaPageInfo = document.querySelector('#media-page-info');
        const mediaNextBtn = document.querySelector('#media-next-btn');

        let currentSearch = '';
        let currentSort = 'newest';
        let currentPage = 1;
        const perPage = 24;

        async function fetchMediaList(page = currentPage) {
            if (!mediaGrid) return;
            currentPage = page;
            mediaGrid.innerHTML = '<p class="media-loading">Loading media...</p>';
            const token = await getAuthToken();
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            const params = new URLSearchParams({
                page: currentPage.toString(),
                per_page: perPage.toString(),
                sort: currentSort,
            });
            if (currentSearch.trim()) {
                params.set('search', currentSearch.trim());
            }

            try {
                const res = await fetch('/api/media?' + params.toString(), { headers });
                const data = await res.json();
                if (!res.ok) {
                    mediaGrid.innerHTML = `<p class="media-error">Error: ${data.error || 'Failed to load media'}</p>`;
                    if (mediaPagination) mediaPagination.style.display = 'none';
                    return;
                }

                if (!data.media || data.media.length === 0) {
                    const emptyMsg = currentSearch.trim()
                        ? `No media found matching "${currentSearch.trim()}".`
                        : 'No media uploaded yet. Click "+ Upload New" above!';
                    mediaGrid.innerHTML = `<p class="media-empty">${emptyMsg}</p>`;
                    if (mediaPagination) mediaPagination.style.display = 'none';
                    return;
                }

                mediaGrid.innerHTML = '';
                data.media.forEach((item) => {
                    const card = document.createElement('div');
                    card.className = 'media-card';
                    const displayName = item.filename || item.key.replace(/^\d+-/, '');
                    const sizeBytes = item.size_bytes || item.size || 0;
                    const sizeKb = (sizeBytes / 1024).toFixed(1);

                    card.innerHTML = `
                        <div class="media-thumb-wrapper">
                            <img src="${item.url}" alt="${displayName}" loading="lazy">
                        </div>
                        <div class="media-info">
                            <span class="media-name" title="${displayName}">${displayName}</span>
                            <span class="media-size">${sizeKb} KB</span>
                        </div>
                        <div class="media-card-actions">
                            <button type="button" class="btn-select-media">Select</button>
                            <button type="button" class="btn-delete-media" title="Delete from storage">&times;</button>
                        </div>
                    `;

                    card.querySelector('.btn-select-media').addEventListener('click', (e) => {
                        e.stopPropagation();
                        if (currentPickerCallback) currentPickerCallback(item.url);
                        closeMediaModal();
                    });

                    card.addEventListener('click', () => {
                        if (currentPickerCallback) currentPickerCallback(item.url);
                        closeMediaModal();
                    });

                    card.querySelector('.btn-delete-media').addEventListener('click', async (e) => {
                        e.stopPropagation();
                        if (!confirm(`Permanently delete "${displayName}" from storage?`)) return;

                        const curToken = await getAuthToken();
                        if (!curToken) {
                            alert('Please log in to delete images');
                            return;
                        }
                        const delHeaders = {};
                        if (curToken) delHeaders['Authorization'] = 'Bearer ' + curToken;
                        try {
                            const delRes = await fetch(`/api/media/${encodeURIComponent(item.key)}`, {
                                method: 'DELETE',
                                headers: delHeaders,
                            });
                            if (delRes.ok) {
                                card.remove();
                                if (mediaGrid.children.length === 0) {
                                    fetchMediaList(currentPage > 1 ? currentPage - 1 : 1);
                                }
                            } else {
                                alert('Failed to delete image');
                            }
                        } catch {
                            alert('Network error deleting image');
                        }
                    });

                    mediaGrid.appendChild(card);
                });

                // Update pagination controls
                if (mediaPagination && data.pagination) {
                    const { page: curPage, total_pages: totalPages, total_items: totalItems } = data.pagination;
                    if (totalPages > 1) {
                        mediaPagination.style.display = 'flex';
                        if (mediaPageInfo) mediaPageInfo.textContent = `Page ${curPage} of ${totalPages} (${totalItems} items)`;
                        if (mediaPrevBtn) mediaPrevBtn.disabled = curPage <= 1;
                        if (mediaNextBtn) mediaNextBtn.disabled = curPage >= totalPages;
                    } else {
                        mediaPagination.style.display = 'none';
                    }
                } else if (mediaPagination) {
                    mediaPagination.style.display = 'none';
                }
            } catch (err) {
                mediaGrid.innerHTML = '<p class="media-error">Network error loading media</p>';
                if (mediaPagination) mediaPagination.style.display = 'none';
            }
        }

        function openMediaPicker(options) {
            if (!modal) return;
            currentPickerCallback = options ? options.onSelect : null;
            modal.style.display = 'flex';
            currentPage = 1;
            if (mediaSearchInput) mediaSearchInput.value = currentSearch;
            if (mediaSortSelect) mediaSortSelect.value = currentSort;
            fetchMediaList(1);
        }

        function closeMediaModal() {
            if (!modal) return;
            modal.style.display = 'none';
            currentPickerCallback = null;
            if (modalStatus) modalStatus.textContent = '';
        }

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeMediaModal);

        if (modalSyncBtn) {
            modalSyncBtn.addEventListener('click', async () => {
                const curToken = await getAuthToken();
                if (!curToken) {
                    alert('Please log in to sync media');
                    return;
                }
                if (modalStatus) {
                    modalStatus.textContent = 'Syncing bucket...';
                    modalStatus.style.color = '#555';
                }
                modalSyncBtn.disabled = true;
                try {
                    const res = await fetch('/api/media/sync', {
                        method: 'POST',
                        headers: { 'Authorization': 'Bearer ' + curToken },
                    });
                    const data = await res.json();
                    if (res.ok) {
                        if (modalStatus) {
                            const count = data.synced || 0;
                            modalStatus.textContent = `Synced ${count} new item(s) (${data.total_r2_objects || 0} total in R2)`;
                            modalStatus.style.color = '#2e7d32';
                        }
                        currentPage = 1;
                        await fetchMediaList(1);
                    } else {
                        if (modalStatus) {
                            modalStatus.textContent = `Sync failed: ${data.error || 'Server error'}`;
                            modalStatus.style.color = '#d32f2f';
                        }
                    }
                } catch {
                    if (modalStatus) {
                        modalStatus.textContent = 'Network error during sync';
                        modalStatus.style.color = '#d32f2f';
                    }
                } finally {
                    modalSyncBtn.disabled = false;
                }
            });
        }

        let searchDebounce = null;
        if (mediaSearchInput) {
            mediaSearchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounce);
                searchDebounce = setTimeout(() => {
                    currentSearch = e.target.value;
                    currentPage = 1;
                    fetchMediaList(1);
                }, 250);
            });
        }

        if (mediaSortSelect) {
            mediaSortSelect.addEventListener('change', (e) => {
                currentSort = e.target.value;
                currentPage = 1;
                fetchMediaList(1);
            });
        }

        if (mediaPrevBtn) {
            mediaPrevBtn.addEventListener('click', () => {
                if (currentPage > 1) fetchMediaList(currentPage - 1);
            });
        }

        if (mediaNextBtn) {
            mediaNextBtn.addEventListener('click', () => {
                fetchMediaList(currentPage + 1);
            });
        }
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) closeMediaModal();
            });
        }

        if (modalUploadBtn && modalFileInput) {
            modalUploadBtn.addEventListener('click', () => modalFileInput.click());
            modalFileInput.addEventListener('change', async () => {
                const file = modalFileInput.files[0];
                if (!file) return;

                if (modalStatus) modalStatus.textContent = 'Optimizing & uploading...';
                try {
                    const data = await optimizeAndUpload(file);
                    if (modalStatus) modalStatus.textContent = 'Uploaded!';
                    if (currentPickerCallback) {
                        currentPickerCallback(data.url);
                        closeMediaModal();
                    } else {
                        fetchMediaList();
                    }
                } catch (err) {
                    if (modalStatus) modalStatus.textContent = 'Upload failed: ' + err.message;
                }
                modalFileInput.value = '';
            });
        }

        window.openMediaPicker = openMediaPicker;

        if (btnGalleryCover) {
            btnGalleryCover.addEventListener('click', () => {
                openMediaPicker({ onSelect: setCoverImage });
            });
        }

        const btnGallery = document.querySelector('#btn-gallery');
        if (btnGallery) {
            btnGallery.addEventListener('click', () => {
                openMediaPicker({
                    onSelect: (url) => {
                        editor.chain().focus().setImage({ src: url }).run();
                    },
                });
            });
        }

        // 4. Form Submission with Auth
        const form = document.querySelector('#post-form');
        const postIdEl = document.querySelector('#post-id');
        const postId = postIdEl ? postIdEl.value : '';

        const formInputs = ['#title', '#slug', '#description', '#cover-image', '#canonical-url', '#category', '#tags', '#schema-json', '#type', '#status', '#parent-id', '#sort-order'];
        formInputs.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.addEventListener('input', () => { isDirty = true; });
                el.addEventListener('change', () => { isDirty = true; });
            }
        });

        const typeSelect = document.querySelector('#type');
        const pageHierarchyFields = document.querySelector('#page-hierarchy-fields');
        const updateHierarchyVisibility = () => {
            if (pageHierarchyFields && typeSelect) {
                pageHierarchyFields.style.display = typeSelect.value === 'page' ? 'block' : 'none';
            }
        };
        if (typeSelect) {
            typeSelect.addEventListener('change', (e) => {
                if (form && form.dataset.hasChildren === 'true' && typeSelect.value !== 'page') {
                    const count = form.dataset.childCount || '1';
                    const msg = `Cannot change this page to a post because it has ${count} active subpage(s). Move or delete its subpages first.`;
                    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                        window.alert(msg);
                    }
                    typeSelect.value = 'page';
                    updateHierarchyVisibility();
                    return;
                }
                updateHierarchyVisibility();
            });
            updateHierarchyVisibility();
        }

        // Prepopulate parent page if navigated via ?parent_id=...
        const urlParams = new URLSearchParams(window.location.search);
        const preselectedParent = urlParams.get('parent_id');
        const postIdInput = document.querySelector('#post-id');
        if (preselectedParent && (!postIdInput || !postIdInput.value)) {
            if (typeSelect) {
                typeSelect.value = 'page';
                updateHierarchyVisibility();
            }
            const parentSelect = document.querySelector('#parent-id');
            if (parentSelect) {
                parentSelect.value = preselectedParent;
            }
        }

        // Handle Delete button if present
        const deleteBtn = document.querySelector('#delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                if (deleteBtn.disabled) return;

                const currentPostId = postIdInput ? postIdInput.value : '';
                const currentTitle = document.querySelector('#title')?.value || 'this entry';
                if (!currentPostId) return;

                const confirmMsg = `Are you sure you want to permanently delete "${currentTitle}"? This cannot be undone.`;
                const isConfirmed = typeof window !== 'undefined' && typeof window.confirm === 'function'
                    ? window.confirm(confirmMsg)
                    : true;
                if (!isConfirmed) return;

                deleteBtn.disabled = true;
                deleteBtn.textContent = 'Deleting...';

                const token = await getAuthToken();
                const headers = {};
                if (token) headers['Authorization'] = 'Bearer ' + token;

                try {
                    const res = await fetch('/entries/' + currentPostId, {
                        method: 'DELETE',
                        headers,
                    });
                    if (res.ok) {
                        isDirty = false;
                        window.location.href = '/admin';
                    } else {
                        const data = await res.json().catch(() => ({}));
                        const errMsg = data.error || 'Server error';
                        if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                            window.alert('Failed to delete: ' + errMsg);
                        }
                        deleteBtn.disabled = false;
                        deleteBtn.textContent = 'Delete Entry';
                    }
                } catch (err) {
                    if (typeof window !== 'undefined' && typeof window.alert === 'function') {
                        window.alert('Network error deleting entry');
                    }
                    deleteBtn.disabled = false;
                    deleteBtn.textContent = 'Delete Entry';
                }
            });
        }

        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                // Prevent submission if JSON-LD has errors
                if (!validateSchema()) {
                    if (statusEl) statusEl.textContent = 'Cannot save: please fix JSON-LD syntax errors first.';
                    return;
                }

                if (statusEl) statusEl.textContent = 'Saving...';

                const token = await getAuthToken();
                const headers = { 'Content-Type': 'application/json' };
                if (token) {
                    headers['Authorization'] = 'Bearer ' + token;
                }

                const title = document.querySelector('#title')?.value || '';
                const slug = document.querySelector('#slug')?.value || '';
                const type = document.querySelector('#type')?.value || 'post';
                const status = document.querySelector('#status')?.value || 'published';
                const description = document.querySelector('#description')?.value.trim() || null;
                const cover_image = document.querySelector('#cover-image')?.value.trim() || null;
                const canonical_url = document.querySelector('#canonical-url')?.value.trim() || null;
                const schema_json = document.querySelector('#schema-json')?.value.trim() || null;
                const category = document.querySelector('#category')?.value.trim() || null;
                const tags = document.querySelector('#tags')?.value.trim() || null;

                let parent_id = null;
                let sort_order = null;
                if (type === 'page') {
                    const parentVal = document.querySelector('#parent-id')?.value;
                    parent_id = parentVal && parentVal !== '' ? parseInt(parentVal, 10) : null;
                    const sortVal = document.querySelector('#sort-order')?.value;
                    sort_order = sortVal && sortVal !== '' ? parseInt(sortVal, 10) : 0;
                }

                const body_html = editor.getHTML();
                const body_json = JSON.stringify(editor.getJSON());

                const payload = {
                    title,
                    type,
                    status,
                    description,
                    cover_image,
                    canonical_url,
                    schema_json,
                    category,
                    tags,
                    parent_id,
                    sort_order,
                    body_html,
                    body_json,
                };

                try {
                    let res;
                    if (postId) {
                        res = await fetch('/entries/' + postId, {
                            method: 'PUT',
                            headers: headers,
                            body: JSON.stringify(payload),
                        });
                    } else {
                        res = await fetch('/entries', {
                            method: 'POST',
                            headers: headers,
                            body: JSON.stringify({ slug, ...payload }),
                        });
                    }

                    const data = await res.json();
                    if (res.ok) {
                        isDirty = false;
                        if (statusEl) statusEl.textContent = 'Saved successfully! Slug: ' + (data.slug || slug);
                    } else {
                        if (statusEl) statusEl.textContent = 'Error: ' + (data.error || 'Failed to save');
                    }
                } catch (err) {
                    if (statusEl) statusEl.textContent = 'Network error saving entry';
                }
            });
        }

        // 5. Schema JSON-LD formatting and live validation
        const schemaInput = document.querySelector('#schema-json');
        const schemaStatus = document.querySelector('#schema-status');
        const btnFormat = document.querySelector('#btn-format-schema');
        const btnDefault = document.querySelector('#btn-default-schema');
        const btnClear = document.querySelector('#btn-clear-schema');

        const validateSchema = () => {
            if (!schemaInput || !schemaStatus) return true;
            const val = schemaInput.value.trim();
            if (!val) {
                schemaStatus.innerHTML = 'Optional &mdash; leave empty to auto-generate standard Schema.org BlogPosting';
                schemaStatus.className = 'json-status';
                schemaInput.classList.remove('has-error');
                return true;
            }
            try {
                JSON.parse(val);
                schemaStatus.textContent = '✓ Valid JSON-LD';
                schemaStatus.className = 'json-status is-valid';
                schemaInput.classList.remove('has-error');
                return true;
            } catch (err) {
                schemaStatus.textContent = `✗ Invalid JSON: ${err.message}`;
                schemaStatus.className = 'json-status is-error';
                schemaInput.classList.add('has-error');
                return false;
            }
        };

        if (schemaInput) {
            // Auto-format nicely on initial page load if content exists
            if (schemaInput.value.trim()) {
                try {
                    schemaInput.value = JSON.stringify(JSON.parse(schemaInput.value), null, 2);
                } catch (_) { }
            }
            validateSchema();
            schemaInput.addEventListener('input', validateSchema);

            // Tab key indents by 2 spaces instead of moving focus
            schemaInput.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const start = schemaInput.selectionStart;
                    const end = schemaInput.selectionEnd;
                    schemaInput.value = schemaInput.value.substring(0, start) + '  ' + schemaInput.value.substring(end);
                    schemaInput.selectionStart = schemaInput.selectionEnd = start + 2;
                    validateSchema();
                }
            });
        }

        btnFormat?.addEventListener('click', () => {
            const val = schemaInput.value.trim();
            if (!val) return;
            try {
                schemaInput.value = JSON.stringify(JSON.parse(val), null, 2);
                validateSchema();
            } catch (_) {
                validateSchema();
            }
        });

        btnDefault?.addEventListener('click', () => {
            const title = document.querySelector('#title')?.value || 'Post Title';
            const desc = document.querySelector('#description')?.value || '';
            const cover = document.querySelector('#cover-image')?.value || '';
            const type = document.querySelector('#type')?.value || 'post';

            const defaultJson = {
                "@context": "https://schema.org",
                "@type": type === "post" ? "BlogPosting" : "WebPage",
                "headline": title,
                ...(desc ? { "description": desc } : {}),
                ...(cover ? { "image": cover } : {})
            };
            schemaInput.value = JSON.stringify(defaultJson, null, 2);
            validateSchema();
        });

        btnClear?.addEventListener('click', () => {
            schemaInput.value = '';
            validateSchema();
        });

    };

    // DOM readiness check (fires immediately if ready, or waits for DOMContentLoaded)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setup);
    } else {
        await setup();
    }
}