import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, within, expect } from '@storybook/test';
import { Theme } from '@radix-ui/themes';
import '@radix-ui/themes/styles.css';
import { MemoryRouter } from 'react-router-dom';
import { WebMCPAssistantDrawer } from './WebMCPAssistantDrawer';
import { WebMCPProvider } from '../../providers/WebMCPProvider';
import { WebMCPRegistry } from '../../lib/webmcp/registry';

const onOpenChange = fn();

const createMockRegistry = () => {
  const registry = new WebMCPRegistry();
  registry.registerTool({
    name: 'custom_page_tool',
    description: 'A mock contextual tool for Storybook testing',
    inputSchema: { type: 'object' },
    handler: () => ({ content: [{ type: 'text', text: 'ok' }] }),
  });
  return registry;
};

const meta = {
  title: 'Assistant/WebMCPAssistantDrawer',
  component: WebMCPAssistantDrawer,
  decorators: [
    (Story) => (
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={createMockRegistry()}>
            <Story />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    ),
  ],
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof WebMCPAssistantDrawer>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    open: true,
    onOpenChange,
  },
  play: async () => {
    const body = within(document.body);
    const bridgeSwitch = await body.findByLabelText('Enable External WebSocket Bridge');
    await expect(bridgeSwitch).toBeInTheDocument();
  },
};

export const RegisteredToolsTab: Story = {
  args: {
    open: true,
    onOpenChange,
  },
  play: async () => {
    const body = within(document.body);
    const toolsTab = await body.findByRole('tab', { name: /Registered Tools/i });
    await userEvent.click(toolsTab);
    const toolName = await body.findByText('custom_page_tool');
    await expect(toolName).toBeInTheDocument();
  },
};
