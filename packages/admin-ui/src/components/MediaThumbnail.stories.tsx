import type { Meta, StoryObj } from '@storybook/react';
import { expect, within } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import { MediaThumbnail } from './MediaThumbnail';

const meta = {
  title: 'Components/MediaThumbnail',
  component: MediaThumbnail,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="blue" radius="medium">
        <div style={{ width: '280px', height: '180px' }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof MediaThumbnail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Image: Story = {
  args: {
    src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='560' height='360'%3E%3Crect width='100%25' height='100%25' fill='%2394a3b8'/%3E%3Ccircle cx='280' cy='180' r='72' fill='%23f1f5f9'/%3E%3C/svg%3E",
    alt: 'Sample thumbnail artwork',
    type: 'image/svg+xml',
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      canvas.getByRole('img', { name: 'Sample thumbnail artwork' })
    ).toBeInTheDocument();
  },
};

export const NonImageFallback: Story = {
  args: {
    src: '/media/document.pdf',
    alt: 'PDF document',
    type: 'application/pdf',
  },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('svg')).not.toBeNull();
  },
};
