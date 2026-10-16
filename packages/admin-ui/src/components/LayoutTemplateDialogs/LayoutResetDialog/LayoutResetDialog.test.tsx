import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
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

    expect(screen.getByText('Reset Post Template to Default?')).toBeDefined();
    expect(screen.getByText(/restore the built-in system HTML/i)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    expect(screen.getByTestId('confirm-reset-btn')).toBeDefined();
  });

  it('calls onConfirm when confirm button is clicked', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <LayoutResetDialog
        open={true}
        onOpenChange={vi.fn()}
        templateName="Post Template"
        onConfirm={onConfirm}
        isSaving={false}
      />
    );

    await user.click(screen.getByTestId('confirm-reset-btn'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
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
