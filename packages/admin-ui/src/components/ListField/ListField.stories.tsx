import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { ListField } from './ListField';
import type { SectionTemplateField } from '../../types/sectionTemplate';

const sampleField: SectionTemplateField = {
  name: 'features',
  type: 'list',
  label: 'Features List',
  fields: [
    { name: 'title', type: 'text', label: 'Title', required: true },
    { name: 'description', type: 'textarea', label: 'Description' },
    { name: 'is_active', type: 'boolean', label: 'Active' },
  ],
};

const meta = {
  title: 'Components/ListField',
  component: ListField,
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <div style={{ maxWidth: 640, padding: 24 }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof ListField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithItems: Story = {
  args: {
    field: sampleField,
    items: [
      { title: 'Edge Computing', description: 'Zero cold starts with Cloudflare Workers.', is_active: true },
      { title: 'D1 Database', description: 'Serverless SQLite at the edge.', is_active: true },
      { title: 'Radix Themes', description: 'Accessible and beautiful design system.', is_active: false },
    ],
    onChange: () => {},
  },
};

export const EmptyList: Story = {
  args: {
    field: sampleField,
    items: [],
    onChange: () => {},
  },
};
