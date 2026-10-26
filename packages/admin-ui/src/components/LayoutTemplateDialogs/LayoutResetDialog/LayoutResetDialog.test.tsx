import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/test-utils';
import { LayoutResetDialog } from './LayoutResetDialog';

describe('LayoutResetDialog', () => {
  it('renders dialog with template name and description', () => {
    render(
      <LayoutResetDialog
        open={true}
        onOpenChange={vi.fn()}
        templateName="Post Template"
        onConfirm={vi.fn()}
        isSaving={false}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog.getAttribute('role')).toBe('dialog');
    expect(screen.getByText('Reset Post Template to Default?').textContent).toContain('Reset Post Template to Default?');
    expect(screen.getByText(/restore the built-in system HTML/i).textContent).toContain('restore the built-in system HTML structure');

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn.hasAttribute('disabled')).toBe(false);

    const confirmBtn = screen.getByTestId('confirm-reset-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);
    expect(confirmBtn.textContent).toBe('Yes, Reset to Default');
  });

  it('calls onConfirm when confirm button is clicked and closes dialog with clean teardown', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onOpenChange = vi.fn();

    const TestHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <LayoutResetDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          templateName="Post Template"
          onConfirm={() => {
            onConfirm();
            setOpen(false);
          }}
          isSaving={false}
        />
      );
    };

    render(<TestHarness />);
    const confirmBtn = screen.getByTestId('confirm-reset-btn');
    expect(confirmBtn.hasAttribute('disabled')).toBe(false);

    await user.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('closes dialog when cancel button is clicked with clean Radix teardown', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const TestHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <LayoutResetDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          templateName="Post Template"
          onConfirm={vi.fn()}
          isSaving={false}
        />
      );
    };

    render(<TestHarness />);
    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn.hasAttribute('disabled')).toBe(false);

    await user.click(cancelBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('disables buttons and shows saving state when isSaving is true', () => {
    render(
      <LayoutResetDialog
        open={true}
        onOpenChange={vi.fn()}
        templateName="Post Template"
        onConfirm={vi.fn()}
        isSaving={true}
      />
    );

    const confirmBtn = screen.getByTestId('confirm-reset-btn');
    expect(confirmBtn.textContent).toBe('Resetting...');
    expect(confirmBtn.hasAttribute('disabled')).toBe(true);

    const cancelBtn = screen.getByRole('button', { name: 'Cancel' });
    expect(cancelBtn.hasAttribute('disabled')).toBe(true);
  });
});
