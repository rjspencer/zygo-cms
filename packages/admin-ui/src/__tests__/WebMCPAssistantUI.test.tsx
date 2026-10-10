import '../test/setup';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WebMCPProvider, useWebMCP } from '../providers/WebMCPProvider';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { StagedDiffModal } from '../components/assistant/StagedDiffModal';
import { WebMCPAssistantDrawer } from '../components/assistant/WebMCPAssistantDrawer';
import { Layout } from '../components/Layout';
import { ThemeProvider } from '../context/ThemeModeContext';

describe('WebMCP Assistant UI & Human-in-the-Loop Controls', () => {
  it('renders WebMCPAssistantDrawer with initial connection status badge and settings switches', () => {
    const registry = new WebMCPRegistry();

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <WebMCPAssistantDrawer open={true} onOpenChange={() => {}} />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    expect(screen.getByText('WebMCP Assistant')).toBeInTheDocument();
    expect(screen.getByText('Connected (In-Browser)')).toBeInTheDocument();

    const bridgeSwitch = screen.getByLabelText('Enable External WebSocket Bridge');
    expect(bridgeSwitch).toBeInTheDocument();

    const confirmationSwitch = screen.getByLabelText(
      'Require Confirmation for Sensitive Actions'
    );
    expect(confirmationSwitch).toBeInTheDocument();
  });

  it('toggles settings switches and updates status badge in WebMCPAssistantDrawer', () => {
    const registry = new WebMCPRegistry();

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <WebMCPAssistantDrawer open={true} onOpenChange={() => {}} />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    const bridgeSwitch = screen.getByLabelText('Enable External WebSocket Bridge');
    fireEvent.click(bridgeSwitch);
    expect(screen.getByText('External Bridge Active')).toBeInTheDocument();

    const confirmationSwitch = screen.getByLabelText(
      'Require Confirmation for Sensitive Actions'
    );
    fireEvent.click(confirmationSwitch);
  });

  it('renders registered tools list in Registered Tools tab', async () => {
    const user = userEvent.setup();
    const registry = new WebMCPRegistry();
    registry.registerTool({
      name: 'test_custom_tool',
      description: 'A test custom tool description',
      inputSchema: { type: 'object' },
      handler: () => ({ content: [{ type: 'text', text: 'custom result' }] }),
    });

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <WebMCPAssistantDrawer open={true} onOpenChange={() => {}} />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    const toolsTab = screen.getByRole('tab', { name: /Registered Tools/i });
    await user.click(toolsTab);

    expect(screen.getByText('test_custom_tool')).toBeInTheDocument();
    expect(screen.getByText('A test custom tool description')).toBeInTheDocument();
  });

  it('displays live tool activity after registry.callTool and clears activity log', async () => {
    const registry = new WebMCPRegistry();
    registry.registerTool({
      name: 'ping_tool',
      description: 'Simple ping tool',
      inputSchema: { type: 'object' },
      handler: () => ({
        toolResult: { pong: true },
        content: [{ type: 'text', text: 'Pong response' }],
      }),
    });

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <WebMCPAssistantDrawer open={true} onOpenChange={() => {}} />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    expect(screen.getByText('No recent activity logged.')).toBeInTheDocument();

    await act(async () => {
      await registry.callTool('ping_tool');
    });

    expect(screen.getByText('ping_tool')).toBeInTheDocument();
    expect(screen.getByText('Pong response')).toBeInTheDocument();
    expect(screen.getByText('success')).toBeInTheDocument();

    const clearBtn = screen.getByRole('button', { name: /Clear Activity Log/i });
    fireEvent.click(clearBtn);

    expect(screen.getByText('No recent activity logged.')).toBeInTheDocument();
  });

  it('renders StagedDiffModal before/after diffs and handles Accept and Reject actions', () => {
    const onAccept = vi.fn();
    const onReject = vi.fn();

    const { rerender } = render(
      <Theme>
        <StagedDiffModal
          open={true}
          title="Update Blog Post Headline"
          description="Proposed title update for SEO improvements"
          fieldLabel="title"
          beforeText="Old Blog Post Headline"
          afterText="New Awesome Blog Post Headline"
          onAccept={onAccept}
          onReject={onReject}
        />
      </Theme>
    );

    expect(screen.getByText('Update Blog Post Headline')).toBeInTheDocument();
    expect(
      screen.getByText('Proposed title update for SEO improvements')
    ).toBeInTheDocument();
    expect(screen.getByText('title')).toBeInTheDocument();
    expect(screen.getByText('Current (Before)')).toBeInTheDocument();
    expect(screen.getByText('Proposed (After)')).toBeInTheDocument();
    expect(screen.getByText('Old Blog Post Headline')).toBeInTheDocument();
    expect(screen.getByText('New Awesome Blog Post Headline')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: 'Accept Changes' });
    fireEvent.click(acceptBtn);
    expect(onAccept).toHaveBeenCalledTimes(1);

    rerender(
      <Theme>
        <StagedDiffModal
          open={true}
          title="Update Blog Post Headline"
          fieldLabel="title"
          beforeText="Old Blog Post Headline"
          afterText="New Awesome Blog Post Headline"
          onAccept={onAccept}
          onReject={onReject}
        />
      </Theme>
    );

    const rejectBtn = screen.getByRole('button', { name: 'Reject Changes' });
    fireEvent.click(rejectBtn);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('integrates propose_staged_change tool with WebMCPProvider and StagedDiffModal acceptance', async () => {
    const registry = new WebMCPRegistry();

    const TestStagedIntegration: React.FC = () => {
      const { stagedChange, resolveStagedChange } = useWebMCP();
      return (
        <div>
          {stagedChange && (
            <StagedDiffModal
              open={true}
              title={stagedChange.title}
              description={stagedChange.description}
              fieldLabel={stagedChange.fieldLabel}
              beforeText={stagedChange.beforeText}
              afterText={stagedChange.afterText}
              onAccept={() => resolveStagedChange(true)}
              onReject={() => resolveStagedChange(false)}
            />
          )}
        </div>
      );
    };

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <TestStagedIntegration />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    let proposalPromise: any;
    act(() => {
      proposalPromise = registry.callTool('propose_staged_change', {
        title: 'Change Site Tagline',
        description: 'New branding tagline',
        field_label: 'tagline',
        before_text: 'Old Tagline',
        after_text: 'New Innovative Tagline',
      });
    });

    expect(screen.getByText('Change Site Tagline')).toBeInTheDocument();
    expect(screen.getByText('New Innovative Tagline')).toBeInTheDocument();

    const acceptBtn = screen.getByRole('button', { name: 'Accept Changes' });
    await act(async () => {
      fireEvent.click(acceptBtn);
      const result = await proposalPromise;
      expect(result.toolResult.accepted).toBe(true);
      expect(result.toolResult.status).toBe('accepted');
    });

    expect(screen.queryByText('Change Site Tagline')).not.toBeInTheDocument();
  });

  it('integrates propose_staged_change tool with WebMCPProvider and StagedDiffModal rejection', async () => {
    const registry = new WebMCPRegistry();

    const TestStagedIntegration: React.FC = () => {
      const { stagedChange, resolveStagedChange } = useWebMCP();
      return (
        <div>
          {stagedChange && (
            <StagedDiffModal
              open={true}
              title={stagedChange.title}
              description={stagedChange.description}
              fieldLabel={stagedChange.fieldLabel}
              beforeText={stagedChange.beforeText}
              afterText={stagedChange.afterText}
              onAccept={() => resolveStagedChange(true)}
              onReject={() => resolveStagedChange(false)}
            />
          )}
        </div>
      );
    };

    render(
      <Theme>
        <MemoryRouter>
          <WebMCPProvider registry={registry}>
            <TestStagedIntegration />
          </WebMCPProvider>
        </MemoryRouter>
      </Theme>
    );

    let proposalPromise: any;
    act(() => {
      proposalPromise = registry.callTool('propose_staged_change', {
        title: 'Modify Footer Copyright',
        field_label: 'copyright',
        before_text: '2025',
        after_text: '2026',
      });
    });

    expect(screen.getByText('Modify Footer Copyright')).toBeInTheDocument();

    const rejectBtn = screen.getByRole('button', { name: 'Reject Changes' });
    await act(async () => {
      fireEvent.click(rejectBtn);
      const result = await proposalPromise;
      expect(result.toolResult.accepted).toBe(false);
      expect(result.toolResult.status).toBe('rejected');
    });

    expect(screen.queryByText('Modify Footer Copyright')).not.toBeInTheDocument();
  });

  it('toggles WebMCPAssistantDrawer from Layout header button', async () => {
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
    const registry = new WebMCPRegistry();

    render(
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Theme>
            <MemoryRouter initialEntries={['/']}>
              <WebMCPProvider registry={registry}>
                <Layout />
              </WebMCPProvider>
            </MemoryRouter>
          </Theme>
        </ThemeProvider>
      </QueryClientProvider>
    );

    const assistantBtn = screen.getByRole('button', {
      name: 'Open WebMCP Assistant',
    });
    expect(assistantBtn).toBeInTheDocument();

    fireEvent.click(assistantBtn);

    expect(await screen.findByText('WebMCP Assistant')).toBeInTheDocument();
  });
});
