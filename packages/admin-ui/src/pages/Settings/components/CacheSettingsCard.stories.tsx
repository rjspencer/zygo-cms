import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Theme, Box } from '@radix-ui/themes';
import { CacheSettingsCard } from './CacheSettingsCard';

const meta = {
  title: 'Settings/CacheSettingsCard',
  component: CacheSettingsCard,
  parameters: { layout: 'padded' },
  args: { onClear: () => {} },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <Box style={{ maxWidth: '800px', margin: '20px auto' }}>
          <Story />
        </Box>
      </Theme>
    ),
  ],
} satisfies Meta<typeof CacheSettingsCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Clearing: Story = { args: { isClearing: true } };

export const Success: Story = { args: { isSuccess: true } };

export const Failed: Story = { args: { errorMessage: 'Failed to clear cache' } };
