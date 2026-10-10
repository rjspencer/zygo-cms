import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPProvider } from '../providers/WebMCPProvider';
import { createGlobalEntryTools, useTipTapWebMCP } from '../lib/webmcp/entryTools';
import { RichTextEditor } from '../components/RichTextEditor';
import type { Editor as TipTapEditor } from '@tiptap/react';

describe('Global Entry WebMCP Tools (createGlobalEntryTools)', () => {
  let registry: WebMCPRegistry;
  let mockFetch: ReturnType<typeof vi.fn>;

  const mockEntries = [
    { id: '1', title: 'First Post', slug: 'first-post', type: 'post', status: 'published' },
    { id: '2', title: 'Second Post', slug: 'second-post', type: 'post', status: 'draft' },
    { id: '3', title: 'About Us', slug: 'about-us', type: 'page', status: 'published' },
    { id: '4', title: 'API Guide', slug: 'api-guide', type: 'doc', status: 'draft' },
  ];

  beforeEach(() => {
    registry = new WebMCPRegistry();
    const tools = createGlobalEntryTools();
    registry.registerTools(tools);

    mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list_entries tool', () => {
    it('returns all entries when no filter is provided', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      });

      const res = await registry.callTool('list_entries', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(mockEntries);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.anything()
      );
    });

    it('filters entries by type', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      });

      const res = await registry.callTool('list_entries', { type: 'post' });
      expect(res.isError).toBeFalsy();
      const results = res.toolResult as any[];
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.type === 'post')).toBe(true);
    });

    it('filters entries by status', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      });

      const res = await registry.callTool('list_entries', { status: 'draft' });
      expect(res.isError).toBeFalsy();
      const results = res.toolResult as any[];
      expect(results).toHaveLength(2);
      expect(results.every((e) => e.status === 'draft')).toBe(true);
    });

    it('filters entries by search query matching title or slug', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockEntries,
      });

      const res = await registry.callTool('list_entries', { search: 'about' });
      expect(res.isError).toBeFalsy();
      const results = res.toolResult as any[];
      expect(results).toHaveLength(1);
      expect(results[0].slug).toBe('about-us');
    });

    it('handles API error response gracefully', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        text: async () => 'Database offline',
      });

      const res = await registry.callTool('list_entries', {});
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to fetch entries: Database offline');
    });

    it('handles network error thrown by fetch', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network failure'));

      const res = await registry.callTool('list_entries', {});
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Error listing entries: Network failure');
    });
  });

  describe('get_entry tool', () => {
    it('fetches an entry by id', async () => {
      const entry = { id: '42', title: 'Target Entry', slug: 'target-entry' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => entry,
      });

      const res = await registry.callTool('get_entry', { id: '42' });
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(entry);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/42'),
        expect.anything()
      );
    });

    it('returns error when id is missing or empty', async () => {
      const res = await registry.callTool('get_entry', { id: '   ' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Entry ID is required.');
    });

    it('handles 404 not found error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Not Found',
        text: async () => 'Entry does not exist',
      });

      const res = await registry.callTool('get_entry', { id: '999' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to get entry 999: Entry does not exist');
    });
  });

  describe('create_entry tool', () => {
    it('creates an entry with required fields', async () => {
      const created = { id: '10', title: 'New Doc', slug: 'new-doc', type: 'doc', status: 'draft' };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => created,
      });

      const res = await registry.callTool('create_entry', {
        title: 'New Doc',
        slug: 'new-doc',
        type: 'doc',
        description: 'A new doc',
      });

      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual(created);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries'),
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"title":"New Doc"'),
        })
      );
    });

    it('validates required fields (title, slug, type)', async () => {
      const res = await registry.callTool('create_entry', {
        title: 'Missing Slug',
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Fields "title", "slug", and "type" are required.');
    });

    it('handles API failure when creating entry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Bad Request',
        text: async () => 'Slug already exists',
      });

      const res = await registry.callTool('create_entry', {
        title: 'Duplicate Slug',
        slug: 'duplicate-slug',
        type: 'post',
      });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to create entry: Slug already exists');
    });
  });

  describe('delete_entry tool', () => {
    it('returns preview confirmation when dry_run is true without calling API', async () => {
      const res = await registry.callTool('delete_entry', { id: '5', dry_run: true });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).dry_run).toBe(true);
      expect(res.content[0].text).toContain('[Dry Run] Entry 5 would be deleted.');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('calls DELETE endpoint when dry_run is false or omitted', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      const res = await registry.callTool('delete_entry', { id: '5' });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).success).toBe(true);
      expect(res.content[0].text).toContain('Entry 5 deleted successfully.');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/entries/5'),
        expect.objectContaining({ method: 'DELETE' })
      );
    });

    it('returns error when id is empty', async () => {
      const res = await registry.callTool('delete_entry', { id: '' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Entry ID is required.');
    });

    it('handles API failure during deletion', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        statusText: 'Forbidden',
        text: async () => 'Cannot delete protected entry',
      });

      const res = await registry.callTool('delete_entry', { id: '1' });
      expect(res.isError).toBe(true);
      expect(res.content[0].text).toContain('Failed to delete entry 1: Cannot delete protected entry');
    });
  });
});

