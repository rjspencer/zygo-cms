import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { Editor } from '../pages/Editor';

const renderEditor = (initialPath = '/editor') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Theme>
        <Routes>
          <Route path="/editor" element={<Editor />} />
          <Route path="/editor/:id" element={<Editor />} />
        </Routes>
      </Theme>
    </MemoryRouter>
  );
};

describe('Editor Component - Phase 1 Refinements', () => {
  describe('Top Navigation Bar', () => {
    it('renders the Back button, Save Draft, and Publish buttons in the top row with space-between layout', () => {
      renderEditor();
      const backButton = screen.getByRole('button', { name: /back/i });
      const saveButton = screen.getByRole('button', { name: /save draft/i });
      const publishButton = screen.getByRole('button', { name: /publish/i });

      expect(backButton).toBeDefined();
      expect(saveButton).toBeDefined();
      expect(publishButton).toBeDefined();

      // Verify that Back and action buttons share the same parent row container
      const topNavRow = backButton.closest('.rt-Flex');
      expect(topNavRow).toBeDefined();
      expect(topNavRow?.contains(saveButton)).toBe(true);
      expect(topNavRow?.contains(publishButton)).toBe(true);
      expect(topNavRow?.className).toContain('rt-r-jc-space-between');
    });
  });

  describe('Inline-Editable Title Toggle', () => {
    it('renders the title as regular text in default mode with prominent styling and an edit icon button', () => {
      renderEditor();

      // Default mode displays regular text (e.g. "Untitled")
      const titleHeading = screen.getByRole('heading', { level: 1 });
      expect(titleHeading).toBeDefined();
      expect(titleHeading.textContent).toBe('Untitled');

      // Check prominent styling and padding matching text input
      const style = titleHeading.getAttribute('style') || '';
      expect(style).toContain('font-size: 1.5rem');
      expect(style).toContain('font-weight: bold');
      expect(style).toContain('padding: 5px 0px');

      // Edit icon button is present to the right
      const editButton = screen.getByRole('button', { name: /edit title/i });
      expect(editButton).toBeDefined();

      // Editable TextField should not be displayed in default mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();
    });

    it('toggles to edit mode on edit icon click, revealing the input and save/cancel buttons', () => {
      renderEditor();

      const editButton = screen.getByRole('button', { name: /edit title/i });
      fireEvent.click(editButton);

      // Input appears
      const titleInput = screen.getByPlaceholderText('Enter title here...');
      expect(titleInput).toBeDefined();

      // Save/Check and Cancel icon buttons appear
      const checkButton = screen.getByRole('button', { name: /save title/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(checkButton).toBeDefined();
      expect(cancelButton).toBeDefined();

      // Edit button is hidden while in edit mode
      expect(screen.queryByRole('button', { name: /edit title/i })).toBeNull();
    });

    it('commits the new title and auto-generates slug when clicking the Save/Check button', () => {
      renderEditor();

      // Enter edit mode
      fireEvent.click(screen.getByRole('button', { name: /edit title/i }));

      const titleInput = screen.getByPlaceholderText('Enter title here...') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'New Test Post Title' } });

      // Click Save/Check
      const checkButton = screen.getByRole('button', { name: /save title/i });
      fireEvent.click(checkButton);

      // Exited edit mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();

      // Heading now displays new title
      const titleHeading = screen.getByRole('heading', { level: 1 });
      expect(titleHeading.textContent).toBe('New Test Post Title');

      // Auto-generated slug is updated
      const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
      expect(slugInput.value).toBe('new-test-post-title');
    });

    it('reverts to the original title value and does not update slug when clicking Cancel', () => {
      renderEditor();

      // First set a known title
      fireEvent.click(screen.getByRole('button', { name: /edit title/i }));
      fireEvent.change(screen.getByPlaceholderText('Enter title here...'), {
        target: { value: 'Original Title' },
      });
      fireEvent.click(screen.getByRole('button', { name: /save title/i }));

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Original Title');
      const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
      expect(slugInput.value).toBe('original-title');

      // Start editing again, change text, then cancel
      fireEvent.click(screen.getByRole('button', { name: /edit title/i }));
      const titleInput = screen.getByPlaceholderText('Enter title here...') as HTMLInputElement;
      fireEvent.change(titleInput, { target: { value: 'Discarded Title Edit' } });

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      // Exited edit mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();

      // Title reverted to Original Title
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Original Title');

      // Slug unchanged
      expect(slugInput.value).toBe('original-title');
    });

    it('ensures all icon buttons only display icons and have accessible attributes', () => {
      renderEditor();

      // In default mode
      const editButton = screen.getByRole('button', { name: /edit title/i });
      expect(editButton.getAttribute('aria-label')).toBe('Edit title');
      expect(editButton.getAttribute('title')).toBe('Edit title');
      expect(editButton.querySelector('svg')).toBeDefined();
      expect(editButton.textContent).toBe('');

      // Enter edit mode
      fireEvent.click(editButton);

      const checkButton = screen.getByRole('button', { name: /save title/i });
      expect(checkButton.getAttribute('aria-label')).toBe('Save title');
      expect(checkButton.getAttribute('title')).toBe('Save title');
      expect(checkButton.querySelector('svg')).toBeDefined();
      expect(checkButton.textContent).toBe('');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton.getAttribute('aria-label')).toBe('Cancel');
      expect(cancelButton.getAttribute('title')).toBe('Cancel');
      expect(cancelButton.querySelector('svg')).toBeDefined();
      expect(cancelButton.textContent).toBe('');
    });
  });

  describe('Content Tab Integrity', () => {
    it('removes the redundant title input from the content tab', () => {
      renderEditor();
      // In default mode, no title inputs exist
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();

      // Verify there is no separate "Title" label text in the content tab
      const titleLabels = screen.queryAllByText('Title');
      expect(titleLabels).toHaveLength(0);
    });
  });
});

