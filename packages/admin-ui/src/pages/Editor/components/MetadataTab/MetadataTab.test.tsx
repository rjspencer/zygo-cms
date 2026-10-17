import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it, vi } from 'vitest';
import { MediaPickerContext } from '../../context/MediaPickerContext';
import { renderWithForm } from '../../testUtils/renderWithForm';
import type { EntryFormValues } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { MetadataTab } from './MetadataTab';

vi.mock('../SocialPreviews/SocialPreviews', () => ({
  SocialPreviews: ({ entryType }: { entryType: string }) => (
    <div data-testid="social-previews" data-entry-type={entryType}>
      Social Previews for {entryType}
    </div>
  ),
}));

const FormWithErrorHarness: React.FC<{
  errors: Partial<Record<keyof EntryFormValues, string>>;
  children: React.ReactNode;
}> = ({ errors, children }) => {
  const methods = useForm<EntryFormValues>({ defaultValues: EMPTY_FORM_VALUES });
  useEffect(() => {
    Object.entries(errors).forEach(([field, msg]) => {
      methods.setError(field as keyof EntryFormValues, {
        type: 'validation',
        message: msg,
      });
    });
  }, [errors, methods]);

  return (
    <Theme>
      <FormProvider {...methods}>{children}</FormProvider>
    </Theme>
  );
};

describe('MetadataTab', () => {
  it('renders all standard metadata fields and SocialPreviews', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>,
      {
        tags: 'tech, news',
        category: 'Updates',
        description: 'SEO meta description',
        canonicalUrl: 'https://example.com/post/1',
        schemaJson: '{"@context": "https://schema.org"}',
      }
    );

    // Status
    expect(screen.getByText('Status')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Draft' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Published' })).toBeDefined();

    // Tags
    expect(screen.getByText('Tags (comma separated)')).toBeDefined();
    const tagsInput = screen.getByPlaceholderText('tech, news') as HTMLInputElement;
    expect(tagsInput.value).toBe('tech, news');

    // Category
    expect(screen.getByText('Category')).toBeDefined();
    const categoryInput = screen.getByPlaceholderText('Category...') as HTMLInputElement;
    expect(categoryInput.value).toBe('Updates');

    // Cover Image
    expect(screen.getByText('Cover Image URL')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Select Image' })).toBeDefined();

    // Meta Description
    expect(screen.getByText('Meta Description')).toBeDefined();
    const descInput = screen.getByPlaceholderText('Brief description for SEO...') as HTMLTextAreaElement;
    expect(descInput.value).toBe('SEO meta description');

    // Canonical URL
    expect(screen.getByText('Canonical URL')).toBeDefined();
    const canonicalInput = screen.getByPlaceholderText('https://example.com/...') as HTMLInputElement;
    expect(canonicalInput.value).toBe('https://example.com/post/1');

    // Schema JSON
    expect(screen.getByText('Schema JSON')).toBeDefined();
    const schemaInput = screen.getByPlaceholderText('{"@context": "https://schema.org", ...}') as HTMLTextAreaElement;
    expect(schemaInput.value).toBe('{"@context": "https://schema.org"}');

    // Social Previews mock
    const socialPreviews = screen.getByTestId('social-previews');
    expect(socialPreviews).toBeDefined();
    expect(socialPreviews.getAttribute('data-entry-type')).toBe('post');
  });

  it('hides hierarchy fields for entry types without hierarchy (post)', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>
    );

    expect(screen.queryByText('Parent ID')).toBeNull();
    expect(screen.queryByText('Sort Order')).toBeNull();
  });

  it('shows hierarchy fields for entry types with hierarchy (page)', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="page" />
      </MediaPickerContext.Provider>,
      { parentId: '5', sortOrder: 2 }
    );

    expect(screen.getByText('Parent ID')).toBeDefined();
    expect(screen.getByText('Sort Order')).toBeDefined();
    expect((screen.getByPlaceholderText('Leave blank for root') as HTMLInputElement).value).toBe('5');
    expect((screen.getByDisplayValue('2') as HTMLInputElement).value).toBe('2');
  });

  it('shows hierarchy fields for doc entry type', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="doc" />
      </MediaPickerContext.Provider>
    );

    expect(screen.getByText('Parent ID')).toBeDefined();
    expect(screen.getByText('Sort Order')).toBeDefined();
  });

  it('supports status toggle', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>,
      { status: 'draft' }
    );

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });

    expect(draftBtn.className).toContain('rt-variant-solid');
    expect(publishedBtn.className).toContain('rt-variant-soft');

    fireEvent.click(publishedBtn);
    expect(draftBtn.className).toContain('rt-variant-soft');
    expect(publishedBtn.className).toContain('rt-variant-solid');
  });

  it('supports removing cover image', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>,
      { coverImage: 'https://example.com/banner.png' }
    );

    expect(screen.getByText('https://example.com/banner.png')).toBeDefined();
    const removeBtn = screen.getByRole('button', { name: 'Remove' });

    fireEvent.click(removeBtn);

    expect(screen.queryByText('https://example.com/banner.png')).toBeNull();
    expect(screen.queryByAltText('Cover Thumbnail')).toBeNull();
  });

  it('renders inline error alerts and aria-invalid attributes for canonicalUrl and schemaJson', () => {
    render(
      <FormWithErrorHarness
        errors={{
          canonicalUrl: 'Canonical URL must be a valid HTTP/HTTPS URL',
          schemaJson: 'Schema JSON must be a valid JSON object',
        }}
      >
        <MediaPickerContext.Provider value={vi.fn()}>
          <MetadataTab entryType="post" />
        </MediaPickerContext.Provider>
      </FormWithErrorHarness>
    );

    const canonicalAlert = screen.getByText('Canonical URL must be a valid HTTP/HTTPS URL');
    expect(canonicalAlert).toBeDefined();
    expect(canonicalAlert.getAttribute('role')).toBe('alert');

    const canonicalInput = document.getElementById('editor-canonical-url-input');
    expect(canonicalInput).not.toBeNull();
    expect(canonicalInput?.getAttribute('aria-invalid')).toBe('true');
    expect(canonicalInput?.getAttribute('aria-describedby')).toBe('editor-canonical-url-error');

    const schemaAlert = screen.getByText('Schema JSON must be a valid JSON object');
    expect(schemaAlert).toBeDefined();
    expect(schemaAlert.getAttribute('role')).toBe('alert');

    const schemaInput = document.getElementById('editor-schema-json-input');
    expect(schemaInput).not.toBeNull();
    expect(schemaInput?.getAttribute('aria-invalid')).toBe('true');
    expect(schemaInput?.getAttribute('aria-describedby')).toBe('editor-schema-json-error');
  });
});
