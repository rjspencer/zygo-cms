import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
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

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'WebMCP Assistant' }).textContent).toBe(
      'WebMCP Assistant'
    );
    expect(screen.getByText('Connected (In-Browser)').textContent).toBe('Connected (In-Browser)');

    const bridgeSwitch = screen.getByRole('switch', { name: 'Enable External WebSocket Bridge' });
    expect(bridgeSwitch.getAttribute('aria-checked')).toBe('false');

    const confirmSwitch = screen.getByRole('switch', {
      name: 'Require Confirmation for Sensitive Actions',
    });
    expect(confirmSwitch.getAttribute('aria-checked')).toBe('true');

    expect(screen.getByRole('tab', { name: /Activity Log/i }).getAttribute('data-state')).toBe('active');
    expect(screen.getByRole('tab', { name: /Registered Tools/i }).getAttribute('data-state')).toBe('inactive');
    expect(screen.getByRole('tab', { name: /RPC Console/i }).getAttribute('data-state')).toBe('inactive');
  });

  it('toggles external bridge and updates status badge', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    const bridgeSwitch = screen.getByRole('switch', { name: 'Enable External WebSocket Bridge' });
    expect(bridgeSwitch.getAttribute('aria-checked')).toBe('false');

    await user.click(bridgeSwitch);

    expect(bridgeSwitch.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByText('External Bridge Active').textContent).toBe('External Bridge Active');

    const confirmSwitch = screen.getByRole('switch', {
      name: 'Require Confirmation for Sensitive Actions',
    });
    expect(confirmSwitch.getAttribute('aria-checked')).toBe('true');

    await user.click(confirmSwitch);
    expect(confirmSwitch.getAttribute('aria-checked')).toBe('false');
  });

  it('displays registered tools, executes a tool in runner, and logs activity', async () => {
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
    expect(toolsTab.getAttribute('data-state')).toBe('active');

    // Verify tool name and description
    expect(screen.getByText('test_tool').textContent).toBe('test_tool');
    expect(screen.getByText('A test tool for drawer unit test').textContent).toBe(
      'A test tool for drawer unit test'
    );

    // Click run tool button
    const runBtn = screen.getByRole('button', { name: 'Run test_tool' });
    await user.click(runBtn);

    // Verify arguments textarea has default JSON
    const argsInput = screen.getByRole('textbox', { name: 'Tool Arguments JSON' }) as HTMLTextAreaElement;
    expect(argsInput.value).toBe('{}');

    const executeBtn = screen.getByRole('button', { name: 'Execute Tool' });
    await user.click(executeBtn);

    // Verify tool runner output
    const output = await screen.findByTestId('tool-runner-output');
    expect(output.textContent).toContain('result: {}');

    // Verify activity logged in Activity Log tab
    const activityTab = screen.getByRole('tab', { name: /Activity Log/i });
    await user.click(activityTab);
    expect(screen.getByText('test_tool').textContent).toBe('test_tool');
    expect(screen.getByText('success').textContent).toBe('success');

    // Clear activity log
    const clearBtn = screen.getByRole('button', { name: 'Clear Activity Log' });
    expect(clearBtn.hasAttribute('disabled')).toBe(false);
    await user.click(clearBtn);
    expect(screen.getByText('No recent activity logged.').textContent).toBe('No recent activity logged.');
    expect(clearBtn.hasAttribute('disabled')).toBe(true);
  });

  it('handles invalid arguments JSON in tool runner gracefully', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    await user.click(screen.getByRole('tab', { name: /Registered Tools/i }));
    await user.click(screen.getByRole('button', { name: 'Run test_tool' }));

    const argsInput = screen.getByRole('textbox', { name: 'Tool Arguments JSON' });
    await user.clear(argsInput);
    await user.type(argsInput, 'not-valid-json');

    await user.click(screen.getByRole('button', { name: 'Execute Tool' }));

    const output = await screen.findByTestId('tool-runner-output');
    expect(output.textContent).toContain('Invalid JSON:');
  });

  it('executes RPC calls via RPC console', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    const rpcTab = screen.getByRole('tab', { name: /RPC Console/i });
    await user.click(rpcTab);
    expect(rpcTab.getAttribute('data-state')).toBe('active');

    const rpcInput = screen.getByRole('textbox', { name: 'RPC Payload JSON' }) as HTMLTextAreaElement;
    await user.type(rpcInput, '{{ "name": "test_tool" }');

    const executeBtn = screen.getByRole('button', { name: 'Execute RPC' });
    await user.click(executeBtn);

    const output = await screen.findByTestId('rpc-runner-output');
    expect(output.textContent).toContain('result: {}');
  });

  it('handles tool execution failures cleanly and silences expected errors', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const user = userEvent.setup();
    const registry = createMockRegistry();
    registry.registerTool({
      name: 'failing_tool',
      description: 'A tool that fails',
      inputSchema: { type: 'object' },
      handler: async () => {
        throw new Error('Simulated failure');
      },
    });

    render(
      <WebMCPProvider registry={registry}>
        <WebMCPAssistantDrawer open={true} onOpenChange={vi.fn()} />
      </WebMCPProvider>
    );

    await user.click(screen.getByRole('tab', { name: /Registered Tools/i }));
    await user.click(screen.getByRole('button', { name: 'Run failing_tool' }));
    await user.click(screen.getByRole('button', { name: 'Execute Tool' }));

    const output = await screen.findByTestId('tool-runner-output');
    expect(output.textContent).toContain('Error executing failing_tool: Simulated failure');

    errorSpy.mockRestore();
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

  it('removes drawer from DOM cleanly when closed via state change', async () => {
    const user = userEvent.setup();
    const registry = createMockRegistry();
    const ControlledDrawer = () => {
      const [open, setOpen] = useState(true);
      return (
        <WebMCPProvider registry={registry}>
          <WebMCPAssistantDrawer open={open} onOpenChange={setOpen} />
        </WebMCPProvider>
      );
    };

    render(<ControlledDrawer />);
    expect(screen.getByRole('dialog')).not.toBeNull();

    const closeBtn = screen.getByRole('button', { name: 'Close' });
    await user.click(closeBtn);

    // Radix Teardown (Pattern 14)
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
