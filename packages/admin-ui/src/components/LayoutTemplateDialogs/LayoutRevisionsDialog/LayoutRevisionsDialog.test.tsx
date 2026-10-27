import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../../../test/test-utils';
import { LayoutRevisionsDialog } from './LayoutRevisionsDialog';
import type { LayoutTemplateRevision } from '../../../types/layoutTemplate';

const mockRevisions: LayoutTemplateRevision[] = [
  {
    id: 'rev-1',
    layout_template_id: 'template-posts',
    template_html: '<html><body>Posts</body></html>',
    template_css: 'body { color: red; }',
    created_at: '2026-10-14 10:00:00',
  },
  {
    id: 'rev-2',
    layout_template_id: 'template-posts',
    template_html: '<html><body>Posts v2</body></html>',
    template_css: 'body { color: blue; }',
    created_at: '2026-10-15 12:00:00',
  },
];

describe('LayoutRevisionsDialog', () => {
  it('renders loading state when isLoading is true', () => {
    render(
      <LayoutRevisionsDialog
        open={true}
        onOpenChange={vi.fn()}
        revisions={[]}
        isLoading={true}
        onRestore={vi.fn()}
        isSaving={false}
      />
    );

    const loadingText = screen.getByText('Loading revision history...');
    expect(loadingText.textContent).toBe('Loading revision history...');
  });

  it('renders empty state when there are no revisions', () => {
    render(
      <LayoutRevisionsDialog
        open={true}
        onOpenChange={vi.fn()}
        revisions={[]}
        isLoading={false}
        onRestore={vi.fn()}
        isSaving={false}
      />
    );

    const emptyText = screen.getByText('No previous revisions recorded yet.');
    expect(emptyText.textContent).toBe('No previous revisions recorded yet.');
  });

  it('renders list of revisions and restores on button click', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();
    render(
      <LayoutRevisionsDialog
        open={true}
        onOpenChange={vi.fn()}
        revisions={mockRevisions}
        isLoading={false}
        onRestore={onRestore}
        isSaving={false}
      />
    );

    expect(screen.getByText('2026-10-14 10:00:00').textContent).toBe('2026-10-14 10:00:00');
    expect(screen.getByText('2026-10-15 12:00:00').textContent).toBe('2026-10-15 12:00:00');

    const restoreBtn = screen.getByTestId('restore-rev-rev-1');
    expect(restoreBtn.hasAttribute('disabled')).toBe(false);
    expect(restoreBtn.textContent).toBe('Restore');

    await user.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith('rev-1');
  });

  it('closes dialog when Close button is clicked with clean Radix teardown', async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();

    const TestHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <LayoutRevisionsDialog
          open={open}
          onOpenChange={(next) => {
            onOpenChange(next);
            setOpen(next);
          }}
          revisions={mockRevisions}
          isLoading={false}
          onRestore={vi.fn()}
          isSaving={false}
        />
      );
    };

    render(<TestHarness />);
    const closeBtn = screen.getByRole('button', { name: 'Close' });
    expect(closeBtn.hasAttribute('disabled')).toBe(false);

    await user.click(closeBtn);
    expect(onOpenChange).toHaveBeenCalledWith(false);

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('restores revision and closes dialog with clean teardown', async () => {
    const user = userEvent.setup();
    const onRestore = vi.fn();

    const TestHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <LayoutRevisionsDialog
          open={open}
          onOpenChange={setOpen}
          revisions={mockRevisions}
          isLoading={false}
          onRestore={(id) => {
            onRestore(id);
            setOpen(false);
          }}
          isSaving={false}
        />
      );
    };

    render(<TestHarness />);
    const restoreBtn = screen.getByTestId('restore-rev-rev-1');
    expect(restoreBtn.hasAttribute('disabled')).toBe(false);

    await user.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith('rev-1');

    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('disables restore buttons when isSaving is true', () => {
    render(
      <LayoutRevisionsDialog
        open={true}
        onOpenChange={vi.fn()}
        revisions={mockRevisions}
        isLoading={false}
        onRestore={vi.fn()}
        isSaving={true}
      />
    );

    const restoreBtn = screen.getByTestId('restore-rev-rev-1');
    expect(restoreBtn.hasAttribute('disabled')).toBe(true);
  });
});
