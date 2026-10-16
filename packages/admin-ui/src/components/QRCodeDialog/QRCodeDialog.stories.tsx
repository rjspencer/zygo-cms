import type { Meta, StoryObj } from '@storybook/react';
import { QRCodeDialog } from './QRCodeDialog';
import { Theme } from '@radix-ui/themes';

const meta = {
  title: 'Components/QRCodeDialog',
  component: QRCodeDialog,
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="blue" radius="medium">
        <div style={{ padding: '2rem' }}>
          <Story />
        </div>
      </Theme>
    ),
  ],
} satisfies Meta<typeof QRCodeDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    url: 'https://zygodactylstudios.com/fall-campaign?utm_source=test',
  },
};
