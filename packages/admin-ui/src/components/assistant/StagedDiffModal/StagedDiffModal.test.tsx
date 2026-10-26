import { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { screen, waitForElementToBeRemoved } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/test-utils';
import { StagedDiffModal } from './StagedDiffModal';

describe('StagedDiffModal', () => {
  it('renders modal with title, description, field label, and before/after panes', () => {
    render(
      <StagedDiffModal
        open={true}
        title="Update Tagline"
        description="Proposed change to tagline"
        fieldLabel="Tagline"
        beforeText="Old Tagline"
        afterText="New Tagline"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).not.toBeNull();
    expect(screen.getByRole('heading', { name: 'Update Tagline' }).textContent).toBe(
      'Update Tagline'
    );
    expect(screen.getByText('Proposed change to tagline').textContent).toBe(
      'Proposed change to tagline'
    );
    expect(screen.getByText('Tagline').textContent).toBe('Tagline');
    expect(screen.getByRole('heading', { name: 'Current (Before)' }).textContent).toBe(
      'Current (Before)'
    );
    expect(screen.getByText('Old Tagline').textContent).toBe('Old Tagline');
    expect(screen.getByRole('heading', { name: 'Proposed (After)' }).textContent).toBe(
      'Proposed (After)'
    );
    expect(screen.getByText('New Tagline').textContent).toBe('New Tagline');

    const acceptBtn = screen.getByRole('button', { name: 'Accept Changes' });
    const rejectBtn = screen.getByRole('button', { name: 'Reject Changes' });
    expect(acceptBtn.hasAttribute('disabled')).toBe(false);
    expect(rejectBtn.hasAttribute('disabled')).toBe(false);
  });

  it('renders (empty) placeholder when text is empty', () => {
    render(
      <StagedDiffModal
        open={true}
        title="Clear Tagline"
        fieldLabel="Tagline"
        beforeText=""
        afterText=""
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    const emptyPlaceholders = screen.getAllByText('(empty)');
    expect(emptyPlaceholders.length).toBe(2);
    expect(emptyPlaceholders[0].textContent).toBe('(empty)');
    expect(emptyPlaceholders[1].textContent).toBe('(empty)');
  });

  it('does not render dialog content when closed', () => {
    render(
      <StagedDiffModal
        open={false}
        title="Update Tagline"
        fieldLabel="Tagline"
        beforeText="Old"
        afterText="New"
        onAccept={vi.fn()}
        onReject={vi.fn()}
      />
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('calls onAccept when Accept Changes button is clicked', async () => {
    const user = userEvent.setup();
    const onAccept = vi.fn();
    render(
      <StagedDiffModal
        open={true}
        title="Update Tagline"
        fieldLabel="Tagline"
        beforeText="Old"
        afterText="New"
        onAccept={onAccept}
        onReject={vi.fn()}
      />
    );

    const acceptBtn = screen.getByRole('button', { name: 'Accept Changes' });
    await user.click(acceptBtn);
    expect(onAccept).toHaveBeenCalledTimes(1);
  });

  it('calls onReject when Reject Changes button is clicked', async () => {
    const user = userEvent.setup();
    const onReject = vi.fn();
    render(
      <StagedDiffModal
        open={true}
        title="Update Tagline"
        fieldLabel="Tagline"
        beforeText="Old"
        afterText="New"
        onAccept={vi.fn()}
        onReject={onReject}
      />
    );

    const rejectBtn = screen.getByRole('button', { name: 'Reject Changes' });
    await user.click(rejectBtn);
    expect(onReject).toHaveBeenCalledTimes(1);
  });

  it('removes dialog from DOM when closed via state change', async () => {
    const user = userEvent.setup();
    const ControlledTestModal = () => {
      const [open, setOpen] = useState(true);
      return (
        <StagedDiffModal
          open={open}
          title="Update Tagline"
          fieldLabel="Tagline"
          beforeText="Old"
          afterText="New"
          onAccept={() => setOpen(false)}
          onReject={() => setOpen(false)}
        />
      );
    };

    render(<ControlledTestModal />);
    expect(screen.getByRole('dialog')).not.toBeNull();

    const rejectBtn = screen.getByRole('button', { name: 'Reject Changes' });
    await user.click(rejectBtn);

    // Radix Teardown (Pattern 14)
    if (screen.queryByRole('dialog')) {
      await waitForElementToBeRemoved(() => screen.queryByRole('dialog'));
    }
    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
