import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, userEvent } from '../../test/test-utils';
import { Theme } from '@radix-ui/themes';
import { BulkActionBar } from './BulkActionBar';

describe('BulkActionBar Component', () => {
  const defaultProps = {
    selectedCount: 3,
    onClearSelection: vi.fn(),
    onPublish: vi.fn(),
    onUnpublish: vi.fn(),
    onAddTags: vi.fn(),
    onTrash: vi.fn(),
    isPending: false,
  };

  const renderWithTheme = (ui: React.ReactElement) => {
    return render(
      <Theme appearance="light" accentColor="cyan">
        {ui}
      </Theme>
    );
  };

  it('renders nothing when selectedCount is 0', () => {
    renderWithTheme(
      <BulkActionBar {...defaultProps} selectedCount={0} />
    );
    expect(screen.queryByTestId('bulk-action-bar')).toBeNull();
  });

  it('renders selected count and action buttons when items are selected', () => {
    renderWithTheme(<BulkActionBar {...defaultProps} />);

    expect(screen.getByTestId('bulk-action-bar')).not.toBeNull();
    expect(screen.getByText('3 items selected').textContent).toBe('3 items selected');
    expect(screen.getByRole('button', { name: /bulk publish/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /bulk unpublish/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /bulk add tags/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /bulk move selected entries to trash/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /deselect all/i }).hasAttribute('disabled')).toBe(false);
  });

  it('triggers onPublish when Publish button is clicked', async () => {
    const user = userEvent.setup();
    const onPublish = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onPublish={onPublish} />);

    await user.click(screen.getByRole('button', { name: /bulk publish/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('triggers onUnpublish when Unpublish button is clicked', async () => {
    const user = userEvent.setup();
    const onUnpublish = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onUnpublish={onUnpublish} />);

    await user.click(screen.getByRole('button', { name: /bulk unpublish/i }));
    expect(onUnpublish).toHaveBeenCalledTimes(1);
  });

  it('triggers onClearSelection when Deselect button is clicked', async () => {
    const user = userEvent.setup();
    const onClearSelection = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onClearSelection={onClearSelection} />);

    await user.click(screen.getByRole('button', { name: /deselect all/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('opens BulkTrashDialog and triggers onTrash on confirm', async () => {
    const user = userEvent.setup();
    const onTrash = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onTrash={onTrash} />);

    await user.click(screen.getByRole('button', { name: /bulk move selected entries to trash/i }));
    expect(screen.getByRole('dialog')).not.toBeNull();
    expect(screen.getByText(/Are you sure you want to move 3 entries to the trash/i).textContent).toContain('3 entries');

    await user.click(screen.getByRole('button', { name: /confirm move to trash/i }));
    expect(onTrash).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens BulkTagDialog, allows entering tags, and submits onAddTags', async () => {
    const user = userEvent.setup();
    const onAddTags = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onAddTags={onAddTags} />);

    await user.click(screen.getByRole('button', { name: /bulk add tags/i }));
    expect(screen.getByRole('dialog')).not.toBeNull();

    const input = screen.getByRole('textbox', { name: /tags to add/i });
    await user.type(input, 'featured, tech');
    expect(input.getAttribute('value')).toBe('featured, tech');

    await user.click(screen.getByRole('button', { name: /confirm add tags/i }));
    expect(onAddTags).toHaveBeenCalledWith('featured, tech');
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('disables all action buttons when isPending is true', () => {
    renderWithTheme(<BulkActionBar {...defaultProps} isPending={true} />);

    expect(screen.getByRole('button', { name: /bulk publish/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /bulk unpublish/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /bulk add tags/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /bulk move selected entries to trash/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /deselect all/i }).hasAttribute('disabled')).toBe(true);
  });
});
