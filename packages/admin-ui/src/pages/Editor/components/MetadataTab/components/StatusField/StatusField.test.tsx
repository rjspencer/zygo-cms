import { beforeAll, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EntryFormValues, EntryStatus } from '../../../../types';
import { EMPTY_FORM_VALUES } from '../../../../utils/entryForm';
import { StatusField } from './StatusField';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => {};
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
});

const renderStatusField = (status: EntryStatus = 'draft', role = 'editor') => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['me'], { role });

  const Harness: React.FC = () => {
    const methods = useForm<EntryFormValues>({
      defaultValues: { ...EMPTY_FORM_VALUES, status },
    });
    return (
      <Theme>
        <QueryClientProvider client={queryClient}>
          <FormProvider {...methods}>
            <StatusField />
          </FormProvider>
        </QueryClientProvider>
      </Theme>
    );
  };

  return render(<Harness />);
};

describe('StatusField', () => {
  it('renders status label and all workflow status buttons', () => {
    renderStatusField('draft', 'editor');

    const statusGroup = screen.getByRole('group', { name: 'Status' });
    expect(statusGroup.getAttribute('aria-labelledby')).toBe('editor-status-label');

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const inReviewBtn = screen.getByRole('button', { name: 'In Review' });
    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    const archivedBtn = screen.getByRole('button', { name: 'Archived' });

    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');
    expect(inReviewBtn.getAttribute('aria-pressed')).toBe('false');
    expect(readyBtn.getAttribute('aria-pressed')).toBe('false');
    expect(publishedBtn.getAttribute('aria-pressed')).toBe('false');
    expect(archivedBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('renders for author with helper text and disables restricted status buttons', () => {
    renderStatusField('draft', 'author');

    const helpText = screen.getByText('Only editors and admins can approve, publish, or archive entries.');
    expect(helpText.getAttribute('id')).toBe('editor-status-help');

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const inReviewBtn = screen.getByRole('button', { name: 'In Review' });
    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    const archivedBtn = screen.getByRole('button', { name: 'Archived' });

    expect(draftBtn.hasAttribute('disabled')).toBe(false);
    expect(inReviewBtn.hasAttribute('disabled')).toBe(false);
    expect(readyBtn.hasAttribute('disabled')).toBe(true);
    expect(publishedBtn.hasAttribute('disabled')).toBe(true);
    expect(archivedBtn.hasAttribute('disabled')).toBe(true);
  });

  it('renders for editor/admin without helper text and enables all buttons', () => {
    renderStatusField('in_review', 'admin');

    expect(
      screen.queryByText('Only editors and admins can approve, publish, or archive entries.')
    ).toBeNull();

    const inReviewBtn = screen.getByRole('button', { name: 'In Review' });
    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    const archivedBtn = screen.getByRole('button', { name: 'Archived' });

    expect(inReviewBtn.getAttribute('aria-pressed')).toBe('true');
    expect(readyBtn.hasAttribute('disabled')).toBe(false);
    expect(publishedBtn.hasAttribute('disabled')).toBe(false);
    expect(archivedBtn.hasAttribute('disabled')).toBe(false);
  });

  it('supports selecting in_review as author', async () => {
    const user = userEvent.setup();
    renderStatusField('draft', 'author');

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const inReviewBtn = screen.getByRole('button', { name: 'In Review' });
    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');
    expect(inReviewBtn.getAttribute('aria-pressed')).toBe('false');

    await user.click(inReviewBtn);

    expect(inReviewBtn.getAttribute('aria-pressed')).toBe('true');
    expect(draftBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports selecting ready_for_publish as administrator', async () => {
    const user = userEvent.setup();
    renderStatusField('draft', 'admin');

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');
    expect(readyBtn.getAttribute('aria-pressed')).toBe('false');

    await user.click(readyBtn);

    expect(readyBtn.getAttribute('aria-pressed')).toBe('true');
    expect(draftBtn.getAttribute('aria-pressed')).toBe('false');
  });
});
