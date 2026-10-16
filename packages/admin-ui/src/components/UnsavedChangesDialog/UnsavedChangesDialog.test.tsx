import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import type { Blocker } from 'react-router-dom';
import { UnsavedChangesDialog } from './UnsavedChangesDialog';

describe('UnsavedChangesDialog component', () => {
  it('renders dialog when blocked, handles Stay and Leave without saving', async () => {
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

    expect(screen.getByText('Unsaved changes')).toBeDefined();
    expect(screen.getByText(/You have unsaved changes/i)).toBeDefined();

    const stayButton = screen.getByRole('button', { name: 'Stay' });
    await userEvent.click(stayButton);
    expect(reset).toHaveBeenCalled();

    const leaveButton = screen.getByRole('button', { name: 'Leave without saving' });
    await userEvent.click(leaveButton);
    expect(proceed).toHaveBeenCalled();

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

    expect(screen.queryByText('Unsaved changes')).toBeNull();
  });
});
