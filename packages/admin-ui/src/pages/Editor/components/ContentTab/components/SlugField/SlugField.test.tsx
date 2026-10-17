import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

    expect(screen.getByText('Slug')).toBeDefined();
    const input = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
    expect(input).toBeDefined();
    expect(input.value).toBe('initial-slug');
    expect(screen.getByText('/')).toBeDefined();
  });

  it('renders prefix /post/ for post entryType', () => {
    renderWithForm(<SlugField entryType="post" />);

    expect(screen.getByText('/post/')).toBeDefined();
  });

  it('renders prefix /docs/ for doc entryType', () => {
    renderWithForm(<SlugField entryType="doc" />);

    expect(screen.getByText('/docs/')).toBeDefined();
  });

  it('handles typing in slug field', () => {
    renderWithForm(<SlugField entryType="page" />, { slug: '' });

    const input = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'my-new-slug' } });

    expect(input.value).toBe('my-new-slug');
  });

  it('displays error message in role="alert" and marks input as aria-invalid when slug has an error', () => {
    const errorMessage = 'Slug must contain only alphanumeric characters and hyphens';
    render(
      <FormWithErrorHarness errorMessage={errorMessage}>
        <SlugField entryType="page" />
      </FormWithErrorHarness>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe(errorMessage);

    const inputElement = document.getElementById('editor-slug-input');
    expect(inputElement).not.toBeNull();
    expect(inputElement?.getAttribute('aria-invalid')).toBe('true');
    expect(inputElement?.getAttribute('aria-describedby')).toBe('editor-slug-error');
  });
});
