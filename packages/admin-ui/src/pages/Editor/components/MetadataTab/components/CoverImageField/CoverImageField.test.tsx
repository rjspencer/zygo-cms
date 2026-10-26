import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { MediaPickerContext } from '../../../../context/MediaPickerContext';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import type { MediaPickerCallback } from '../../../../types';
import { CoverImageField } from './CoverImageField';

describe('CoverImageField', () => {
  it('renders label and select image button when empty', () => {
    const mockOpenMediaPicker = vi.fn();

    renderWithForm(
      <MediaPickerContext.Provider value={mockOpenMediaPicker}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: '' }
    );

    const group = screen.getByRole('group', { name: 'Cover Image URL' });
    expect(group.getAttribute('aria-labelledby')).toBe('editor-cover-image-label');

    const selectBtn = screen.getByRole('button', { name: 'Select Image' });
    expect(selectBtn.getAttribute('type')).toBe('button');
    expect(selectBtn.hasAttribute('disabled')).toBe(false);

    expect(screen.queryByAltText('Cover Thumbnail')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });

  it('renders thumbnail, url text, and remove button when cover image exists', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: 'https://example.com/cover.jpg' }
    );

    const selectBtn = screen.getByRole('button', { name: 'Select Image' });
    expect(selectBtn.hasAttribute('disabled')).toBe(false);

    const img = screen.getByAltText('Cover Thumbnail') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/cover.jpg');
    expect(screen.getByText('https://example.com/cover.jpg').textContent).toBe('https://example.com/cover.jpg');

    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    expect(removeBtn.getAttribute('type')).toBe('button');
    expect(removeBtn.hasAttribute('disabled')).toBe(false);
  });

  it('resolves relative /media/ cover image with getPublicSiteUrl', () => {
    const originalEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
    import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';

    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: '/media/banner.webp' }
    );

    const img = screen.getByAltText('Cover Thumbnail') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://zygodactylstudios.com/media/banner.webp');

    import.meta.env.VITE_PUBLIC_SITE_URL = originalEnv || '';
  });

  it('calls openMediaPicker when clicking Select Image and updates image on callback', async () => {
    const user = userEvent.setup();
    let capturedCallback: MediaPickerCallback | null = null;
    const mockOpenMediaPicker = vi.fn((cb: MediaPickerCallback) => {
      capturedCallback = cb;
    });

    renderWithForm(
      <MediaPickerContext.Provider value={mockOpenMediaPicker}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: '' }
    );

    const selectBtn = screen.getByRole('button', { name: 'Select Image' });
    await user.click(selectBtn);

    expect(mockOpenMediaPicker).toHaveBeenCalledTimes(1);
    expect(capturedCallback).not.toBeNull();

    // Trigger the callback
    act(() => {
      capturedCallback!('https://example.com/new-cover.png');
    });

    const img = screen.getByAltText('Cover Thumbnail') as HTMLImageElement;
    expect(img.getAttribute('src')).toBe('https://example.com/new-cover.png');
    expect(screen.getByText('https://example.com/new-cover.png').textContent).toBe('https://example.com/new-cover.png');

    const removeBtn = screen.getByRole('button', { name: 'Remove' });
    expect(removeBtn.getAttribute('type')).toBe('button');
    expect(removeBtn.hasAttribute('disabled')).toBe(false);
  });

  it('clears cover image when clicking Remove', async () => {
    const user = userEvent.setup();
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: 'https://example.com/cover.jpg' }
    );

    expect(screen.getByText('https://example.com/cover.jpg').textContent).toBe('https://example.com/cover.jpg');
    const removeBtn = screen.getByRole('button', { name: 'Remove' });

    await user.click(removeBtn);

    expect(screen.queryByText('https://example.com/cover.jpg')).toBeNull();
    expect(screen.queryByAltText('Cover Thumbnail')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });
});
