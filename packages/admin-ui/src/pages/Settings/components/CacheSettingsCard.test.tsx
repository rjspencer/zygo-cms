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
  it('calls onClear when the button is clicked', async () => {
    const onClear = vi.fn();
    renderCard({ onClear });
    await userEvent.click(screen.getByRole('button', { name: /clear cache/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('shows a success status', () => {
    renderCard({ isSuccess: true });
    expect(screen.getByRole('status').textContent).toMatch(/cache cleared/i);
  });

  it('shows an error alert', () => {
    renderCard({ errorMessage: 'Boom' });
    expect(screen.getByRole('alert').textContent).toContain('Boom');
  });

  it('disables the button while clearing', () => {
    renderCard({ isClearing: true });
    expect((screen.getByTestId('clear-cache-button') as HTMLButtonElement).disabled).toBe(true);
  });
});
