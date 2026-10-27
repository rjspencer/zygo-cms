import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { CacheSettingsCard } from './CacheSettingsCard';

const renderCard = (props: Partial<React.ComponentProps<typeof CacheSettingsCard>> = {}) =>
  render(
    <Theme>
      <CacheSettingsCard onClear={vi.fn()} {...props} />
    </Theme>
  );

describe('CacheSettingsCard', () => {
  it('renders heading, description, and clear cache button with accessibility attributes', () => {
    renderCard();

    const heading = screen.getByRole('heading', { name: 'Cache' });
    expect(heading.textContent).toBe('Cache');

    const desc = screen.getByText(/Purge all cached public pages and force browsers to reload the stylesheet/i);
    expect(desc.id).toBe('cache-card-description');

    const clearButton = screen.getByRole('button', { name: /clear cache/i });
    expect(clearButton.hasAttribute('disabled')).toBe(false);
    expect(clearButton.getAttribute('aria-describedby')).toBe('cache-card-description');

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('calls onClear when the button is clicked', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    renderCard({ onClear });

    await user.click(screen.getByRole('button', { name: /clear cache/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows a success status callout when isSuccess is true', () => {
    renderCard({ isSuccess: true });

    const status = screen.getByRole('status');
    expect(status.textContent).toContain('Cache cleared. Changes may take a few seconds to appear.');
  });

  it('hides success status callout while clearing even if isSuccess is true', () => {
    renderCard({ isSuccess: true, isClearing: true });
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('shows an error alert callout when errorMessage is provided', () => {
    renderCard({ errorMessage: 'Failed to purge cache' });

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toContain('Failed to purge cache');
  });

  it('disables the button while clearing', () => {
    renderCard({ isClearing: true });

    const button = screen.getByRole('button', { name: /clear cache/i });
    expect(button.hasAttribute('disabled')).toBe(true);
  });
});
