import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FormProvider, useForm } from 'react-hook-form';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import type { EntryFormValues } from '../../../../types';
import { EMPTY_FORM_VALUES } from '../../../../utils/entryForm';
import { SlugField } from './SlugField';

const FormWithErrorHarness: React.FC<{
  errorMessage: string;
  children: React.ReactNode;
}> = ({ errorMessage, children }) => {
  const methods = useForm<EntryFormValues>({ defaultValues: EMPTY_FORM_VALUES });
  useEffect(() => {
    methods.setError('slug', {
      type: 'validation',
      message: errorMessage,
    });
  }, [errorMessage, methods]);

  return (
    <Theme>
      <FormProvider {...methods}>{children}</FormProvider>
    </Theme>
  );
};

describe('SlugField', () => {
  it('renders label and input with default placeholder and initial value', () => {
    renderWithForm(<SlugField entryType="page" />, { slug: 'initial-slug' });

    const input = screen.getByRole('textbox', { name: 'Slug' });
    expect(input.getAttribute('placeholder')).toBe('url-friendly-slug');
    expect((input as HTMLInputElement).value).toBe('initial-slug');
    expect(input.getAttribute('aria-invalid')).toBe('false');
    expect(input.getAttribute('aria-describedby')).toBeNull();
    expect(screen.getByText('/').textContent).toBe('/');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders prefix /post/ for post entryType', () => {
    renderWithForm(<SlugField entryType="post" />);

    expect(screen.getByText('/post/').textContent).toBe('/post/');
  });

  it('renders prefix /docs/ for doc entryType', () => {
    renderWithForm(<SlugField entryType="doc" />);

    expect(screen.getByText('/docs/').textContent).toBe('/docs/');
  });

  it('handles typing in slug field', async () => {
    const user = userEvent.setup();
    renderWithForm(<SlugField entryType="page" />, { slug: '' });

    const input = screen.getByRole('textbox', { name: 'Slug' });
    await user.type(input, 'my-new-slug');

    expect((input as HTMLInputElement).value).toBe('my-new-slug');
  });

  it('displays error message in role="alert" and marks input as aria-invalid when slug has an error', () => {
    const errorMessage = 'Slug must contain only alphanumeric characters and hyphens';
    render(
      <FormWithErrorHarness errorMessage={errorMessage}>
        <SlugField entryType="page" />
      </FormWithErrorHarness>
    );

    const alert = screen.getByRole('alert');
    expect(alert.textContent).toBe(errorMessage);
    expect(alert.getAttribute('id')).toBe('editor-slug-error');

    const input = screen.getByRole('textbox', { name: 'Slug' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('editor-slug-error');
  });
});
