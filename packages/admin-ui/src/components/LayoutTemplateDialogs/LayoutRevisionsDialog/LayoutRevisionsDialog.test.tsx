import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
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

    expect(screen.getByText('Loading revision history...')).toBeDefined();
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

    expect(screen.getByText('No previous revisions recorded yet.')).toBeDefined();
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

    expect(screen.getByText('2026-10-14 10:00:00')).toBeDefined();
    expect(screen.getByText('2026-10-15 12:00:00')).toBeDefined();

    const restoreBtn = screen.getByTestId('restore-rev-rev-1');
    expect(restoreBtn).toBeDefined();
    await user.click(restoreBtn);
    expect(onRestore).toHaveBeenCalledWith('rev-1');
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
