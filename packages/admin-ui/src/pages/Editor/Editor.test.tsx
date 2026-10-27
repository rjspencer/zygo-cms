import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, waitForElementToBeRemoved, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { getPublicSiteUrl } from '../../utils/api';
import { Editor } from './Editor';

vi.mock('./components/ContentTab/components/SectionList/components/AddSectionSelect', () => ({
  AddSectionSelect: ({ sectionTemplates, onAddSection }: any) => (
    <div>
      <button
        type="button"
        onClick={() => {
          if (sectionTemplates.length > 0) {
            onAddSection(sectionTemplates[0].id);
          }
        }}
      >
        Add Section...
      </button>
      {sectionTemplates.map((st: any) => (
        <button
          key={st.id}
          type="button"
          data-testid={`add-section-${st.id}`}
          onClick={() => onAddSection(st.id)}
        >
          Add {st.name}
        </button>
      ))}
    </div>
  ),
}));

const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: Infinity,
    },
    mutations: {
      retry: false,
    },
  },
});

const waitForDialogClosed = async () => {
  if (screen.queryByRole('dialog')) {
    await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
  }
  expect(screen.queryByRole('dialog')).toBeNull();
};

const renderEditor = (initialPath = '/editor', customQueryClient?: QueryClient) => {
  const testQueryClient = customQueryClient ?? createTestQueryClient();
  if (initialPath === '/editor/1' && !testQueryClient.getQueryData(['editorEntry', '1'])) {
    testQueryClient.setQueryData(['editorEntry', '1'], {
      entry: { id: 1, title: '', slug: '', status: 'draft', type: 'post', body_html: '', body_json: '{}' },
    });
  }
  const router = createMemoryRouter(
    [
      '/editor',
      '/editor/:id',
      '/posts/editor/new',
      '/posts/editor/:id',
      '/pages/editor/new',
      '/pages/editor/:id',
    ].map((path) => ({ path, element: <Editor /> })),
    { initialEntries: [initialPath] }
  );
  return {
    ...render(
      <QueryClientProvider client={testQueryClient}>
        <Theme>
          <RouterProvider router={router} />
        </Theme>
      </QueryClientProvider>
    ),
    router,
    queryClient: testQueryClient,
  };
};

