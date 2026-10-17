import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import type { SectionTemplate } from '../../types/sectionTemplate';
import { Editor } from './Editor';

const sampleTemplates: SectionTemplate[] = [
  {
    id: 'hero',
    name: 'Hero Banner',
    description: 'Top hero banner',
    schema_json: JSON.stringify([
      { name: 'heading', type: 'text', label: 'Heading', required: true },
      { name: 'subheading', type: 'textarea', label: 'Subheading', required: false },
    ]),
    template_html: '<section class="hero"><h1>{{ heading }}</h1><p>{{ subheading }}</p></section>',
    template_css: '.hero { padding: 2rem; }',
  },
];

const samplePageEntry = {
  entry: {
    id: 1,
    title: 'Landing Page',
    slug: 'landing-page',
    type: 'page',
    status: 'published',
    description: 'Welcome landing page',
    body_html: '',
    body_json: JSON.stringify([
      {
        type_id: 'hero',
        data: {
          heading: 'Build Better with Zygo',
          subheading: 'Modern, ultra-fast Cloudflare Workers CMS',
        },
      },
    ]),
    tags: 'landing, page',
    category: 'Pages',
    cover_image: '',
    canonical_url: 'https://example.com/landing-page',
    schema_json: '',
    parent_id: null,
    sort_order: 0,
  },
  pages: [{ id: 1, slug: 'landing-page' }],
};

const samplePostEntry = {
  entry: {
    id: 2,
    title: 'Getting Started with Zygo CMS',
    slug: 'getting-started-with-zygo-cms',
    type: 'post',
    status: 'draft',
    description: 'Learn how to get started with Zygo CMS in 5 minutes.',
    body_html: '<p>Zygo CMS is an edge-native content management system designed for speed and reliability.</p>',
    body_json: '{}',
    tags: 'getting-started, guide',
    category: 'Guides',
    cover_image: '',
    canonical_url: '',
    schema_json: '',
    parent_id: null,
    sort_order: 0,
  },
  pages: [],
};

interface CreateEditorQueryClientOptions {
  sectionTemplates?: SectionTemplate[];
  entryId?: string;
  entryData?: {
    entry?: Record<string, any>;
    pages?: Array<{ id?: number | string; slug?: string }>;
  };
}

const createEditorQueryClient = (options: CreateEditorQueryClientOptions = {}) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  queryClient.setQueryData(['sectionTemplates'], options.sectionTemplates ?? sampleTemplates);

  if (options.entryId && options.entryData) {
    queryClient.setQueryData(['editorEntry', options.entryId], options.entryData);
  }

  return queryClient;
};

const renderEditorRouter = (
  initialEntry: string,
  pathPattern: string,
  options: CreateEditorQueryClientOptions,
  Story: React.ComponentType
) => {
  const queryClient = createEditorQueryClient(options);
  const router = createMemoryRouter(
    [
      {
        path: pathPattern,
        element: (
          <WebMCPProvider>
            <Theme appearance="light" accentColor="cyan" radius="medium">
              <QueryClientProvider client={queryClient}>
                <Story />
              </QueryClientProvider>
            </Theme>
          </WebMCPProvider>
        ),
      },
      {
        path: '*',
        element: <div style={{ padding: 20 }}>Navigated away from editor</div>,
      },
    ],
    { initialEntries: [initialEntry] }
  );

  return <RouterProvider router={router} />;
};

const meta = {
  title: 'Pages/Editor',
  component: Editor,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Editor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const NewPost: Story = {
  decorators: [
    (Story) => renderEditorRouter('/posts/editor/new', '/posts/editor/new', {}, Story),
  ],
};

export const NewPage: Story = {
  decorators: [
    (Story) =>
      renderEditorRouter(
        '/pages/editor/new',
        '/pages/editor/new',
        { sectionTemplates: sampleTemplates },
        Story
      ),
  ],
};

export const EditExistingPage: Story = {
  decorators: [
    (Story) =>
      renderEditorRouter(
        '/pages/editor/1',
        '/pages/editor/:id',
        {
          entryId: '1',
          entryData: samplePageEntry,
        },
        Story
      ),
  ],
};

export const EditExistingPost: Story = {
  decorators: [
    (Story) =>
      renderEditorRouter(
        '/posts/editor/2',
        '/posts/editor/:id',
        {
          entryId: '2',
          entryData: samplePostEntry,
        },
        Story
      ),
  ],
};
