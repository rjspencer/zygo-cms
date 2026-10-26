import { describe, expect, it, vi } from 'vitest';
import { render, screen, userEvent } from '../../../../test/test-utils';
import { EditorStatusView } from './EditorStatusView';

describe('EditorStatusView', () => {
  it('renders loading view with role="status" and text "Loading entry..."', () => {
    render(<EditorStatusView status="loading" />);

    const statusEl = screen.getByRole('status');
    expect(statusEl.getAttribute('aria-live')).toBe('polite');
    expect(statusEl.textContent).toContain('Loading entry...');
  });

  it('renders error view with role="alert", default message, and BackButton without Retry button', () => {
    render(<EditorStatusView status="error" />);

    const alertEl = screen.getByRole('alert');
    expect(alertEl.textContent).toContain('Failed to load entry');

    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn.hasAttribute('disabled')).toBe(false);

    expect(screen.queryByRole('button', { name: /retry/i })).toBeNull();
  });

  it('renders custom errorMessage in error view', () => {
    render(<EditorStatusView status="error" errorMessage="Network disconnected" />);

    const alertEl = screen.getByRole('alert');
    expect(alertEl.textContent).toContain('Failed to load entry: Network disconnected');
  });

  it('renders Retry button and calls onRetry when clicked', async () => {
    const user = userEvent.setup();
    const handleRetry = vi.fn();
    render(
      <EditorStatusView
        status="error"
        errorMessage="500 Internal Server Error"
        onRetry={handleRetry}
      />
    );

    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn.hasAttribute('disabled')).toBe(false);

    await user.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });
});
