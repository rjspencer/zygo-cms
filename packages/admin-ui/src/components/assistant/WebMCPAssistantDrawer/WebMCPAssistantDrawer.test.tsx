import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/test-utils';
import { WebMCPAssistantDrawer } from './WebMCPAssistantDrawer';
import { WebMCPProvider } from '../../../providers/WebMCPProvider';
import { WebMCPRegistry } from '../../../lib/webmcp/registry';

const createMockRegistry = () => {
  const registry = new WebMCPRegistry();
  registry.registerTool({
    name: 'test_tool',
    description: 'A test tool for drawer unit test',
    inputSchema: { type: 'object' },
    handler: async (args) => ({
      content: [{ type: 'text', text: `result: ${JSON.stringify(args)}` }],
    }),
  });
  return registry;
};

describe('WebMCPAssistantDrawer', () => {
  it('renders status badge and settings switches', () => {
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    expect(screen.getByText('WebMCP Assistant')).toBeDefined();
    expect(screen.getByText('Connected (In-Browser)')).toBeDefined();
    expect(screen.getByLabelText('Enable External WebSocket Bridge')).toBeDefined();
    expect(screen.getByLabelText('Require Confirmation for Sensitive Actions')).toBeDefined();
  });

  it('toggles external bridge and updates status badge', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    const bridgeSwitch = screen.getByLabelText('Enable External WebSocket Bridge');
    await user.click(bridgeSwitch);

    expect(screen.getByText('External Bridge Active')).toBeDefined();
  });

  it('displays registered tools and executes a tool in runner', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    // Click Registered Tools tab
    const toolsTab = screen.getByRole('tab', { name: /Registered Tools/i });
    await user.click(toolsTab);

    // Verify tool name and description
    expect(screen.getByText('test_tool')).toBeDefined();
    expect(screen.getByText('A test tool for drawer unit test')).toBeDefined();

    // Click run tool button
    const runBtn = screen.getByRole('button', { name: 'Run test_tool' });
    await user.click(runBtn);

    // Verify input schema and execute tool
    expect(screen.getByLabelText('Tool Arguments JSON')).toBeDefined();
    const executeBtn = screen.getByRole('button', { name: 'Execute Tool' });
    await user.click(executeBtn);

    // Verify tool runner output
    const output = await screen.findByTestId('tool-runner-output');
    expect(output.textContent).toContain('result: {}');
  });

  it('calls onOpenChange when close button is clicked', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={onOpenChange} />
      </WebMCPProvider>
    );

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    await user.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
