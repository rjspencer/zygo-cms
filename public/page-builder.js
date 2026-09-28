import { Editor } from 'https://esm.sh/@tiptap/core';
import StarterKit from 'https://esm.sh/@tiptap/starter-kit';
import Image from 'https://esm.sh/@tiptap/extension-image';
import Sortable from 'https://esm.sh/sortablejs';

const blockTemplates = {
    blank: {
        name: 'Blank (Rich Text)',
        defaultData: { content: '{"type":"doc","content":[{"type":"paragraph"}]}' },
        renderForm: (data, id) => `
            <div id="pb-tiptap-toolbar-${id}" class="toolbar" style="margin-bottom:0.5rem; border:1px solid #cbd5e1; border-bottom:none; border-radius:4px 4px 0 0;">
                <button type="button" data-cmd="bold">B</button>
                <button type="button" data-cmd="italic">I</button>
                <button type="button" data-cmd="h2">H2</button>
                <button type="button" data-cmd="h3">H3</button>
                <button type="button" data-cmd="bullet">List</button>
            </div>
            <div id="pb-tiptap-editor-${id}" style="border: 1px solid #cbd5e1; border-radius: 0 0 4px 4px; background: white; padding: 1rem; min-height: 200px;"></div>
        `,
        initForm: (data, id, updateData) => {
            const editor = new Editor({
                element: document.querySelector(`#pb-tiptap-editor-${id}`),
                extensions: [StarterKit, Image],
                content: typeof data.content === 'string' ? JSON.parse(data.content) : data.content,
                onUpdate: ({ editor }) => {
                    updateData({ content: JSON.stringify(editor.getJSON()), html: editor.getHTML() });
                }
            });
            const toolbar = document.querySelector(`#pb-tiptap-toolbar-${id}`);
            toolbar.addEventListener('click', (e) => {
                const cmd = e.target.getAttribute('data-cmd');
                if (cmd === 'bold') editor.chain().focus().toggleBold().run();
                if (cmd === 'italic') editor.chain().focus().toggleItalic().run();
                if (cmd === 'h2') editor.chain().focus().toggleHeading({ level: 2 }).run();
                if (cmd === 'h3') editor.chain().focus().toggleHeading({ level: 3 }).run();
                if (cmd === 'bullet') editor.chain().focus().toggleBulletList().run();
            });
            return () => editor.destroy();
        },
        renderHTML: (data) => data.html || ''
    },
    hero: {
        name: 'Hero Section',
        defaultData: { headline: '', subheadline: '', ctaText: '', ctaLink: '', imageUrl: '' },
        renderForm: (data, id) => `
            <label class="pb-label">Headline</label>
            <input type="text" class="pb-input" id="pb-hero-hl-${id}" value="${data.headline || ''}">
            
            <label class="pb-label">Subheadline</label>
            <textarea class="pb-input" id="pb-hero-sub-${id}" rows="3">${data.subheadline || ''}</textarea>
            
            <label class="pb-label">Button Text</label>
            <input type="text" class="pb-input" id="pb-hero-btn-txt-${id}" value="${data.ctaText || ''}">
            
            <label class="pb-label">Button Link</label>
            <input type="text" class="pb-input" id="pb-hero-btn-link-${id}" value="${data.ctaLink || ''}">
            
            <label class="pb-label">Background/Side Image</label>
            <button type="button" class="pb-media-picker-btn" id="pb-hero-img-btn-${id}">Select Image</button>
            <input type="text" class="pb-input" id="pb-hero-img-${id}" value="${data.imageUrl || ''}" placeholder="Image URL">
        `,
        initForm: (data, id, updateData) => {
            const hl = document.querySelector(`#pb-hero-hl-${id}`);
            const sub = document.querySelector(`#pb-hero-sub-${id}`);
            const txt = document.querySelector(`#pb-hero-btn-txt-${id}`);
            const link = document.querySelector(`#pb-hero-btn-link-${id}`);
            const img = document.querySelector(`#pb-hero-img-${id}`);
            const imgBtn = document.querySelector(`#pb-hero-img-btn-${id}`);

            const onChange = () => updateData({
                headline: hl.value, subheadline: sub.value, ctaText: txt.value, ctaLink: link.value, imageUrl: img.value
            });

            [hl, sub, txt, link, img].forEach(el => el.addEventListener('input', onChange));
            
            imgBtn.addEventListener('click', () => {
                if (window.openMediaPicker) {
                    window.openMediaPicker({ onSelect: (url) => { img.value = url; onChange(); } });
                }
            });
        },
        renderHTML: (data) => `
            <div class="hero-block">
                <div class="hero-container">
                    <div class="hero-content">
                        ${data.headline ? `<h1 class="hero-headline">${data.headline}</h1>` : ''}
                        ${data.subheadline ? `<p class="hero-subheadline">${data.subheadline}</p>` : ''}
                        ${data.ctaText ? `<a href="${data.ctaLink || '#'}" class="hero-btn">${data.ctaText}</a>` : ''}
                    </div>
                    ${data.imageUrl ? `<div class="hero-image-wrapper"><img src="${data.imageUrl}" class="hero-image" alt=""></div>` : ''}
                </div>
            </div>
        `
    },
    gallery: {
        name: 'Image Gallery',
        defaultData: { images: [] },
        renderForm: (data, id) => `
            <label class="pb-label">Images</label>
            <div id="pb-gal-list-${id}" class="pb-gallery-list"></div>
            <button type="button" class="pb-media-picker-btn" id="pb-gal-add-${id}" style="margin-top:0.5rem;">Add Image</button>
        `,
        initForm: (data, id, updateData) => {
            const addBtn = document.querySelector(`#pb-gal-add-${id}`);
            const listEl = document.querySelector(`#pb-gal-list-${id}`);
            
            const reRenderList = () => {
                listEl.innerHTML = data.images.map((url, i) => `
                    <div class="pb-gal-item" data-index="${i}" style="display:flex; gap:0.5rem; align-items:center; margin-bottom:0.5rem;">
                        <img src="${url}" style="height:40px; width:40px; object-fit:cover; border-radius:4px;">
                        <input type="text" class="pb-input pb-gal-input" value="${url}" readonly style="flex:1;">
                        <button type="button" class="pb-delete-btn pb-gal-del" data-index="${i}" style="color:red; background:none; border:none; cursor:pointer; font-size:1.2rem;">&times;</button>
                    </div>
                `).join('');
                
                listEl.querySelectorAll('.pb-gal-del').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const idx = parseInt(e.target.getAttribute('data-index'), 10);
                        data.images.splice(idx, 1);
                        updateData({ images: data.images });
                        reRenderList();
                    });
                });
            };
            
            reRenderList();
            
            addBtn.addEventListener('click', () => {
                if (window.openMediaPicker) {
                    window.openMediaPicker({ onSelect: (url) => { 
                        data.images.push(url);
                        updateData({ images: data.images });
                        reRenderList();
                    } });
                }
            });
        },
        renderHTML: (data) => `
            <div class="gallery-block">
                <div class="gallery-grid">
                    ${data.images.map(url => `
                        <div class="gallery-item">
                            <img src="${url}" alt="">
                        </div>
                    `).join('')}
                </div>
            </div>
        `
    },
    'image-text': {
        name: 'Image Left / Text Right',
        defaultData: { headline: '', text: '', imageUrl: '', reverse: false },
        renderForm: (data, id) => `
            <label class="pb-label">Headline</label>
            <input type="text" class="pb-input" id="pb-it-hl-${id}" value="${data.headline || ''}">
            
            <label class="pb-label">Text</label>
            <textarea class="pb-input" id="pb-it-txt-${id}" rows="5">${data.text || ''}</textarea>
            
            <label class="pb-label">Image</label>
            <button type="button" class="pb-media-picker-btn" id="pb-it-img-btn-${id}">Select Image</button>
            <input type="text" class="pb-input" id="pb-it-img-${id}" value="${data.imageUrl || ''}" placeholder="Image URL">
            
            <label class="pb-label" style="display:flex; align-items:center; gap:0.5rem; margin-top:1rem;">
                <input type="checkbox" id="pb-it-rev-${id}" ${data.reverse ? 'checked' : ''}>
                Reverse (Image on Right)
            </label>
        `,
        initForm: (data, id, updateData) => {
            const hl = document.querySelector(`#pb-it-hl-${id}`);
            const txt = document.querySelector(`#pb-it-txt-${id}`);
            const img = document.querySelector(`#pb-it-img-${id}`);
            const imgBtn = document.querySelector(`#pb-it-img-btn-${id}`);
            const rev = document.querySelector(`#pb-it-rev-${id}`);

            const onChange = () => updateData({
                headline: hl.value, text: txt.value, imageUrl: img.value, reverse: rev.checked
            });

            [hl, txt, img, rev].forEach(el => el.addEventListener('change', onChange));
            [hl, txt, img].forEach(el => el.addEventListener('input', onChange));
            
            imgBtn.addEventListener('click', () => {
                if (window.openMediaPicker) {
                    window.openMediaPicker({ onSelect: (url) => { img.value = url; onChange(); } });
                }
            });
        },
        renderHTML: (data) => `
            <div class="image-text-block ${data.reverse ? 'reversed' : ''}">
                <div class="it-image-wrapper">
                    ${data.imageUrl ? `<img src="${data.imageUrl}" class="it-image" alt="">` : ''}
                </div>
                <div class="it-content">
                    ${data.headline ? `<h2 class="it-headline">${data.headline}</h2>` : ''}
                    ${data.text ? `<p class="it-text">${data.text}</p>` : ''}
                </div>
            </div>
        `
    }
};

