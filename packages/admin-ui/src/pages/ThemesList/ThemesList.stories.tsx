import type { Meta, StoryObj } from '@storybook/react';
import { ThemesList } from './ThemesList';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import '@radix-ui/themes/styles.css';

const meta = {
  title: 'Pages/ThemesList',
  component: ThemesList,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <Theme>
        <MemoryRouter initialEntries={['/theme']}>
          <div style={{ padding: '2rem' }}>
            <Story />
          </div>
        </MemoryRouter>
      </Theme>
    ),
  ],
} satisfies Meta<typeof ThemesList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