describe('Editor Component - Phase 1 Refinements', () => {
  beforeEach(() => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        if (url.includes('/api/admin/editor/1')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                entry: {
                  id: 1,
                  title: '',
                  slug: '',
                  status: 'draft',
                  type: 'post',
                  body_html: '',
                  body_json: '{}',
                },
              }),
          });
        }
        if (url.includes('/api/me')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ id: 1, email: 'admin@zygo.local', role: 'admin' }),
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

  describe('Top Navigation Bar', () => {
    it('renders the Back button, Save Draft, and Publish buttons in the top row with space-between layout', () => {
      renderEditor();
      const backButton = screen.getByRole('button', { name: /back/i });
      const saveButton = screen.getByRole('button', { name: /save draft/i });
      const publishButton = screen.getByRole('button', { name: /publish/i });

      expect(backButton.hasAttribute('disabled')).toBe(false);
      expect(saveButton.hasAttribute('disabled')).toBe(false);
      expect(publishButton.hasAttribute('disabled')).toBe(false);

      // Verify that Back and action buttons share the same parent row container
      const topNavRow = backButton.closest('.rt-Flex');
      expect(topNavRow).not.toBeNull();
      expect(topNavRow?.contains(saveButton)).toBe(true);
      expect(topNavRow?.contains(publishButton)).toBe(true);
      expect(topNavRow?.className).toContain('rt-r-jc-space-between');
    });
  });

  describe('Inline-Editable Title Toggle', () => {
    it('renders the title as regular text in default mode with prominent styling and an edit icon button', () => {
      renderEditor('/editor/1');

      // Default mode displays regular text (e.g. "Untitled")
      const titleHeading = screen.getByRole('heading', { level: 1 });
      expect(titleHeading.textContent).toBe('Untitled');

      // Check prominent styling and padding matching text input
      const style = titleHeading.getAttribute('style') || '';
      expect(style).toContain('font-size: 1.5rem');
      expect(style).toContain('font-weight: bold');
      expect(style).toContain('padding: 5px 0px');

      // Edit icon button is present to the right
      const editButton = screen.getByRole('button', { name: /edit title/i });
      expect(editButton.getAttribute('aria-label')).toBe('Edit title');

      // Editable TextField should not be displayed in default mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();
    });

    it('toggles to edit mode on edit icon click, revealing the input and save/cancel buttons', async () => {
      const user = userEvent.setup();
      renderEditor('/editor/1');

      const editButton = screen.getByRole('button', { name: /edit title/i });
      await user.click(editButton);

      // Input appears
      const titleInput = screen.getByPlaceholderText('Enter title here...') as HTMLInputElement;
      expect(titleInput.value).toBe('');

      // Save/Check and Cancel icon buttons appear
      const checkButton = screen.getByRole('button', { name: /save title/i });
      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(checkButton.getAttribute('aria-label')).toBe('Save title');
      expect(cancelButton.getAttribute('aria-label')).toBe('Cancel');

      // Edit button is hidden while in edit mode
      expect(screen.queryByRole('button', { name: /edit title/i })).toBeNull();
    });

    it('commits the new title and auto-generates slug when clicking the Save/Check button', async () => {
      const user = userEvent.setup();
      renderEditor('/editor/1');

      // Enter edit mode
      await user.click(screen.getByRole('button', { name: /edit title/i }));

      const titleInput = screen.getByPlaceholderText('Enter title here...');
      await user.type(titleInput, 'New Test Post Title');

      // Click Save/Check
      const checkButton = screen.getByRole('button', { name: /save title/i });
      await user.click(checkButton);

      // Exited edit mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();

      // Heading now displays new title
      const titleHeading = screen.getByRole('heading', { level: 1 });
      expect(titleHeading.textContent).toBe('New Test Post Title');

      // Auto-generated slug is updated
      const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
      expect(slugInput.value).toBe('new-test-post-title');
    });

    it('reverts to the original title value and does not update slug when clicking Cancel', async () => {
      const user = userEvent.setup();
      renderEditor('/editor/1');

      // First set a known title
      await user.click(screen.getByRole('button', { name: /edit title/i }));
      await user.type(screen.getByPlaceholderText('Enter title here...'), 'Original Title');
      await user.click(screen.getByRole('button', { name: /save title/i }));

      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Original Title');
      const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
      expect(slugInput.value).toBe('original-title');

      // Start editing again, change text, then cancel
      await user.click(screen.getByRole('button', { name: /edit title/i }));
      const titleInput = screen.getByPlaceholderText('Enter title here...');
      await user.clear(titleInput);
      await user.type(titleInput, 'Discarded Title Edit');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      // Exited edit mode
      expect(screen.queryByPlaceholderText('Enter title here...')).toBeNull();

      // Title reverted to Original Title
      expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Original Title');

      // Slug unchanged
      expect(slugInput.value).toBe('original-title');
    });

    it('ensures all icon buttons only display icons and have accessible attributes', async () => {
      const user = userEvent.setup();
      renderEditor('/editor/1');

      // In default mode
      const editButton = screen.getByRole('button', { name: /edit title/i });
      expect(editButton.getAttribute('aria-label')).toBe('Edit title');
      expect(editButton.getAttribute('title')).toBe('Edit title');
      expect(editButton.querySelector('svg')).not.toBeNull();
      expect(editButton.textContent).toBe('');

      // Enter edit mode
      await user.click(editButton);

      const checkButton = screen.getByRole('button', { name: /save title/i });
      expect(checkButton.getAttribute('aria-label')).toBe('Save title');
      expect(checkButton.getAttribute('title')).toBe('Save title');
      expect(checkButton.querySelector('svg')).not.toBeNull();
      expect(checkButton.textContent).toBe('');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      expect(cancelButton.getAttribute('aria-label')).toBe('Cancel');
      expect(cancelButton.getAttribute('title')).toBe('Cancel');
      expect(cancelButton.querySelector('svg')).not.toBeNull();
      expect(cancelButton.textContent).toBe('');
    });
  });

  describe('Content Tab Integrity', () => {
    it('removes the redundant title input from the content tab', () => {
      renderEditor('/editor/1');
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
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/media')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockMediaResponse),
          });
        }
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
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
      const user = userEvent.setup();
      renderEditor();

      // Switch to Metadata tab
      const metadataTab = screen.getByRole('tab', { name: /metadata/i });
      await user.click(metadataTab);

      // Verify "Select Image" button is rendered
      const selectImageButton = screen.getByRole('button', { name: /select image/i });
      expect(selectImageButton.hasAttribute('disabled')).toBe(false);

      // Open media picker modal
      await user.click(selectImageButton);

      // Verify modal opened and fetched media
      expect((await screen.findByRole('heading', { name: 'Select Media' })).textContent).toBe('Select Media');
      expect((await screen.findByText('test-photo.png')).textContent).toBe('test-photo.png');

      // Pick the image
      const pickButton = screen.getByRole('button', { name: /select test-photo\.png/i });
      await user.click(pickButton);

      // Verify modal is closed and Radix Presence teardown completes (Pattern 14)
      await waitForDialogClosed();

      // Verify cover image state is updated and displayed
      expect(screen.getByText('/media/test-photo.png').textContent).toBe('/media/test-photo.png');

      // Verify Remove button clears the cover image
      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);
      expect(screen.queryByText('/media/test-photo.png')).toBeNull();
    });
  });

  describe('Inline Content Insertion', () => {
    it('inserts image into TipTap editor when picking an image via toolbar', async () => {
      const user = userEvent.setup();
      const { container } = renderEditor();

      // Content tab is active by default
      const insertImageButton = screen.getByRole('button', { name: /insert image/i });
      expect(insertImageButton.hasAttribute('disabled')).toBe(false);

      // Click Insert Image
      await user.click(insertImageButton);

      // Verify modal opens and media is displayed
      expect((await screen.findByRole('heading', { name: 'Select Media' })).textContent).toBe('Select Media');
      expect((await screen.findByText('test-photo.png')).textContent).toBe('test-photo.png');

      // Select the image
      const pickButton = screen.getByRole('button', { name: /select test-photo\.png/i });
      await user.click(pickButton);

      // Modal closes - wait for Radix teardown (Pattern 14)
      await waitForDialogClosed();

      // Assert TipTap has image element with medium size, width, and max-width
      await waitFor(() => {
        const img = container.querySelector('.tiptap img') as HTMLImageElement;
        expect(img).not.toBeNull();
        expect(img?.getAttribute('src')).toBe(getPublicSiteUrl('/media/test-photo.png?size=md'));
        expect(img?.getAttribute('width')).toBe('1024');
        expect(img?.getAttribute('style')).toContain('max-width: 100%');
      });
    });
  });

  describe('MediaPickerModal Filtering and Dismissal', () => {
    it('filters media items by search text', async () => {
      const user = userEvent.setup();
      renderEditor();

      await user.click(screen.getByRole('button', { name: /insert image/i }));
      expect((await screen.findByText('test-photo.png')).textContent).toBe('test-photo.png');

      const searchInput = screen.getByPlaceholderText('Search media by filename...');
      await user.type(searchInput, 'nonexistent');

      expect(screen.queryByText('test-photo.png')).toBeNull();
      expect(screen.getByText('No matching media').textContent).toBe('No matching media');

      await user.clear(searchInput);
      await user.type(searchInput, 'test');
      expect(screen.getByText('test-photo.png').textContent).toBe('test-photo.png');

      await user.click(screen.getByRole('button', { name: /cancel/i }));
      await waitForDialogClosed();
    });

    it('dismisses modal on Cancel click without inserting image', async () => {
      const user = userEvent.setup();
      const { container } = renderEditor();

      await user.click(screen.getByRole('button', { name: /insert image/i }));
      expect((await screen.findByRole('heading', { name: 'Select Media' })).textContent).toBe('Select Media');

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      await waitForDialogClosed();

      const img = container.querySelector('.tiptap img');
      expect(img).toBeNull();
    });
  });
});

