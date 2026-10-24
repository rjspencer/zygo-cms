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
  it('renders status label and combobox with aria-label="Publication status"', () => {
    renderStatusField('draft', 'editor');

    expect(screen.getByText('Status')).toBeDefined();
    const trigger = screen.getByRole('combobox', { name: 'Publication status' });
    expect(trigger).toBeDefined();
    expect(trigger.textContent).toContain('Draft');
  });

  it('renders for author with helper text and disables publishing options', async () => {
    renderStatusField('draft', 'author');

    expect(
      screen.getByText('Only editors and admins can approve, publish, or archive entries.')
    ).toBeDefined();

    const trigger = screen.getByRole('combobox', { name: 'Publication status' });
    fireEvent.keyDown(trigger, { key: ' ' });

    expect(await screen.findByRole('option', { name: 'Draft' })).toBeDefined();
    expect(await screen.findByRole('option', { name: 'In Review' })).toBeDefined();

    const readyOption = await screen.findByRole('option', { name: 'Ready for Publish' });
    const publishedOption = await screen.findByRole('option', { name: 'Published' });
    const archivedOption = await screen.findByRole('option', { name: 'Archived' });

    expect(readyOption.getAttribute('aria-disabled') === 'true' || readyOption.hasAttribute('data-disabled')).toBe(true);
    expect(publishedOption.getAttribute('aria-disabled') === 'true' || publishedOption.hasAttribute('data-disabled')).toBe(true);
    expect(archivedOption.getAttribute('aria-disabled') === 'true' || archivedOption.hasAttribute('data-disabled')).toBe(true);
  });

  it('renders for editor without helper text and enables all options', async () => {
    renderStatusField('in_review', 'editor');

    expect(
      screen.queryByText('Only editors and admins can approve, publish, or archive entries.')
    ).toBeNull();

    const trigger = screen.getByRole('combobox', { name: 'Publication status' });
    expect(trigger.textContent).toContain('In Review');
    fireEvent.keyDown(trigger, { key: ' ' });

    const readyOption = await screen.findByRole('option', { name: 'Ready for Publish' });
    const publishedOption = await screen.findByRole('option', { name: 'Published' });
    const archivedOption = await screen.findByRole('option', { name: 'Archived' });

    expect(readyOption.getAttribute('aria-disabled')).not.toBe('true');
    expect(publishedOption.getAttribute('aria-disabled')).not.toBe('true');
    expect(archivedOption.getAttribute('aria-disabled')).not.toBe('true');
  });

  it('supports selecting in_review as author', async () => {
    renderStatusField('draft', 'author');

    const trigger = screen.getByRole('combobox', { name: 'Publication status' });
    fireEvent.keyDown(trigger, { key: ' ' });

    const inReviewOption = await screen.findByRole('option', { name: 'In Review' });
    fireEvent.click(inReviewOption);

    expect(trigger.textContent).toContain('In Review');
  });
});
