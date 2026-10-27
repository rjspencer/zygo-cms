import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');
    expect(publishedBtn.getAttribute('aria-pressed')).toBe('false');

    // Tags
    const tagsInput = screen.getByLabelText('Tags (comma separated)') as HTMLInputElement;
    expect(tagsInput.value).toBe('tech, news');

    // Category
    const categoryInput = screen.getByLabelText('Category') as HTMLInputElement;
    expect(categoryInput.value).toBe('Updates');

    // Cover Image
    const selectImageBtn = screen.getByRole('button', { name: 'Select Image' });
    expect(selectImageBtn.hasAttribute('disabled')).toBe(false);

    // Meta Description
    const descInput = screen.getByLabelText('Meta Description') as HTMLTextAreaElement;
    expect(descInput.value).toBe('SEO meta description');

    // Canonical URL
    const canonicalInput = screen.getByLabelText('Canonical URL') as HTMLInputElement;
    expect(canonicalInput.value).toBe('https://example.com/post/1');

    // Schema JSON
    const schemaInput = screen.getByLabelText('Schema JSON') as HTMLTextAreaElement;
    expect(schemaInput.value).toBe('{"@context": "https://schema.org"}');

    // Social Previews mock
    const socialPreviews = screen.getByTestId('social-previews');
    expect(socialPreviews.getAttribute('data-entry-type')).toBe('post');
    expect(socialPreviews.textContent).toContain('Social Previews for post');
  });

  it('hides hierarchy fields for entry types without hierarchy (post)', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>
    );

    expect(screen.queryByLabelText('Parent ID')).toBeNull();
    expect(screen.queryByLabelText('Sort Order')).toBeNull();
  });

  it('shows hierarchy fields for entry types with hierarchy (page)', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="page" />
      </MediaPickerContext.Provider>,
      { parentId: '5', sortOrder: 2 }
    );

    const parentIdInput = screen.getByLabelText('Parent ID') as HTMLInputElement;
    expect(parentIdInput.value).toBe('5');

    const sortOrderInput = screen.getByLabelText('Sort Order') as HTMLInputElement;
    expect(sortOrderInput.value).toBe('2');
  });

  it('shows hierarchy fields for doc entry type', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="doc" />
      </MediaPickerContext.Provider>
    );

    const parentIdInput = screen.getByLabelText('Parent ID') as HTMLInputElement;
    expect(parentIdInput.value).toBe('');

    const sortOrderInput = screen.getByLabelText('Sort Order') as HTMLInputElement;
    expect(sortOrderInput.value).toBe('0');
  });

  it('supports status field rendering', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>,
      { status: 'draft' }
    );

    const draftBtn = screen.getByRole('button', { name: 'Draft' });
    expect(draftBtn.getAttribute('aria-pressed')).toBe('true');

    const publishedBtn = screen.getByRole('button', { name: 'Published' });
    expect(publishedBtn.getAttribute('aria-pressed')).toBe('false');
  });

  it('supports removing cover image', async () => {
    const user = userEvent.setup();
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <MetadataTab entryType="post" />
      </MediaPickerContext.Provider>,
      { coverImage: 'https://example.com/banner.png' }
    );

    const thumbnail = screen.getByAltText('Cover Thumbnail');
    expect(thumbnail.getAttribute('src')).toBe('https://example.com/banner.png');
    expect(screen.getByText('https://example.com/banner.png')).not.toBeNull();

    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    await user.click(removeBtn);

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
    expect(canonicalAlert.getAttribute('role')).toBe('alert');

    const canonicalInput = screen.getByLabelText('Canonical URL');
    expect(canonicalInput.getAttribute('aria-invalid')).toBe('true');
    expect(canonicalInput.getAttribute('aria-describedby')).toBe('editor-canonical-url-error');

    const schemaAlert = screen.getByText('Schema JSON must be a valid JSON object');
    expect(schemaAlert.getAttribute('role')).toBe('alert');

    const schemaInput = screen.getByLabelText('Schema JSON');
    expect(schemaInput.getAttribute('aria-invalid')).toBe('true');
    expect(schemaInput.getAttribute('aria-describedby')).toBe('editor-schema-json-error');
  });
});
