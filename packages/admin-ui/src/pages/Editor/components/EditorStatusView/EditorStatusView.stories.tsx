import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { EditorStatusView } from './EditorStatusView';

const meta = {
  title: 'Pages/Editor/EditorStatusView',
  component: EditorStatusView,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <Story />
        </Theme>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof EditorStatusView>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Loading: Story = {
  args: {
    status: 'loading',
  },
};

export const ErrorState: Story = {
  args: {
    status: 'error',
    errorMessage: 'Failed to fetch entry (500)',
    onRetry: () => {},
  },
};