describe('Editor Component - Section Templates Rework', () => {
  beforeEach(() => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'hero', name: 'Hero', schema_json: '[]' }
            ]),
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

  it('renders Post editor with slug prefix /post/ and TipTap body, and no section controls', () => {
    renderEditor('/editor?type=post');

    // Slug prefix
    expect(screen.getByText('/post/').textContent).toBe('/post/');

    // Body content label and RichTextEditor
    expect(screen.getByText('Body Content').textContent).toBe('Body Content');
    expect(screen.getByRole('button', { name: 'Bold' }).hasAttribute('disabled')).toBe(false);

    // No page section controls
    expect(screen.queryByText('Page Sections')).toBeNull();
    expect(screen.queryByText('Add Section...')).toBeNull();
  });

  it('renders Page editor with slug prefix / and Page Sections UI, without RichTextEditor post body', async () => {
    renderEditor('/editor?type=page');

    // Slug prefix is / without post/
    expect(screen.getByText('/').textContent).toBe('/');
    expect(screen.queryByText('/post/')).toBeNull();

    // Page Sections UI
    expect(screen.getByText('Page Sections').textContent).toBe('Page Sections');
    expect((await screen.findByText('Add Section...')).textContent).toBe('Add Section...');

    // No Post Body content
    expect(screen.queryByText('Body Content')).toBeNull();
  });

  it('populates Add Section dropdown with templates from /api/section-templates', async () => {
    renderEditor('/editor?type=page');

    const trigger = await screen.findByText('Add Section...');
    expect(trigger.textContent).toBe('Add Section...');
  });

  it('displays "Missing template" when a section references an unknown template and allows removing it', async () => {
    const user = userEvent.setup();
    // Override fetch for entry with missing section template
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([
              { id: 'hero', name: 'Hero', schema_json: '[]' }
            ]),
          });
        }
        if (url.includes('/api/admin/editor/99')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({
              entry: {
                id: 99,
                title: 'Custom Page',
                slug: 'custom-page',
                status: 'draft',
                type: 'page',
                body_html: '',
                body_json: JSON.stringify([
                  { type_id: 'deleted_section_tpl', data: {} }
                ]),
              },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        });
      })
    );

    renderEditor('/editor/99');

    // Verify "Missing template" is rendered
    expect((await screen.findByText('Missing template')).textContent).toBe('Missing template');
    expect(screen.getByText('(deleted_section_tpl)').textContent).toBe('(deleted_section_tpl)');

    // Verify remove button is available and removes it
    const deleteBtn = screen.getByRole('button', { name: /delete section/i });
    await user.click(deleteBtn);

    expect(screen.queryByText('Missing template')).toBeNull();
  });

  it('saves post with body_html and empty body_json "{}"', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: 50, preview_token: 'tok' }),
    });
    vi.stubGlobal('fetch', fetchSpy);

    renderEditor('/editor?type=post');

    const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
    await user.click(saveDraftBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringMatching(/"body_json":"\{\}"/),
        })
      );
    });
  });

  it('saves page with empty body_html and stringified sections in body_json', async () => {
    const user = userEvent.setup();
    const fetchSpy = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/section-templates')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([
            { id: 'hero', name: 'Hero', schema_json: JSON.stringify([{ name: 'title', type: 'text', label: 'Title' }]) }
          ]),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ id: 51, preview_token: 'tok' }),
      });
    });
    vi.stubGlobal('fetch', fetchSpy);

    renderEditor('/editor?type=page');

    const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
    await user.click(saveDraftBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        '/api/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringMatching(/"body_html":""/),
        })
      );
    });
  });
});

