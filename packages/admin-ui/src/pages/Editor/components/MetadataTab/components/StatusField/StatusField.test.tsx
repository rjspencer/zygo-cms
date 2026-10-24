import { beforeAll, describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'In Review' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ready for Publish' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Published' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Archived' })).toBeDefined();

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('renders for author with helper text and disables restricted status buttons', () => {
    renderStatusField('draft', 'author');

    expect(
      screen.getByText('Only editors and admins can approve, publish, or archive entries.')
    ).toBeDefined();

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

    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    const archivedBtn = screen.getByRole('button', { name: 'Archived' });

    expect(readyBtn.hasAttribute('disabled')).toBe(false);
    expect(publishedBtn.hasAttribute('disabled')).toBe(false);
    expect(archivedBtn.hasAttribute('disabled')).toBe(false);
  });

  it('supports selecting in_review as author', () => {
    renderStatusField('draft', 'author');

    const inReviewBtn = screen.getByRole('button', { name: 'In Review' });
    fireEvent.click(inReviewBtn);

    expect(inReviewBtn.getAttribute('aria-pressed')).toBe('true');
  });

  it('supports selecting ready_for_publish as administrator', () => {
    renderStatusField('draft', 'admin');

    const readyBtn = screen.getByRole('button', { name: 'Ready for Publish' });
    fireEvent.click(readyBtn);

    expect(readyBtn.getAttribute('aria-pressed')).toBe('true');
  });
});