describe('Editor Component - Phase 2 Image Gallery Integration', () => {
  const mockMediaResponse = {
    media: [
      {
        id: 1,
        key: 'test-photo.png',
        filename: 'test-photo.png',
        mime_type: 'image/png',
        size_bytes: 1024,
        size: 1024,
        url: '/media/test-photo.png',
        created_at: '2026-09-27 12:00:00',
      },
    ],
    pagination: { page: 1, per_page: 20, total_items: 1, total_pages: 1 },
  };

  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMediaResponse),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Cover Image Selection', () => {
    it('opens MediaPickerModal, selects an image, updates cover image, and allows removal', async () => {
      renderEditor();

      // Switch to Metadata tab
      const metadataTab = screen.getByRole('tab', { name: /metadata/i });
      fireEvent.mouseDown(metadataTab, { button: 0, ctrlKey: false });

      // Verify "Select Image" button is rendered
      const selectImageButton = screen.getByRole('button', { name: /select image/i });
      expect(selectImageButton).toBeDefined();

      // Open media picker modal
      fireEvent.click(selectImageButton);

      // Verify modal opened and fetched media
      expect(await screen.findByText('Select Media')).toBeDefined();
      expect(await screen.findByText('test-photo.png')).toBeDefined();

      // Pick the image
      const pickButton = screen.getByRole('button', { name: /select test-photo\.png/i });
      fireEvent.click(pickButton);

      // Verify modal is closed
      await waitFor(() => {
        expect(screen.queryByText('Select Media')).toBeNull();
      });

      // Verify cover image state is updated and displayed
      expect(screen.getByText('/media/test-photo.png')).toBeDefined();

      // Verify Remove button clears the cover image
      const removeButton = screen.getByRole('button', { name: /remove/i });
      fireEvent.click(removeButton);
      expect(screen.queryByText('/media/test-photo.png')).toBeNull();
    });
  });

  describe('Inline Content Insertion', () => {
    it('appends markdown image syntax to the content textarea when picking an image', async () => {
      renderEditor();

      // Content tab is active by default
      const insertImageButton = screen.getByRole('button', { name: /insert image/i });
      expect(insertImageButton).toBeDefined();

      // Click Insert Image
      fireEvent.click(insertImageButton);

      // Verify modal opens and media is displayed
      expect(await screen.findByText('Select Media')).toBeDefined();
      expect(await screen.findByText('test-photo.png')).toBeDefined();

      // Select the image
      const pickButton = screen.getByRole('button', { name: /select test-photo\.png/i });
      fireEvent.click(pickButton);

      // Modal closes
      await waitFor(() => {
        expect(screen.queryByText('Select Media')).toBeNull();
      });

      // Assert content textarea has markdown string
      const textarea = screen.getByPlaceholderText(
        'Write your markdown or HTML content here...'
      ) as HTMLTextAreaElement;
      expect(textarea.value).toBe('![test-photo.png](/media/test-photo.png)');
    });

    it('appends markdown image syntax to existing content in textarea', async () => {
      renderEditor();

      const textarea = screen.getByPlaceholderText(
        'Write your markdown or HTML content here...'
      ) as HTMLTextAreaElement;
      fireEvent.change(textarea, { target: { value: '# Hello World\n' } });

      const insertImageButton = screen.getByRole('button', { name: /insert image/i });
      fireEvent.click(insertImageButton);

      expect(await screen.findByText('test-photo.png')).toBeDefined();
      const pickButton = screen.getByRole('button', { name: /select test-photo\.png/i });
      fireEvent.click(pickButton);

      await waitFor(() => {
        expect(screen.queryByText('Select Media')).toBeNull();
      });

      expect(textarea.value).toBe('# Hello World\n![test-photo.png](/media/test-photo.png)');
    });
  });

  describe('MediaPickerModal Filtering and Dismissal', () => {
    it('filters media items by search text', async () => {
      renderEditor();

      fireEvent.click(screen.getByRole('button', { name: /insert image/i }));
      expect(await screen.findByText('test-photo.png')).toBeDefined();

      const searchInput = screen.getByPlaceholderText('Search media by filename...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.queryByText('test-photo.png')).toBeNull();
      expect(screen.getByText('No matching media')).toBeDefined();

      fireEvent.change(searchInput, { target: { value: 'test' } });
      expect(screen.getByText('test-photo.png')).toBeDefined();
    });

    it('dismisses modal on Cancel click without altering content', async () => {
      renderEditor();

      const textarea = screen.getByPlaceholderText(
        'Write your markdown or HTML content here...'
      ) as HTMLTextAreaElement;

      fireEvent.click(screen.getByRole('button', { name: /insert image/i }));
      expect(await screen.findByText('Select Media')).toBeDefined();

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('Select Media')).toBeNull();
      });

      expect(textarea.value).toBe('');
    });
  });
});