describe('Editor Component - Phase 3 Routing, Title UX & Metadata Previews', () => {
  beforeEach(() => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, id: 99, preview_token: 'ptk-99' }),
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

  it('navigates to /posts/editor/new and initializes as post with title editing input open', () => {
    renderEditor('/posts/editor/new');

    const titleInput = screen.getByPlaceholderText('Enter title here...') as HTMLInputElement;
    expect(titleInput.value).toBe('');
    expect(screen.getByText('POST').textContent).toBe('POST');
    expect(screen.getByText('/post/').textContent).toBe('/post/');
  });

  it('navigates to /pages/editor/new and initializes as page with title editing input open', () => {
    renderEditor('/pages/editor/new');

    const titleInput = screen.getByPlaceholderText('Enter title here...') as HTMLInputElement;
    expect(titleInput.value).toBe('');
    expect(screen.getByText('PAGE').textContent).toBe('PAGE');
    expect(screen.getByText('/').textContent).toBe('/');
  });

  it('auto-generates slug on title input blur when slug field is empty', async () => {
    const user = userEvent.setup();
    renderEditor('/posts/editor/new');

    const titleInput = screen.getByPlaceholderText('Enter title here...');
    await user.type(titleInput, 'My Awesome New Article!');
    await user.tab();

    const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
    expect(slugInput.value).toBe('my-awesome-new-article');
  });

  it('saves entry using tempTitle and auto-generated slug when saved while title is still in edit mode', async () => {
    const user = userEvent.setup();
    renderEditor('/posts/editor/new');

    const titleInput = screen.getByPlaceholderText('Enter title here...');
    await user.type(titleInput, 'Unsaved Title Mode');

    const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
    await user.click(saveDraftBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringMatching(/"title":"Unsaved Title Mode"/),
        })
      );
    });

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/entries',
        expect.objectContaining({
          body: expect.stringMatching(/"slug":"unsaved-title-mode"/),
        })
      );
    });
  });

  it('renders Google, Slack, and iMessage visual previews under Metadata tab', async () => {
    const user = userEvent.setup();
    renderEditor('/posts/editor/new');

    const metadataTab = screen.getByRole('tab', { name: /metadata/i });
    await user.click(metadataTab);

    expect(screen.getByText('Search & Social Previews').textContent).toBe('Search & Social Previews');
    expect(screen.getByText('Google Search Result').textContent).toBe('Google Search Result');
    expect(screen.getByText('Slack Link Preview').textContent).toBe('Slack Link Preview');
    expect(screen.getByText('iMessage Preview').textContent).toBe('iMessage Preview');
  });

  describe('Dynamic URL Navigation & entryType Derivation', () => {
    it('updates entryType, badge, slug prefix, and body UI when URL changes from /pages to /posts and /docs', async () => {
      const testQueryClient = createTestQueryClient();
      const router = createMemoryRouter(
        [
          { path: '/pages/editor/new', element: <Editor /> },
          { path: '/posts/editor/new', element: <Editor /> },
          { path: '/docs/editor/new', element: <Editor /> },
        ],
        { initialEntries: ['/pages/editor/new'] }
      );

      render(
        <QueryClientProvider client={testQueryClient}>
          <Theme>
            <RouterProvider router={router} />
          </Theme>
        </QueryClientProvider>
      );

      // Initial state: page editor
      expect(screen.getByText('PAGE').textContent).toBe('PAGE');
      expect(screen.getByText('/').textContent).toBe('/');
      expect(screen.getByText('Page Sections').textContent).toBe('Page Sections');
      expect(screen.queryByText('Body Content')).toBeNull();

      // Navigate to /posts/editor/new
      await act(async () => {
        await router.navigate('/posts/editor/new');
      });

      // Updated state: post editor
      await waitFor(() => {
        expect(screen.getByText('POST').textContent).toBe('POST');
        expect(screen.getByText('/post/').textContent).toBe('/post/');
        expect(screen.getByText('Body Content').textContent).toBe('Body Content');
        expect(screen.queryByText('Page Sections')).toBeNull();
      });

      // Navigate to /docs/editor/new
      await act(async () => {
        await router.navigate('/docs/editor/new');
      });

      // Updated state: doc editor
      await waitFor(() => {
        expect(screen.getByText('DOC').textContent).toBe('DOC');
        expect(screen.getByText('/docs/').textContent).toBe('/docs/');
        expect(screen.getByText('Body Content').textContent).toBe('Body Content');
        expect(screen.queryByText('Page Sections')).toBeNull();
      });
    });

    it('correctly derives entryType for singular /page and /post routes', async () => {
      const testQueryClient = createTestQueryClient();
      const router = createMemoryRouter(
        [
          { path: '/page/editor/new', element: <Editor /> },
          { path: '/post/editor/new', element: <Editor /> },
        ],
        { initialEntries: ['/page/editor/new'] }
      );

      render(
        <QueryClientProvider client={testQueryClient}>
          <Theme>
            <RouterProvider router={router} />
          </Theme>
        </QueryClientProvider>
      );

      expect(screen.getByText('PAGE').textContent).toBe('PAGE');

      await act(async () => {
        await router.navigate('/post/editor/new');
      });

      await waitFor(() => {
        expect(screen.getByText('POST').textContent).toBe('POST');
      });
    });

    it('saves doc with doc entryType and navigates to /docs/editor/:id', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, id: 88, preview_token: 'tok-doc' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      const testQueryClient = createTestQueryClient();
      const router = createMemoryRouter(
        [
          { path: '/docs/editor/new', element: <Editor /> },
          { path: '/docs/editor/:id', element: <Editor /> },
        ],
        { initialEntries: ['/docs/editor/new'] }
      );

      render(
        <QueryClientProvider client={testQueryClient}>
          <Theme>
            <RouterProvider router={router} />
          </Theme>
        </QueryClientProvider>
      );

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith(
          '/api/entries',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringMatching(/"type":"doc"/),
          })
        );
      });

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/docs/editor/88');
      });
    });
  });
});

