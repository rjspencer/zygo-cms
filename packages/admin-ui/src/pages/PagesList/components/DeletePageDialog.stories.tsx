import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { DeletePageDialog } from './DeletePageDialog';

const meta = {
  title: 'Pages/PagesList/DeletePageDialog',
  component: DeletePageDialog,
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
} satisfies Meta<typeof DeletePageDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    page: {
      id: 1,
      title: 'About Us',
      slug: '/about',
      status: 'published',
      updatedAt: '2026-03-01',
    },
    isOpen: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    isDeleting: false,
  },
};

export const Deleting: Story = {
  args: {
    page: {
      id: 1,
      title: 'About Us',
      slug: '/about',
      status: 'published',
      updatedAt: '2026-03-01',
    },
    isOpen: true,
    onOpenChange: fn(),
    onConfirm: fn(),
    isDeleting: true,
  },
};
