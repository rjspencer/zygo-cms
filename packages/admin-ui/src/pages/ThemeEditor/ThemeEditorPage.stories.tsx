import type { Meta, StoryObj } from '@storybook/react';
import { ThemeEditorPage } from './ThemeEditorPage';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import '@radix-ui/themes/styles.css';

const meta = {
  title: 'Pages/ThemeEditorPage',
  component: ThemeEditorPage,
  parameters: {
    layout: 'fullscreen',
  },
  decorators: [
    (Story) => (
      <Theme>
        <MemoryRouter initialEntries={['/theme/editor/modern-editorial']}>
          <Routes>
            <Route path="/theme/editor/:id" element={<Story />} />
          </Routes>
        </MemoryRouter>
      </Theme>
    ),
  ],
} satisfies Meta<typeof ThemeEditorPage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