describe('Editor Component - Phase 3 True Rendered Preview Tab', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/editor/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                entry: {
                  id: 42,
                  title: 'Existing Post',
                  slug: 'existing-post',
                  status: 'draft',
                  type: 'post',
                  body_html: '<p>Existing body</p>',
                },
                latest_revision: {
                  id: 101,
                  preview_token: 'existing-preview-token-xyz',
                },
              }),
          });
        }
        if (url.includes('/preview/')) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<html><body>Preview Body</body></html>'),
            json: () => Promise.resolve({}),
          });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                id: 42,
                preview_token: 'mock-preview-token-123',
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          text: () => Promise.resolve(''),
          json: () => Promise.resolve({}),
        });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers a save to /api/entries and sets the iframe src to /preview/:token when switching to preview tab', async () => {
    renderEditor();

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"Untitled"'),
        })
      );
    });

    const iframe = await screen.findByTitle('Preview');
    expect(iframe).toBeDefined();
    expect(iframe.getAttribute('src')).toBe('/preview/mock-preview-token-123');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/editor/42');
    });
  });

  it('triggers a save to /api/entries/:id with draft_only: true when switching to preview tab for an existing post', async () => {
    renderEditor('/editor/42');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/editor/42');
    });

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries/42',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"draft_only":true'),
        })
      );
    });

    const iframe = await screen.findByTitle('Preview');
    expect(iframe).toBeDefined();
    expect(iframe.getAttribute('src')).toBe('/preview/mock-preview-token-123');
  });

  it('preserves published status when switching to preview tab on an already-published post', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/editor/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                entry: {
                  id: 42,
                  title: 'Published Post',
                  slug: 'published-post',
                  status: 'published',
                  type: 'post',
                  body_html: '<p>Published body</p>',
                },
                latest_revision: {
                  id: 101,
                  preview_token: 'existing-preview-token-xyz',
                },
              }),
          });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                id: 42,
                preview_token: 'published-preview-token-999',
                draft_only: true,
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderEditor('/editor/42');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/editor/42');
    });

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries/42',
        expect.objectContaining({
          method: 'PUT',
          body: expect.stringContaining('"status":"published"'),
        })
      );
    });
  });

  it('renders with existing preview token from latest_revision or updates when switched', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/admin/editor/')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                entry: {
                  id: 42,
                  title: 'Existing Post',
                  slug: 'existing-post',
                  status: 'draft',
                  type: 'post',
                  body_html: '<p>Existing body</p>',
                },
                latest_revision: {
                  id: 101,
                  preview_token: 'existing-preview-token-xyz',
                },
              }),
          });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                success: true,
                id: 42,
                preview_token: 'updated-preview-token-456',
              }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );

    renderEditor('/editor/42');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/editor/42');
    });

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    const iframe = await screen.findByTitle('Preview');
    expect(iframe).toBeDefined();
    expect(iframe.getAttribute('src')).toBe('/preview/updated-preview-token-456');
  });

  it('renders the iframe with title="Preview" and full width and height styles', async () => {
    renderEditor();

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    const iframe = await screen.findByTitle('Preview');
    expect(iframe).toBeDefined();
    expect(iframe.getAttribute('title')).toBe('Preview');

    const style = iframe.getAttribute('style') || '';
    expect(style).toContain('width: 100%');
    expect(style).toContain('height: 100%');

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/admin/editor/42');
    });
  });

  it('displays fallback message when no preview token is available', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation(() =>
        Promise.resolve({
          ok: false,
          text: () => Promise.resolve('Failed'),
        })
      )
    );

    renderEditor();

    const previewTab = screen.getByRole('tab', { name: /preview/i });
    fireEvent.mouseDown(previewTab, { button: 0, ctrlKey: false });

    expect(await screen.findByText('No preview available')).toBeDefined();
  });
});


