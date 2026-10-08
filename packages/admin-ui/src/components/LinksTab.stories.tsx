import type { Meta, StoryObj } from '@storybook/react';
import { LinksTab } from './LinksTab';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const meta = {
  title: 'Components/LinksTab',
  component: LinksTab,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="blue" radius="medium">
        <QueryClientProvider client={queryClient}>
          <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <Story />
          </div>
        </QueryClientProvider>
      </Theme>
    ),
  ],
} satisfies Meta<typeof LinksTab>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    entryId: '1',
    baseCanonicalUrl: 'https://zygodactylstudios.com/my-awesome-post',
    isSaved: true,
  },
};

export const UnsavedState: Story = {
  args: {
    entryId: '1',
    baseCanonicalUrl: 'https://zygodactylstudios.com/my-awesome-post',
    isSaved: false,
  },
};
