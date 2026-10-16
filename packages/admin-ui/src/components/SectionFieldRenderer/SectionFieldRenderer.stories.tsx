import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { SectionFieldRenderer } from './SectionFieldRenderer';
import type { SectionTemplateField } from '../../types/sectionTemplate';

const meta = {
  title: 'Components/SectionFieldRenderer',
  component: SectionFieldRenderer,
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <div style={{ maxWidth: 640, padding: 24 }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof SectionFieldRenderer>;

export default meta;
type Story = StoryObj<typeof meta>;

const sampleFields: SectionTemplateField[] = [
  { name: 'headline', type: 'text', label: 'Headline', required: true },
  { name: 'bio', type: 'textarea', label: 'Bio' },
  { name: 'website', type: 'url', label: 'Website' },
  { name: 'is_featured', type: 'boolean', label: 'Featured' },
  { name: 'avatar', type: 'image', label: 'Avatar' },
  { name: 'promo_video', type: 'video', label: 'Promo Video' },
  { name: 'role', type: 'select', label: 'Role', options: ['Admin', 'Editor', 'Viewer'] },
  { name: 'content', type: 'richtext', label: 'Rich Content' },
  {
    name: 'items',
    type: 'list',
    label: 'Items',
    fields: [
      { name: 'item_name', type: 'text', label: 'Item Name' },
      { name: 'item_desc', type: 'textarea', label: 'Item Description' },
    ],
  },
];

export const AllFieldTypes: Story = {
  args: {
    fields: sampleFields,
    data: {
      headline: 'Featured Product',
      bio: 'Leading the frontier of edge technology.',
      website: 'https://zygo.dev',
      is_featured: true,
      avatar: '/media/avatar.png',
      promo_video: '/media/demo.mp4',
      role: 'Admin',
      content: '<p>Zygo CMS is lightning fast.</p>',
      items: [
        { item_name: 'Edge Workers', item_desc: 'Zero-latency execution.' },
      ],
    },
    onChange: () => {},
  },
};

export const EmptySchema: Story = {
  args: {
    fields: [],
    data: {},
    onChange: () => {},
  },
};
