import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { DeleteDocDialog } from './DeleteDocDialog';

const meta = {
  title: 'Pages/DocsList/DeleteDocDialog',
  component: DeleteDocDialog,
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
} satisfies Meta<typeof DeleteDocDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    doc: {
      id: 1,
      title: 'Guide Overview',
      slug: 'overview',
      path: '/docs/overview',
      status: 'published',
      updatedAt: '2026-03-01',
      parent_id: null,
      sort_order: 1,
    },
    isOpen: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    isDeleting: false,
  },
};

export const Deleting: Story = {
  args: {
    doc: {
      id: 1,
      title: 'Guide Overview',
      slug: 'overview',
      path: '/docs/overview',
      status: 'published',
      updatedAt: '2026-03-01',
      parent_id: null,
      sort_order: 1,
    },
    isOpen: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    isDeleting: true,
  },
};
