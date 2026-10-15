import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { TemplatesList } from './TemplatesList';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import type { TemplateItem } from './types';

const createQueryClient = (role = 'admin', templates: TemplateItem[] = []) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  client.setQueryData(['me'], { role });
  client.setQueryData(['content-types'], templates);

  return client;
};

const sampleTemplates: TemplateItem[] = [
  {
    id: 'post',
    name: 'Post Template',
    description: 'Standard blog post layout and schema',
    schema_json: '[{"name": "title", "type": "text"}]',
    is_locked: true,
  },
  {
    id: 'hero-banner',
    name: 'Hero Banner',
    description: 'Marketing homepage hero banner with CTA',
    schema_json: '[{"name": "heading", "type": "text"}]',
    is_locked: false,
  },
  {
    id: 'newsletter',
    name: 'Newsletter Signup',
    description: 'Subscription form section',
    schema_json: '[{"name": "placeholder", "type": "text"}]',
    is_locked: false,
  },
];

const meta = {
  title: 'Pages/TemplatesList',
  component: TemplatesList,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof TemplatesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const AdminView: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/templates']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient('admin', sampleTemplates)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const DesignerView: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/templates']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient('designer', sampleTemplates)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/templates']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient('admin', [])}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};

export const FilteredBySearch: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/templates?q=hero']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient('admin', sampleTemplates)}>
            <Story />
          </QueryClientProvider>
        </Theme>
      </MemoryRouter>
    ),
  ],
};
