import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { NotFound } from './NotFound';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';

const meta = {
  title: 'Pages/NotFound',
  component: NotFound,
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof NotFound>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) => (
      <MemoryRouter initialEntries={['/some-invalid-page']}>
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <Story />
        </Theme>
      </MemoryRouter>
    ),
  ],
};
