import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
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

    expect(screen.getByText('Update Tagline')).toBeDefined();
    expect(screen.getByText('Proposed change to tagline')).toBeDefined();
    expect(screen.getByText('Tagline')).toBeDefined();
    expect(screen.getByText('Current (Before)')).toBeDefined();
    expect(screen.getByText('Old Tagline')).toBeDefined();
    expect(screen.getByText('Proposed (After)')).toBeDefined();
    expect(screen.getByText('New Tagline')).toBeDefined();
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
});
