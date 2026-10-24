import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import type { EntryFormValues, EntryStatus } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EntryBadges } from './EntryBadges';

const renderEntryBadges = (status: EntryStatus, isSaved = false) => {
  const Harness: React.FC = () => {
    const methods = useForm<EntryFormValues>({
      defaultValues: { ...EMPTY_FORM_VALUES, status },
    });
    return (
      <Theme>
        <FormProvider {...methods}>
          <EntryBadges entryType="post" isSaved={isSaved} />
        </FormProvider>
      </Theme>
    );
  };

  return render(<Harness />);
};

describe('EntryBadges', () => {
  it('renders entry type badge', () => {
    renderEntryBadges('draft');
    expect(screen.getByText('POST')).toBeDefined();
  });

  it('renders draft badge with gray color', () => {
    renderEntryBadges('draft');
    const badge = screen.getByText('DRAFT');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('gray');
  });

  it('renders in_review badge with amber color', () => {
    renderEntryBadges('in_review');
    const badge = screen.getByText('IN REVIEW');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('amber');
  });

  it('renders ready_for_publish badge with blue color', () => {
    renderEntryBadges('ready_for_publish');
    const badge = screen.getByText('READY FOR PUBLISH');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('blue');
  });

  it('renders published badge with green color', () => {
    renderEntryBadges('published');
    const badge = screen.getByText('PUBLISHED');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('green');
  });

  it('renders archived badge with red color', () => {
    renderEntryBadges('archived');
    const badge = screen.getByText('ARCHIVED');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('red');
  });

  it('renders scheduled badge with purple color', () => {
    renderEntryBadges('scheduled');
    const badge = screen.getByText('SCHEDULED');
    expect(badge).toBeDefined();
    expect(badge.getAttribute('data-accent-color')).toBe('purple');
  });

  it('renders saved indicator when isSaved is true', () => {
    renderEntryBadges('published', true);
    expect(screen.getByText('Saved to Edge')).toBeDefined();
  });
});