let pageBlocks = [];
let activeBlockId = null;
let currentEditorCleanup = null;
let onDirtyCallback = null;

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

export function initPageBuilder(initialData, onDirty) {
    onDirtyCallback = onDirty;
    if (Array.isArray(initialData)) {
        pageBlocks = initialData;
    } else if (initialData && initialData.type === 'doc') {
        // Migration from old tip tap page
        pageBlocks = [{ id: generateId(), type: 'blank', data: { content: JSON.stringify(initialData), html: '' } }];
    } else {
        pageBlocks = [];
    }

    renderBlockList();

    const addSelect = document.getElementById('pb-add-select');
    addSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        if (type && blockTemplates[type]) {
            addBlock(type);
            addSelect.value = '';
        }
    });

    document.getElementById('pb-close-panel').addEventListener('click', () => {
        closeBlockEditor();
    });

    const listEl = document.getElementById('pb-block-list');
    Sortable.create(listEl, {
        animation: 150,
        handle: '.pb-block-item',
        onEnd: (evt) => {
            const item = pageBlocks.splice(evt.oldIndex, 1)[0];
            pageBlocks.splice(evt.newIndex, 0, item);
            if (onDirtyCallback) onDirtyCallback();
        }
    });
}

function renderBlockList() {
    const listEl = document.getElementById('pb-block-list');
    listEl.innerHTML = '';
    
    pageBlocks.forEach(block => {
        const tpl = blockTemplates[block.type];
        const el = document.createElement('div');
        el.className = `pb-block-item ${block.id === activeBlockId ? 'active' : ''}`;
        el.innerHTML = `
            <span class="pb-block-title">${tpl ? tpl.name : 'Unknown'}</span>
            <div class="pb-block-actions">
                <button type="button" class="pb-delete-btn" data-id="${block.id}">&times;</button>
            </div>
        `;
        el.addEventListener('click', (e) => {
            if (e.target.classList.contains('pb-delete-btn')) {
                e.stopPropagation();
                if (confirm('Delete this block?')) {
                    deleteBlock(block.id);
                }
            } else {
                openBlockEditor(block.id);
            }
        });
        listEl.appendChild(el);
    });
}