describe('useTipTapWebMCP Contextual Tools', () => {
  interface HarnessProps {
    initialContent?: string;
    initialType?: string;
    initialSections?: any[];
    editorMock?: any;
    onSaveDraft?: any;
    onPublish?: any;
  }

  const EditorHarness: React.FC<HarnessProps> = ({
    initialContent = '<p>Initial Content</p>',
    initialType = 'post',
    initialSections = [],
    editorMock = null,
    onSaveDraft,
    onPublish,
  }) => {
    const [content, setContent] = useState(initialContent);
    const [title, setTitle] = useState('Initial Title');
    const [slug, setSlug] = useState('initial-title');
    const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
    const [description, setDescription] = useState('Initial Desc');
    const [category, setCategory] = useState('Tech');
    const [tags, setTags] = useState('react, vite');

    useTipTapWebMCP({
      editor: editorMock,
      content,
      setContent,
      title,
      setTitle,
      slug,
      setSlug,
      status,
      setStatus,
      entryType: initialType,
      description,
      setDescription,
      category,
      setCategory,
      tags,
      setTags,
      sections: initialSections,
      onSaveDraft,
      onPublish,
    });

    return (
      <div>
        <div data-testid="val-content">{content}</div>
        <div data-testid="val-title">{title}</div>
        <div data-testid="val-slug">{slug}</div>
        <div data-testid="val-status">{status}</div>
        <div data-testid="val-description">{description}</div>
        <div data-testid="val-category">{category}</div>
        <div data-testid="val-tags">{tags}</div>
      </div>
    );
  };

  it('registers all 7 editor tools without error', () => {
    const registry = new WebMCPRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <EditorHarness />
      </WebMCPProvider>
    );

    const toolNames = registry.getTools().map((t) => t.name);
    expect(toolNames).toContain('editor_get_content');
    expect(toolNames).toContain('editor_get_selection');
    expect(toolNames).toContain('editor_insert_content');
    expect(toolNames).toContain('editor_replace_selection');
    expect(toolNames).toContain('editor_set_metadata');
    expect(toolNames).toContain('editor_save_draft');
    expect(toolNames).toContain('editor_publish');
  });

  describe('editor_get_content', () => {
    it('returns content and metadata using fallback content state when editor is null', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialContent="<p>Fallback Content</p>" />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_get_content', { format: 'html' });
      expect(res.isError).toBeFalsy();
      const data = res.toolResult as any;
      expect(data.content).toBe('<p>Fallback Content</p>');
      expect(data.title).toBe('Initial Title');
      expect(data.slug).toBe('initial-title');
      expect(data.status).toBe('draft');
      expect(data.entryType).toBe('post');
      expect(data.description).toBe('Initial Desc');
      expect(data.category).toBe('Tech');
      expect(data.tags).toBe('react, vite');
    });

    it('returns sections when entryType is page', async () => {
      const registry = new WebMCPRegistry();
      const sampleSections = [{ type_id: 'hero', data: { heading: 'Hello' } }];

      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialType="page" initialSections={sampleSections} />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_get_content', {});
      expect(res.isError).toBeFalsy();
      const data = res.toolResult as any;
      expect(data.entryType).toBe('page');
      expect(data.sections).toEqual(sampleSections);
    });

    it('queries active TipTap instance for html, json, and markdown formats', async () => {
      const mockEditor = {
        getHTML: vi.fn().mockReturnValue('<p>TipTap HTML</p>'),
        getJSON: vi.fn().mockReturnValue({ type: 'doc', content: [] }),
        getText: vi.fn().mockReturnValue('TipTap Text'),
      };

      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness editorMock={mockEditor as any} />
        </WebMCPProvider>
      );

      const resHtml = await registry.callTool('editor_get_content', { format: 'html' });
      expect((resHtml.toolResult as any).content).toBe('<p>TipTap HTML</p>');
      expect(mockEditor.getHTML).toHaveBeenCalled();

      const resJson = await registry.callTool('editor_get_content', { format: 'json' });
      expect((resJson.toolResult as any).content).toEqual({ type: 'doc', content: [] });
      expect(mockEditor.getJSON).toHaveBeenCalled();

      const resMarkdown = await registry.callTool('editor_get_content', { format: 'markdown' });
      expect((resMarkdown.toolResult as any).content).toBe('TipTap Text');
      expect(mockEditor.getText).toHaveBeenCalled();
    });
  });

  describe('editor_get_selection', () => {
    it('returns empty selection when editor is null', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_get_selection', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({ from: 0, to: 0, empty: true, text: '' });
    });

    it('reads active selection range and text from TipTap editor instance', async () => {
      const mockEditor = {
        state: {
          selection: { from: 5, to: 15, empty: false },
          doc: {
            textBetween: vi.fn().mockReturnValue('Highlighted'),
          },
        },
      };

      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness editorMock={mockEditor as any} />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_get_selection', {});
      expect(res.isError).toBeFalsy();
      expect(res.toolResult).toEqual({
        from: 5,
        to: 15,
        empty: false,
        text: 'Highlighted',
      });
      expect(mockEditor.state.doc.textBetween).toHaveBeenCalledWith(5, 15, ' ');
    });
  });

  describe('editor_insert_content', () => {
    it('appends to content state when editor is null and position is end', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialContent="Start." />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_insert_content', {
          content: ' End.',
          position: 'end',
        });
      });
      expect(res.isError).toBeFalsy();
      expect(screen.getByTestId('val-content').textContent).toBe('Start. End.');
    });

    it('prepends to content state when editor is null and position is start', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialContent="World" />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_insert_content', {
          content: 'Hello ',
          position: 'start',
        });
      });
      expect(res.isError).toBeFalsy();
      expect(screen.getByTestId('val-content').textContent).toBe('Hello World');
    });

    it('inserts into TipTap editor and synchronizes state via setContent', async () => {
      const insertRun = vi.fn();
      const insertMock = vi.fn().mockReturnValue({ run: insertRun });
      const focusMock = vi.fn().mockReturnValue({ insertContent: insertMock });

      const mockEditor = {
        chain: vi.fn().mockReturnValue({ focus: focusMock }),
        getHTML: vi.fn().mockReturnValue('<p>New TipTap Content</p>'),
      };

      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness editorMock={mockEditor as any} />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_insert_content', {
          content: '<p>New TipTap Content</p>',
          position: 'cursor',
        });
      });

      expect(res.isError).toBeFalsy();
      expect(mockEditor.chain).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalledWith('<p>New TipTap Content</p>');
      expect(insertRun).toHaveBeenCalled();
      expect(screen.getByTestId('val-content').textContent).toBe('<p>New TipTap Content</p>');
    });
  });

  describe('editor_replace_selection', () => {
    it('replaces content state directly when editor is null', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness initialContent="Old Content" />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_replace_selection', {
          content: 'Brand New Content',
        });
      });
      expect(res.isError).toBeFalsy();
      expect(screen.getByTestId('val-content').textContent).toBe('Brand New Content');
    });

    it('replaces selection in TipTap editor and synchronizes setContent', async () => {
      const insertRun = vi.fn();
      const insertMock = vi.fn().mockReturnValue({ run: insertRun });
      const focusMock = vi.fn().mockReturnValue({ insertContent: insertMock });

      const mockEditor = {
        chain: vi.fn().mockReturnValue({ focus: focusMock }),
        getHTML: vi.fn().mockReturnValue('Replaced HTML'),
      };

      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness editorMock={mockEditor as any} />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_replace_selection', {
          content: 'Replaced Selection',
        });
      });
      expect(res.isError).toBeFalsy();
      expect(mockEditor.chain).toHaveBeenCalled();
      expect(insertMock).toHaveBeenCalledWith('Replaced Selection');
      expect(screen.getByTestId('val-content').textContent).toBe('Replaced HTML');
    });
  });

  describe('editor_set_metadata', () => {
    it('updates title, slug, description, category, tags, and status', async () => {
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness />
        </WebMCPProvider>
      );

      const res = await act(async () => {
        return await registry.callTool('editor_set_metadata', {
          title: 'Updated Title',
          slug: 'updated-title',
          description: 'New Description',
          category: 'Tutorials',
          tags: ['guides', 'intro'],
          status: 'published',
        });
      });

      expect(res.isError).toBeFalsy();
      expect(screen.getByTestId('val-title').textContent).toBe('Updated Title');
      expect(screen.getByTestId('val-slug').textContent).toBe('updated-title');
      expect(screen.getByTestId('val-description').textContent).toBe('New Description');
      expect(screen.getByTestId('val-category').textContent).toBe('Tutorials');
      expect(screen.getByTestId('val-tags').textContent).toBe('guides, intro');
      expect(screen.getByTestId('val-status').textContent).toBe('published');
    });
  });

  describe('editor_save_draft & editor_publish', () => {
    it('triggers save draft callback', async () => {
      const onSaveDraft = vi.fn().mockResolvedValue({ id: 10, status: 'draft' });
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness onSaveDraft={onSaveDraft} />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_save_draft', {});
      expect(res.isError).toBeFalsy();
      expect(onSaveDraft).toHaveBeenCalledTimes(1);
      expect((res.toolResult as any).status).toBe('draft');
    });

    it('triggers publish callback', async () => {
      const onPublish = vi.fn().mockResolvedValue({ id: 10, status: 'published' });
      const registry = new WebMCPRegistry();
      render(
        <WebMCPProvider registry={registry}>
          <EditorHarness onPublish={onPublish} />
        </WebMCPProvider>
      );

      const res = await registry.callTool('editor_publish', {});
      expect(res.isError).toBeFalsy();
      expect(onPublish).toHaveBeenCalledTimes(1);
      expect((res.toolResult as any).status).toBe('published');
    });
  });

  describe('Integration with real RichTextEditor component', () => {
    const FullEditorComponent: React.FC = () => {
      const [content, setContent] = useState('<p>Initial Rich Text</p>');
      const [editor, setEditor] = useState<TipTapEditor | null>(null);
      const [title, setTitle] = useState('Full Title');
      const [slug, setSlug] = useState('full-title');
      const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');

      useTipTapWebMCP({
        editor,
        content,
        setContent,
        title,
        setTitle,
        slug,
        setSlug,
        status,
        setStatus,
        entryType: 'post',
      });

      return (
        <div>
          <RichTextEditor
            value={content}
            onChange={setContent}
            onEditorReady={setEditor}
          />
        </div>
      );
    };

    it('successfully connects with RichTextEditor onEditorReady and inserts content into DOM', async () => {
      const registry = new WebMCPRegistry();
      const { container } = render(
        <WebMCPProvider registry={registry}>
          <FullEditorComponent />
        </WebMCPProvider>
      );

      // Wait for TipTap editor DOM to mount
      await waitFor(() => {
        expect(container.querySelector('.tiptap')).not.toBeNull();
      });

      // Insert content via WebMCP tool
      const res = await registry.callTool('editor_insert_content', {
        content: '<p>Inserted by WebMCP Agent</p>',
        position: 'end',
      });

      expect(res.isError).toBeFalsy();
      await waitFor(() => {
        expect(container.querySelector('.tiptap')?.textContent).toContain('Inserted by WebMCP Agent');
      });
    });
  });
});
