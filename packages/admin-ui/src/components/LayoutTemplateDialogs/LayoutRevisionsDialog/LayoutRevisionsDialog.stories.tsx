import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { LayoutRevisionsDialog } from './LayoutRevisionsDialog';
import type { LayoutTemplateRevision } from '../../../types/layoutTemplate';

const onOpenChange = fn();
const onRestore = fn();

const mockRevisions: LayoutTemplateRevision[] = [
  {
    id: 'rev-1',
    layout_template_id: 'template-posts',
    template_html: '<html><body>Posts</body></html>',
    template_css: 'body { color: red; }',
    created_at: '2026-10-14 10:00:00',
  },
  {
    id: 'rev-2',
    layout_template_id: 'template-posts',
    template_html: '<html><body>Posts v2</body></html>',
    template_css: 'body { color: blue; }',
    created_at: '2026-10-15 12:00:00',
  },
];

const meta = {
  title: 'LayoutTemplateDialogs/LayoutRevisionsDialog',
  component: LayoutRevisionsDialog,
  decorators: [
    (Story) => (
      <Theme>
        <Story />
      </Theme>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof LayoutRevisionsDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange,
    revisions: mockRevisions,
    isLoading: false,
    onRestore,
    isSaving: false,
  },
};

export const Loading: Story = {
  args: {
    open: true,
    onOpenChange,
    revisions: [],
    isLoading: true,
    onRestore,
    isSaving: false,
  },
};

export const Empty: Story = {
  args: {
    open: true,
    onOpenChange,
    revisions: [],
    isLoading: false,
    onRestore,
    isSaving: false,
  },
};