function addBlock(type) {
    const id = generateId();
    pageBlocks.push({
        id,
        type,
        data: JSON.parse(JSON.stringify(blockTemplates[type].defaultData))
    });
    if (onDirtyCallback) onDirtyCallback();
    renderBlockList();
    openBlockEditor(id);
}

function deleteBlock(id) {
    pageBlocks = pageBlocks.filter(b => b.id !== id);
    if (activeBlockId === id) {
        closeBlockEditor();
    }
    if (onDirtyCallback) onDirtyCallback();
    renderBlockList();
}

function openBlockEditor(id) {
    activeBlockId = id;
    renderBlockList(); // update active class
    
    const block = pageBlocks.find(b => b.id === id);
    if (!block) return;
    
    const tpl = blockTemplates[block.type];
    
    document.getElementById('pb-editor-panel').style.display = 'flex';
    document.getElementById('pb-panel-title').textContent = `Edit ${tpl.name}`;
    
    const contentEl = document.getElementById('pb-panel-content');
    
    if (currentEditorCleanup) {
        currentEditorCleanup();
        currentEditorCleanup = null;
    }
    
    contentEl.innerHTML = tpl.renderForm(block.data, block.id);
    
    currentEditorCleanup = tpl.initForm(block.data, block.id, (newData) => {
        block.data = { ...block.data, ...newData };
        if (onDirtyCallback) onDirtyCallback();
    });
}

function closeBlockEditor() {
    activeBlockId = null;
    document.getElementById('pb-editor-panel').style.display = 'none';
    if (currentEditorCleanup) {
        currentEditorCleanup();
        currentEditorCleanup = null;
    }
    renderBlockList();
}

export function getPageBuilderJSON() {
    return pageBlocks;
}

export function getPageBuilderHTML() {
    return pageBlocks.map(block => {
        const tpl = blockTemplates[block.type];
        return tpl ? tpl.renderHTML(block.data) : '';
    }).join('\n');
}
