import type { Meta, StoryObj } from '@storybook/react';
import { within, expect } from '@storybook/test';
import { Box, Flex, Badge, Theme } from '@radix-ui/themes';
import { BrandLogo } from './BrandLogo';

const meta = {
  title: 'Components/BrandLogo',
  component: BrandLogo,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof BrandLogo>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LightExpanded: Story = {
  args: {
    isCollapsed: false,
    themeMode: 'light',
  },
  decorators: [
    (StoryComponent) => (
      <Theme appearance="light" accentColor="cyan" grayColor="slate">
        <Flex
          align="center"
          justify="between"
          px="2"
          py="3"
          style={{ width: '228px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--gray-a4)' }}
        >
          <StoryComponent />
          <Badge color="crimson" variant="soft" size="1">
            v0.1
          </Badge>
        </Flex>
      </Theme>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole('img', { name: 'Zygo CMS' });
    await expect(img).toBeVisible();
  },
};

export const DarkExpanded: Story = {
  args: {
    isCollapsed: false,
    themeMode: 'dark',
  },
  decorators: [
    (StoryComponent) => (
      <Theme appearance="dark" accentColor="cyan" grayColor="slate">
        <Flex
          align="center"
          justify="between"
          px="2"
          py="3"
          style={{ width: '228px', backgroundColor: 'var(--color-background)', borderRadius: '8px', border: '1px solid var(--gray-a4)' }}
        >
          <StoryComponent />
          <Badge color="crimson" variant="soft" size="1">
            v0.1
          </Badge>
        </Flex>
      </Theme>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole('img', { name: 'Zygo CMS' });
    await expect(img).toBeVisible();
  },
};

export const Collapsed: Story = {
  args: {
    isCollapsed: true,
    themeMode: 'light',
  },
  decorators: [
    (StoryComponent) => (
      <Theme appearance="light" accentColor="cyan" grayColor="slate">
        <Box
          py="3"
          style={{
            width: '48px',
            display: 'flex',
            justifyContent: 'center',
            backgroundColor: 'var(--color-background)',
            borderRadius: '8px',
            border: '1px solid var(--gray-a4)',
          }}
        >
          <StoryComponent />
        </Box>
      </Theme>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const img = canvas.getByRole('img', { name: 'Zygo CMS' });
    await expect(img).toBeVisible();
  },
};
