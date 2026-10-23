import type { Meta, StoryObj } from '@storybook/react';
import { userEvent } from '@storybook/test';
import '@radix-ui/themes/styles.css';
import { Theme, Box } from '@radix-ui/themes';
import { BackupPortabilityCard } from './BackupPortabilityCard';

const meta = {
  title: 'Pages/Settings/Components/BackupPortabilityCard',
  component: BackupPortabilityCard,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <Theme appearance="light" accentColor="cyan" radius="medium">
        <Box style={{ maxWidth: '800px', margin: '20px auto' }}>
          <Story />
        </Box>
      </Theme>
    ),
  ],
} satisfies Meta<typeof BackupPortabilityCard>;

export default meta;
type Story = StoryObj<typeof meta>;

/**
 * Standard initial state with Export and Upload buttons.
 */
export const Default: Story = {};

/**
 * Modal open state simulating parsed preview counts (e.g. 5 settings, 2 menus, 8 templates, 14 entries, 3 redirects).
 */
export const WithDryRunPreview: Story = {
  play: async ({ canvasElement }) => {
    const fileInput = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      const mockBackup = {
        version: '1.0',
        exported_at: '2026-10-23T12:00:00Z',
        settings: { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5 },
        menus: [1, 2],
        section_templates: [1, 2, 3, 4],
        layout_templates: [1, 2, 3, 4],
        entries: Array(14).fill({}),
        redirects: [1, 2, 3],
      };

      const origFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/admin/import')) {
          return new Response(
            JSON.stringify({
              counts: {
                settings: 5,
                menus: 2,
                section_templates: 4,
                layout_templates: 4,
                entries: 14,
                redirects: 3,
              },
              warnings: [],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return origFetch(input, init);
      };

      const file = new File([JSON.stringify(mockBackup)], 'zygo-backup-preview.json', {
        type: 'application/json',
      });
      await userEvent.upload(fileInput, file);
    }
  },
};

/**
 * Dry-run modal displaying non-fatal warnings (e.g. duplicate slug resolved).
 */
export const WithWarnings: Story = {
  play: async ({ canvasElement }) => {
    const fileInput = canvasElement.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) {
      const mockBackup = {
        version: '1.0',
        exported_at: '2026-10-23T12:00:00Z',
        settings: { s1: 1, s2: 2, s3: 3, s4: 4, s5: 5 },
        menus: [1, 2],
        section_templates: [1, 2, 3, 4],
        layout_templates: [1, 2, 3, 4],
        entries: Array(14).fill({}),
        redirects: [1, 2, 3],
      };

      const origFetch = window.fetch;
      window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = typeof input === 'string' ? input : (input as Request).url;
        if (url.includes('/api/admin/import')) {
          return new Response(
            JSON.stringify({
              counts: {
                settings: 5,
                menus: 2,
                section_templates: 4,
                layout_templates: 4,
                entries: 14,
                redirects: 3,
              },
              warnings: [
                'Duplicate slug "/about" detected: existing entry will be overwritten',
                'Media asset "hero.webp" already exists in storage and will be reused',
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return origFetch(input, init);
      };

      const file = new File([JSON.stringify(mockBackup)], 'zygo-backup-warnings.json', {
        type: 'application/json',
      });
      await userEvent.upload(fileInput, file);
    }
  },
};

/**
 * Component rendered within Radix Theme appearance="dark".
 */
export const DarkMode: Story = {
  decorators: [
    (Story) => (
      <Theme appearance="dark" accentColor="cyan" radius="medium">
        <Box style={{ maxWidth: '800px', margin: '20px auto' }}>
          <Story />
        </Box>
      </Theme>
    ),
  ],
};
