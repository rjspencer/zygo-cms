import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Settings } from './Settings';
import { Theme } from '@radix-ui/themes';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import type { SettingsApiResponse } from './types';

const createQueryClient = (settingsData?: SettingsApiResponse) => {
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  if (settingsData) {
    client.setQueryData(['settings'], settingsData);
  }
  client.setQueryData(['ai-crawl-settings'], {
    configured: true,
    ai_bots_protection: 'disabled',
    ai_search: 'disabled',
    ai_training: 'disabled',
    ai_user: 'disabled',
  });
  return client;
};

const renderWithRouter = (story: React.ReactNode, settingsData?: SettingsApiResponse) => {
  const router = createMemoryRouter([
    {
      path: '/',
      element: (
        <Theme appearance="light" accentColor="cyan" radius="medium">
          <QueryClientProvider client={createQueryClient(settingsData)}>
            {story}
          </QueryClientProvider>
        </Theme>
      ),
    },
  ]);
  return <RouterProvider router={router} />;
};

const meta = {
  title: 'Pages/Settings',
  component: Settings,
  parameters: {
    layout: 'padded',
  },
} satisfies Meta<typeof Settings>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [
    (Story) =>
      renderWithRouter(<Story />, {
        site_title: 'My Awesome Zygo Site',
        canonical_origin: 'https://example.com',
        description: 'A blazing-fast edge CMS built with Cloudflare and Rust.',
        analytics_enabled: 'false',
        docs_mode_enabled: 'false',
        docs_path: '/docs',
        site_logo: '',
        site_logo_dark: '',
        site_favicon: '',
        default_og_image: '',
        footer_text: '',
      }),
  ],
};

export const WithBrandingConfigured: Story = {
  decorators: [
    (Story) =>
      renderWithRouter(<Story />, {
        site_title: 'My Awesome Zygo Site',
        canonical_origin: 'https://example.com',
        description: 'A blazing-fast edge CMS built with Cloudflare and Rust.',
        analytics_enabled: 'false',
        docs_mode_enabled: 'false',
        docs_path: '/docs',
        site_logo: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
        site_logo_dark: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=120&auto=format&fit=crop&q=80',
        site_favicon: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=32&auto=format&fit=crop&q=80',
        default_og_image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=80',
        footer_text: '© 2026 Zygo CMS. All rights reserved.',
      }),
  ],
};

export const DocsModeActive: Story = {
  decorators: [
    (Story) =>
      renderWithRouter(<Story />, {
        site_title: 'Documentation Portal',
        canonical_origin: 'https://docs.example.com',
        description: 'Comprehensive guides and API reference.',
        analytics_enabled: 'false',
        docs_mode_enabled: 'true',
        docs_path: '/documentation',
      }),
  ],
};

export const AnalyticsActive: Story = {
  decorators: [
    (Story) =>
      renderWithRouter(<Story />, {
        site_title: 'Production Blog',
        canonical_origin: 'https://blog.example.com',
        description: 'Tech articles and developer tutorials.',
        analytics_enabled: 'true',
        docs_mode_enabled: 'false',
        docs_path: '/docs',
      }),
  ],
};

export const Empty: Story = {
  decorators: [
    (Story) =>
      renderWithRouter(<Story />, {
        site_title: '',
        canonical_origin: '',
        description: '',
        analytics_enabled: 'false',
        docs_mode_enabled: 'false',
        docs_path: '/docs',
      }),
  ],
};
