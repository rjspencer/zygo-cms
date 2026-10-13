import type { Meta, StoryObj } from '@storybook/react';
import { fn, userEvent, fireEvent, within, expect } from '@storybook/test';
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

export const ExecuteToolInDrawer: Story = {
  args: {
    open: true,
    onOpenChange,
  },
  play: async () => {
    const body = within(document.body);
    const toolsTab = await body.findByRole('tab', { name: /Registered Tools/i });
    await userEvent.click(toolsTab);

    const runBtn = await body.findByRole('button', { name: 'Run custom_page_tool' });
    await userEvent.click(runBtn);

    const argsInput = await body.findByLabelText('Tool Arguments JSON');
    await expect(argsInput).toBeInTheDocument();

    const executeBtn = await body.findByRole('button', { name: 'Execute Tool' });
    await userEvent.click(executeBtn);

    const output = await body.findByTestId('tool-runner-output');
    await expect(output).toHaveTextContent('ok');
  },
};

export const ExecuteBatchRpcInDrawer: Story = {
  args: {
    open: true,
    onOpenChange,
  },
  play: async () => {
    const body = within(document.body);
    const rpcTab = await body.findByRole('tab', { name: /RPC Console/i });
    await userEvent.click(rpcTab);

    const payloadInput = await body.findByLabelText('RPC Payload JSON');
    fireEvent.change(payloadInput, {
      target: {
        value: JSON.stringify([
          { name: 'custom_page_tool', arguments: {} },
          { name: 'custom_page_tool', arguments: {} },
        ]),
      },
    });

    const executeRpcBtn = await body.findByRole('button', { name: 'Execute RPC' });
    await userEvent.click(executeRpcBtn);

    const output = await body.findByTestId('rpc-runner-output');
    await expect(output).toHaveTextContent('ok');
  },
};
