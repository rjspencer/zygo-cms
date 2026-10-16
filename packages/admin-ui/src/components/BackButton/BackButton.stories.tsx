import type { Meta, StoryObj } from '@storybook/react';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { MemoryRouter } from 'react-router-dom';
import { BackButton } from './BackButton';

const meta = {
  title: 'Components/BackButton',
  component: BackButton,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Theme>
          <Story />
        </Theme>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof BackButton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    to: '/entries',
  },
};

export const CustomLabel: Story = {
  args: {
    label: 'Back to Articles',
    to: '/entries',
  },
};
