import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
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

    expect(screen.getByTestId('bulk-action-bar')).toBeDefined();
    expect(screen.getByText('3 items selected')).toBeDefined();
    expect(screen.getByRole('button', { name: /bulk publish/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /bulk unpublish/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /bulk add tags/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /bulk move selected entries to trash/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /deselect all/i })).toBeDefined();
  });

  it('triggers onPublish when Publish button is clicked', () => {
    const onPublish = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onPublish={onPublish} />);

    fireEvent.click(screen.getByRole('button', { name: /bulk publish/i }));
    expect(onPublish).toHaveBeenCalledTimes(1);
  });

  it('triggers onUnpublish when Unpublish button is clicked', () => {
    const onUnpublish = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onUnpublish={onUnpublish} />);

    fireEvent.click(screen.getByRole('button', { name: /bulk unpublish/i }));
    expect(onUnpublish).toHaveBeenCalledTimes(1);
  });

  it('triggers onClearSelection when Deselect button is clicked', () => {
    const onClearSelection = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onClearSelection={onClearSelection} />);

    fireEvent.click(screen.getByRole('button', { name: /deselect all/i }));
    expect(onClearSelection).toHaveBeenCalledTimes(1);
  });

  it('opens BulkTrashDialog and triggers onTrash on confirm', () => {
    const onTrash = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onTrash={onTrash} />);

    fireEvent.click(screen.getByRole('button', { name: /bulk move selected entries to trash/i }));
    expect(screen.getByRole('dialog')).toBeDefined();
    expect(screen.getByText(/Are you sure you want to move 3 entries to the trash/i)).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: /confirm move to trash/i }));
    expect(onTrash).toHaveBeenCalledTimes(1);
  });

  it('opens BulkTagDialog, allows entering tags, and submits onAddTags', () => {
    const onAddTags = vi.fn();
    renderWithTheme(<BulkActionBar {...defaultProps} onAddTags={onAddTags} />);

    fireEvent.click(screen.getByRole('button', { name: /bulk add tags/i }));
    expect(screen.getByRole('dialog')).toBeDefined();

    const input = screen.getByRole('textbox', { name: /tags to add/i });
    fireEvent.change(input, { target: { value: 'featured, tech' } });

    fireEvent.click(screen.getByRole('button', { name: /confirm add tags/i }));
    expect(onAddTags).toHaveBeenCalledWith('featured, tech');
  });

  it('disables all action buttons when isPending is true', () => {
    renderWithTheme(<BulkActionBar {...defaultProps} isPending={true} />);

    expect((screen.getByRole('button', { name: /bulk publish/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /bulk unpublish/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /bulk add tags/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /bulk move selected entries to trash/i }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: /deselect all/i }) as HTMLButtonElement).disabled).toBe(true);
  });
});
