import { render, screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import type { Blocker } from 'react-router-dom';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog component', () => {
  it('renders dialog when blocked, handles Stay and Leave without saving', async () => {
    const user = userEvent.setup();
    const proceed = vi.fn();
    const reset = vi.fn();
    const blockedBlocker: Blocker = {
      state: 'blocked',
      location: { pathname: '/other', search: '', hash: '', state: null, key: 'k' },
      proceed,
      reset,
    };

    const { rerender } = render(
      <Theme>
        <UnsavedChangesDialog blocker={blockedBlocker} />
      </Theme>
    );

    expect(screen.getByRole('heading', { name: 'Unsaved changes' }).textContent).toBe(
      'Unsaved changes'
    );
    expect(screen.getByText(/You have unsaved changes/i).textContent).toContain(
      'You have unsaved changes'
    );

    const stayButton = screen.getByRole('button', { name: 'Stay' });
    expect(stayButton.hasAttribute('disabled')).toBe(false);
    await user.click(stayButton);
    expect(reset).toHaveBeenCalledTimes(1);

    const leaveButton = screen.getByRole('button', { name: 'Leave without saving' });
    expect(leaveButton.hasAttribute('disabled')).toBe(false);
    await user.click(leaveButton);
    expect(proceed).toHaveBeenCalledTimes(1);

    // When unblocked, content should not be present
    const unblockedBlocker: Blocker = {
      state: 'unblocked',
      location: undefined,
      proceed: undefined,
      reset: undefined,
    };

    rerender(
      <Theme>
        <UnsavedChangesDialog blocker={unblockedBlocker} />
      </Theme>
    );

    // Radix Teardown (Pattern 14)
    if (screen.queryByRole('dialog') ?? screen.queryByRole('alertdialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog') ?? screen.queryByRole('alertdialog'));
    }
    expect(screen.queryByRole('alertdialog')).toBeNull();
    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });
});