describe('Editor Component - Phase 4 Functional & Data Integrity', () => {
  beforeEach(() => {
    import.meta.env.VITE_PUBLIC_SITE_URL = '';
    vi.stubGlobal(
      'fetch',
      vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Loading & Error states', () => {
    it('renders role="status" (Loading entry...) while entry fetch is pending', async () => {
      let resolveFetch: any;
      const pendingPromise = new Promise((resolve) => {
        resolveFetch = resolve;
      });

      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/api/admin/editor/77')) {
            return pendingPromise;
          }
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          });
        })
      );

      renderEditor('/posts/editor/77');

      const status = screen.getByRole('status');
      expect(status.textContent).toBe('Loading entry...');

      resolveFetch({
        ok: true,
        json: () =>
          Promise.resolve({
            entry: {
              id: 77,
              title: 'Loaded',
              slug: 'loaded',
              type: 'post',
              status: 'draft',
              body_html: '',
              body_json: '{}',
            },
          }),
      });
    });

    it('renders role="alert" (Failed to load entry) and a Retry button when fetch fails, and re-fetches on click', async () => {
      const user = userEvent.setup();
      let attempts = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('/api/section-templates')) {
            return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
          }
          if (url.includes('/api/admin/editor/77')) {
            attempts++;
            if (attempts === 1) {
              return Promise.resolve({ ok: false, status: 500 });
            }
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  entry: {
                    id: 77,
                    title: 'Recovered Post',
                    slug: 'recovered-post',
                    status: 'draft',
                    type: 'post',
                    body_html: '',
                    body_json: '{}',
                  },
                }),
            });
          }
          return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
        })
      );

      renderEditor('/posts/editor/77');

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toContain('Failed to load entry');

      const retryButton = screen.getByRole('button', { name: /retry/i });
      expect(retryButton.hasAttribute('disabled')).toBe(false);

      await user.click(retryButton);

      const recoveredHeading = await screen.findByRole('heading', { level: 1 });
      expect(recoveredHeading.textContent).toBe('Recovered Post');
    });
  });

  describe('Form & Section Validation Blocking Save/Publish', () => {
    it('blocks Save Draft and Publish when slug is invalid and displays error alert without calling API', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      renderEditor('/posts/editor/new');

      const slugInput = screen.getByPlaceholderText('url-friendly-slug');
      await user.clear(slugInput);
      await user.type(slugInput, 'bad slug!');

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('Slug must contain only alphanumeric characters and hyphens');
      expect(fetchSpy).not.toHaveBeenCalledWith('/api/entries', expect.anything());

      const publishBtn = screen.getByRole('button', { name: /publish/i });
      await user.click(publishBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert').textContent).toBe('Slug must contain only alphanumeric characters and hyphens');
      });
      expect(fetchSpy).not.toHaveBeenCalledWith('/api/entries', expect.anything());
    });

    it('blocks Publish when page section required field is blank, auto-expands section, and renders required error alert', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: 'hero_banner',
                  name: 'Hero Banner',
                  schema_json: JSON.stringify([
                    { name: 'headline', type: 'text', label: 'Headline', required: true },
                  ]),
                },
              ]),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      renderEditor('/pages/editor/new');

      const addBtn = await screen.findByTestId('add-section-hero_banner');
      await user.click(addBtn);

      expect((await screen.findByText('Hero Banner')).textContent).toBe('Hero Banner');

      const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
      await user.click(collapseBtn);
      expect(screen.getByRole('button', { name: 'Expand section' }).hasAttribute('disabled')).toBe(false);
      expect(screen.queryByText('Headline is required')).toBeNull();

      const publishBtn = screen.getByRole('button', { name: /publish/i });
      await user.click(publishBtn);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('Headline is required');
      expect(screen.getByRole('button', { name: 'Collapse section' }).hasAttribute('disabled')).toBe(false);
      expect(fetchSpy).not.toHaveBeenCalledWith('/api/entries', expect.anything());
    });

    it('blocks Save Draft and auto-switches active tab to Metadata when cross-tab validation error occurs', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      renderEditor('/posts/editor/new');

      const metadataTab = screen.getByRole('tab', { name: /metadata/i });
      await user.click(metadataTab);

      const canonicalInput = screen.getByPlaceholderText('https://example.com/...');
      await user.type(canonicalInput, 'not-a-valid-url');

      const contentTab = screen.getByRole('tab', { name: /content/i });
      await user.click(contentTab);
      const slugInput = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
      expect(slugInput.value).toBe('');

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      const alert = await screen.findByRole('alert');
      expect(alert.textContent).toBe('Canonical URL must be a valid HTTP/HTTPS URL');
      expect((screen.getByPlaceholderText('https://example.com/...') as HTMLInputElement).value).toBe('not-a-valid-url');
      expect(fetchSpy).not.toHaveBeenCalledWith('/api/entries', expect.anything());
    });
  });

  describe('Section Expansion State Survives Save', () => {
    it('preserves section collapsed state after Save Draft completes', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  id: 'plain_section',
                  name: 'Plain Section',
                  schema_json: JSON.stringify([
                    { name: 'subtitle', type: 'text', label: 'Subtitle', required: false },
                  ]),
                },
              ]),
          });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, id: 105, preview_token: 'tok-105' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      renderEditor('/pages/editor/new');

      const addBtn = await screen.findByTestId('add-section-plain_section');
      await user.click(addBtn);

      expect((await screen.findByText('Plain Section')).textContent).toBe('Plain Section');

      const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
      await user.click(collapseBtn);
      expect(screen.getByRole('button', { name: 'Expand section' }).hasAttribute('disabled')).toBe(false);

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      await waitFor(() => {
        expect(fetchSpy).toHaveBeenCalledWith('/api/entries', expect.anything());
      });

      expect(screen.getByRole('button', { name: 'Expand section' }).hasAttribute('disabled')).toBe(false);
      expect(screen.queryByRole('button', { name: 'Collapse section' })).toBeNull();
    });
  });

  describe('First Save Seeds Cache Without Flash/Unmount', () => {
    it('navigates to /posts/editor/:id, seeds query cache without loading spinner, and keeps Saved to Edge visible', async () => {
      const user = userEvent.setup();
      const fetchSpy = vi.fn().mockImplementation((url: string) => {
        if (url.includes('/api/section-templates')) {
          return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
        }
        if (url.includes('/api/entries')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ success: true, id: 202, preview_token: 'tok-202' }),
          });
        }
        return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      });
      vi.stubGlobal('fetch', fetchSpy);

      const { router } = renderEditor('/posts/editor/new');

      const saveDraftBtn = screen.getByRole('button', { name: /save draft/i });
      await user.click(saveDraftBtn);

      await waitFor(() => {
        expect(router.state.location.pathname).toBe('/posts/editor/202');
      });

      expect((await screen.findByText('Saved to Edge')).textContent).toContain('Saved to Edge');
      expect(screen.queryByRole('status')).toBeNull();
      expect(screen.queryByText('Loading entry...')).toBeNull();
    });
  });
});
