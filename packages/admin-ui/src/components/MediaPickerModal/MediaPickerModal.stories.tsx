import type { Meta, StoryObj } from '@storybook/react';
import { fn } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MediaPickerModal } from './MediaPickerModal';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const meta = {
  title: 'Components/MediaPickerModal',
  component: MediaPickerModal,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <Story />
        </Theme>
      </QueryClientProvider>
    ),
  ],
  args: {
    onClose: fn(),
    onSelect: fn(),
  },
} satisfies Meta<typeof MediaPickerModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
  },
};

export const Closed: Story = {
  args: {
    open: false,
  },
};
