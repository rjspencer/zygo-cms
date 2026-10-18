import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { LivePreviewPane } from './LivePreviewPane';

const meta: Meta<typeof LivePreviewPane> = {
  title: 'Editor/Subcomponents/LivePreviewPane',
  component: LivePreviewPane,
  decorators: [
    (Story) => (
      <Theme>
        <Box p="4" style={{ height: '600px', display: 'flex' }}>
          <Story />
        </Box>
      </Theme>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof LivePreviewPane>;

export const DefaultEmpty: Story = {
  args: {
    previewHtml: '',
    previewCss: '',
  },
};

export const RenderedPost: Story = {
  args: {
    previewHtml: `
      <article style="padding: 2rem; max-width: 700px; margin: 0 auto; font-family: sans-serif;">
        <h1 style="color: #111;">Getting Started with Zygo CMS</h1>
        <p style="color: #555; line-height: 1.6;">
          Zygo CMS is an edge-native content management system built with Rust, Cloudflare Workers, and D1.
        </p>
        <blockquote style="border-left: 4px solid #00a2c7; margin: 1.5rem 0; padding-left: 1rem; color: #333;">
          Experience sub-millisecond page loads with automatic edge caching.
        </blockquote>
      </article>
    `,
    previewCss: 'body { background-color: #fafafa; }',
  },
};

export const RenderedPageWithSections: Story = {
  args: {
    previewHtml: `
      <div style="font-family: sans-serif;">
        <section style="background: linear-gradient(135deg, #0091ff, #00c7be); color: white; padding: 4rem 2rem; text-align: center;">
          <h1 style="font-size: 2.5rem; margin-bottom: 1rem;">Build at the Edge</h1>
          <p style="font-size: 1.25rem; opacity: 0.9;">Decoupled architecture for next-generation digital experiences.</p>
        </section>
        <section style="padding: 3rem 2rem; max-width: 800px; margin: 0 auto;">
          <h2>Features</h2>
          <ul style="line-height: 1.8;">
            <li>Zero-latency Cloudflare D1 integration</li>
            <li>TipTap rich text & modular page sections</li>
            <li>Full WebMCP AI agent parity</li>
          </ul>
        </section>
      </div>
    `,
    previewCss: '',
  },
};
