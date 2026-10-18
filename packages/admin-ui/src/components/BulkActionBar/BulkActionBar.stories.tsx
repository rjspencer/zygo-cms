import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { BulkActionBar } from './BulkActionBar';

const meta = {
  title: 'Components/BulkActionBar',
  component: BulkActionBar,
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <div style={{ padding: '24px', maxWidth: '800px' }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof BulkActionBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const SingleSelected: Story = {
  args: {
    selectedCount: 1,
    onClearSelection: () => console.log('Clear selection'),
    onPublish: () => console.log('Publish'),
    onUnpublish: () => console.log('Unpublish'),
    onAddTags: (tags) => console.log('Add tags:', tags),
    onTrash: () => console.log('Trash'),
    isPending: false,
  },
};

export const MultipleSelected: Story = {
  args: {
    selectedCount: 5,
    onClearSelection: () => console.log('Clear selection'),
    onPublish: () => console.log('Publish'),
    onUnpublish: () => console.log('Unpublish'),
    onAddTags: (tags) => console.log('Add tags:', tags),
    onTrash: () => console.log('Trash'),
    isPending: false,
  },
};

export const PendingState: Story = {
  args: {
    selectedCount: 3,
    onClearSelection: () => console.log('Clear selection'),
    onPublish: () => console.log('Publish'),
    onUnpublish: () => console.log('Unpublish'),
    onAddTags: (tags) => console.log('Add tags:', tags),
    onTrash: () => console.log('Trash'),
    isPending: true,
  },
};
