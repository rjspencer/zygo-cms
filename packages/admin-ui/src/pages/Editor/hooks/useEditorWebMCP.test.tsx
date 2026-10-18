import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Theme } from '@radix-ui/themes';
import { WebMCPRegistry } from '../../../lib/webmcp/registry';
import { WebMCPProvider } from '../../../providers/WebMCPProvider';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import type { EntryFormValues, EntryType } from '../types';
import { EMPTY_FORM_VALUES } from '../utils/entryForm';
import { EditorUIStateProvider, useEditorUIState } from '../context/EditorUIStateContext';
import { useEditorWebMCP } from './useEditorWebMCP';
import { TitleEditor } from '../components/TitleEditor/TitleEditor';
import { SectionList } from '../components/ContentTab/components/SectionList/SectionList';

const mockSectionTemplates: SectionTemplate[] = [
  {
    id: 'hero',
    name: 'Hero Banner',
    description: 'Header banner with title and call-to-action',
    schema_json: JSON.stringify([
      { name: 'headline', type: 'text', label: 'Headline', required: true },
      { name: 'subheadline', type: 'text', label: 'Subheadline', required: false },
    ]),
    template_html: '<h1>{{ headline }}</h1>',
  },
  {
    id: 'faq',
    name: 'FAQ Accordion',
    description: 'Frequently Asked Questions',
    schema_json: JSON.stringify([
      { name: 'question', type: 'text', label: 'Question', required: true },
      { name: 'answer', type: 'textarea', label: 'Answer', required: true },
    ]),
    template_html: '<details><summary>{{ question }}</summary>{{ answer }}</details>',
  },
];

interface HarnessProps {
  registry: WebMCPRegistry;
  initialValues?: Partial<EntryFormValues>;
  entryType?: EntryType;
  sectionTemplates?: SectionTemplate[];
  onSaveDraft?: () => Promise<unknown>;
  onPublish?: () => Promise<unknown>;
}

const HookConsumer: React.FC<{
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  saveDraft: () => Promise<unknown>;
  publish: () => Promise<unknown>;
}> = ({ entryType, sectionTemplates, saveDraft, publish }) => {
  useEditorWebMCP({
    editor: null,
    entryType,
    sectionTemplates,
    saveDraft,
    publish,
  });
  return null;
};

const StateInspector: React.FC = () => {
  const uiState = useEditorUIState();
  return (
    <div data-testid="state-inspector">
      <span data-testid="title-editing">{String(uiState?.isTitleEditing)}</span>
      <span data-testid="expanded-map">{JSON.stringify(uiState?.expandedByIndex)}</span>
    </div>
  );
};

const TestEditorHarness: React.FC<HarnessProps> = ({
  registry,
  initialValues = {},
  entryType = 'page',
  sectionTemplates = mockSectionTemplates,
  onSaveDraft = vi.fn().mockResolvedValue({ success: true }),
  onPublish = vi.fn().mockResolvedValue({ success: true }),
}) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, ...initialValues },
  });

  return (
    <Theme>
      <WebMCPProvider registry={registry}>
        <FormProvider {...methods}>
          <EditorUIStateProvider initialTitleEditing={true}>
            <HookConsumer
              entryType={entryType}
              sectionTemplates={sectionTemplates}
              saveDraft={onSaveDraft}
              publish={onPublish}
            />
            <StateInspector />
            <TitleEditor isNewEntry={true} />
            <SectionList sectionTemplates={sectionTemplates} />
          </EditorUIStateProvider>
        </FormProvider>
      </WebMCPProvider>
    </Theme>
  );
};

