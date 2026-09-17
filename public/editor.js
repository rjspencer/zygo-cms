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

        async function fetchMediaList() {
            if (!mediaGrid) return;
            mediaGrid.innerHTML = '<p class="media-loading">Loading media...</p>';
            const token = await getAuthToken();
            const headers = {};
            if (token) headers['Authorization'] = 'Bearer ' + token;

            try {
                const res = await fetch('/api/media', { headers });
                const data = await res.json();
                if (!res.ok) {
                    mediaGrid.innerHTML = `<p class="media-error">Error: ${data.error || 'Failed to load media'}</p>`;
                    return;
                }

                if (!data.media || data.media.length === 0) {
                    mediaGrid.innerHTML = '<p class="media-empty">No media uploaded yet. Click "+ Upload New" above!</p>';
                    return;
                }

                mediaGrid.innerHTML = '';
                data.media.forEach((item) => {
                    const card = document.createElement('div');
                    card.className = 'media-card';
                    const displayName = item.key.replace(/^\d+-/, '');
                    const sizeKb = (item.size / 1024).toFixed(1);

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
                                    mediaGrid.innerHTML = '<p class="media-empty">No media uploaded yet.</p>';
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
            } catch (err) {
                mediaGrid.innerHTML = '<p class="media-error">Network error loading media</p>';
            }
        }

        function openMediaPicker(options) {
            if (!modal) return;
            currentPickerCallback = options ? options.onSelect : null;
            modal.style.display = 'flex';
            fetchMediaList();
        }

        function closeMediaModal() {
            if (!modal) return;
            modal.style.display = 'none';
            currentPickerCallback = null;
            if (modalStatus) modalStatus.textContent = '';
        }

        if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeMediaModal);
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

        const formInputs = ['#title', '#slug', '#description', '#cover-image', '#schema-json', '#type', '#status'];
        formInputs.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) {
                el.addEventListener('input', () => { isDirty = true; });
                el.addEventListener('change', () => { isDirty = true; });
            }
        });

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