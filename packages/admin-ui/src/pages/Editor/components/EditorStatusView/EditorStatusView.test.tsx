import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import { EditorStatusView } from './EditorStatusView';

const renderStatusView = (props: React.ComponentProps<typeof EditorStatusView>) =>
  render(
    <MemoryRouter>
      <Theme>
        <EditorStatusView {...props} />
      </Theme>
    </MemoryRouter>
  );

describe('EditorStatusView', () => {
  it('renders loading view with role="status" and text "Loading entry..."', () => {
    renderStatusView({ status: 'loading' });

    const statusEl = screen.getByRole('status');
    expect(statusEl).toBeDefined();
    expect(screen.getByText('Loading entry...')).toBeDefined();
  });

  it('renders error view with role="alert", default message, and BackButton without Retry button', () => {
    renderStatusView({ status: 'error' });

    const alertEl = screen.getByRole('alert');
    expect(alertEl).toBeDefined();
    expect(screen.getByText('Failed to load entry')).toBeDefined();
    expect(screen.getByRole('button', { name: /back/i })).toBeDefined();
    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('renders custom errorMessage in error view', () => {
    renderStatusView({ status: 'error', errorMessage: 'Network disconnected' });

    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText('Failed to load entry: Network disconnected')).toBeDefined();
  });

  it('renders Retry button and calls onRetry when clicked', () => {
    const handleRetry = vi.fn();
    renderStatusView({
      status: 'error',
      errorMessage: '500 Internal Server Error',
      onRetry: handleRetry,
    });

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();

    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