describe('useEditorWebMCP Integration & Parity', () => {
  let registry: WebMCPRegistry;

  beforeEach(() => {
    registry = new WebMCPRegistry();
  });

  it('registers all expected editor tools with WebMCP registry', () => {
    render(<TestEditorHarness registry={registry} />);

    const tools = registry.getTools().map((t) => t.name);
    expect(tools).toContain('editor_get_content');
    expect(tools).toContain('editor_set_metadata');
    expect(tools).toContain('editor_add_section');
    expect(tools).toContain('editor_update_section');
    expect(tools).toContain('editor_remove_section');
    expect(tools).toContain('editor_move_section');
    expect(tools).toContain('editor_set_sections');
    expect(tools).toContain('editor_save_draft');
    expect(tools).toContain('editor_publish');
  });

  it('retrieves current form content and metadata dynamically via editor_get_content', async () => {
    render(
      <TestEditorHarness
        registry={registry}
        initialValues={{
          title: 'Initial Title',
          slug: 'initial-title',
          status: 'draft',
          content: '<p>Initial body</p>',
          tags: 'tag1, tag2',
          category: 'news',
          sections: [{ type_id: 'hero', data: { headline: 'Welcome' } }],
        }}
      />
    );

    const result = await registry.callTool('editor_get_content', {});
    expect(result.isError).toBeFalsy();
    const data = result.toolResult as any;
    expect(data.title).toBe('Initial Title');
    expect(data.slug).toBe('initial-title');
    expect(data.status).toBe('draft');
    expect(data.content).toBe('<p>Initial body</p>');
    expect(data.tags).toBe('tag1, tag2');
    expect(data.category).toBe('news');
    expect(data.sections).toHaveLength(1);
    expect(data.sections[0].type_id).toBe('hero');
  });

  it('updates metadata and closes title edit mode via editor_set_metadata', async () => {
    render(
      <TestEditorHarness
        registry={registry}
        initialValues={{
          title: 'Draft Title',
          slug: 'draft-title',
        }}
      />
    );

    // Initial state: TitleEditor starts in edit mode (isNewEntry: true)
    expect(screen.getByTestId('title-editing').textContent).toBe('true');
    expect(screen.getByPlaceholderText('Enter title here...')).toBeDefined();

    // Call editor_set_metadata to set new title and slug
    await act(async () => {
      const res = await registry.callTool('editor_set_metadata', {
        title: 'Committed New Title',
        slug: 'committed-new-title',
        category: 'updates',
      });
      expect(res.isError).toBeFalsy();
    });

    // Check that title editing mode was closed
    expect(screen.getByTestId('title-editing').textContent).toBe('false');

    // Title should now render as heading
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Committed New Title');

    // Querying content via tool confirms values updated in RHF
    const contentRes = await registry.callTool('editor_get_content', {});
    const contentData = contentRes.toolResult as any;
    expect(contentData.title).toBe('Committed New Title');
    expect(contentData.slug).toBe('committed-new-title');
    expect(contentData.category).toBe('updates');
  });

  it('adds section, updates RHF state, and expands the newly added section', async () => {
    render(<TestEditorHarness registry={registry} initialValues={{ sections: [] }} />);

    await act(async () => {
      const res = await registry.callTool('editor_add_section', {
        type_id: 'hero',
        data: { headline: 'Agent Headline' },
      });
      expect(res.isError).toBeFalsy();
      expect((res.toolResult as any).success).toBe(true);
      expect((res.toolResult as any).index).toBe(0);
    });

    // Verify section was added to state
    const contentRes = await registry.callTool('editor_get_content', {});
    const sections = (contentRes.toolResult as any).sections;
    expect(sections).toHaveLength(1);
    expect(sections[0].type_id).toBe('hero');
    expect(sections[0].data.headline).toBe('Agent Headline');

    // Verify section expansion state was updated
    const expandedMap = JSON.parse(screen.getByTestId('expanded-map').textContent || '{}');
    expect(expandedMap[0]).toBe(true);
  });

  it('updates an existing section via editor_update_section', async () => {
    render(
      <TestEditorHarness
        registry={registry}
        initialValues={{
          sections: [{ type_id: 'hero', data: { headline: 'Old Headline' } }],
        }}
      />
    );

    await act(async () => {
      const res = await registry.callTool('editor_update_section', {
        index: 0,
        data: { headline: 'Updated Headline', subheadline: 'Added Subheadline' },
      });
      expect(res.isError).toBeFalsy();
    });

    const contentRes = await registry.callTool('editor_get_content', {});
    const sections = (contentRes.toolResult as any).sections;
    expect(sections[0].data.headline).toBe('Updated Headline');
    expect(sections[0].data.subheadline).toBe('Added Subheadline');
  });

  it('removes a section via editor_remove_section', async () => {
    render(
      <TestEditorHarness
        registry={registry}
        initialValues={{
          sections: [
            { type_id: 'hero', data: { headline: 'Section 0' } },
            { type_id: 'faq', data: { question: 'Section 1' } },
          ],
        }}
      />
    );

    await act(async () => {
      const res = await registry.callTool('editor_remove_section', { index: 0 });
      expect(res.isError).toBeFalsy();
    });

    const contentRes = await registry.callTool('editor_get_content', {});
    const sections = (contentRes.toolResult as any).sections;
    expect(sections).toHaveLength(1);
    expect(sections[0].type_id).toBe('faq');
  });

  it('reorders and batch-replaces sections via editor_set_sections', async () => {
    render(
      <TestEditorHarness
        registry={registry}
        initialValues={{
          sections: [{ type_id: 'hero', data: { headline: 'Hero' } }],
        }}
      />
    );

    await act(async () => {
      const res = await registry.callTool('editor_set_sections', {
        sections: [
          { type_id: 'faq', data: { question: 'FAQ 1' } },
          { type_id: 'faq', data: { question: 'FAQ 2' } },
        ],
      });
      expect(res.isError).toBeFalsy();
    });

    const contentRes = await registry.callTool('editor_get_content', {});
    const sections = (contentRes.toolResult as any).sections;
    expect(sections).toHaveLength(2);
    expect(sections[0].type_id).toBe('faq');
    expect(sections[1].type_id).toBe('faq');
  });

  it('triggers onSaveDraft and onPublish handlers via tool execution', async () => {
    const mockSaveDraft = vi.fn().mockResolvedValue({ success: true, draft: true });
    const mockPublish = vi.fn().mockResolvedValue({ success: true, published: true });

    render(
      <TestEditorHarness
        registry={registry}
        onSaveDraft={mockSaveDraft}
        onPublish={mockPublish}
      />
    );

    await act(async () => {
      const resDraft = await registry.callTool('editor_save_draft', {});
      expect(resDraft.isError).toBeFalsy();
    });
    expect(mockSaveDraft).toHaveBeenCalledTimes(1);

    await act(async () => {
      const resPublish = await registry.callTool('editor_publish', {});
      expect(resPublish.isError).toBeFalsy();
    });
    expect(mockPublish).toHaveBeenCalledTimes(1);
  });
});
