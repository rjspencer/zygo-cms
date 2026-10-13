import { act, fireEvent, screen } from '@testing-library/react';
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

    expect(screen.getByText('Cover Image URL')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Select Image' })).toBeDefined();
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

    expect(screen.getByRole('button', { name: 'Select Image' })).toBeDefined();
    const img = screen.getByAltText('Cover Thumbnail') as HTMLImageElement;
    expect(img).toBeDefined();
    expect(img.src).toBe('https://example.com/cover.jpg');
    expect(screen.getByText('https://example.com/cover.jpg')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDefined();
  });

  it('calls openMediaPicker when clicking Select Image and updates image on callback', () => {
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
    fireEvent.click(selectBtn);

    expect(mockOpenMediaPicker).toHaveBeenCalledTimes(1);
    expect(capturedCallback).not.toBeNull();

    // Trigger the callback
    act(() => {
      capturedCallback!('https://example.com/new-cover.png');
    });

    expect(screen.getByAltText('Cover Thumbnail')).toBeDefined();
    expect(screen.getByText('https://example.com/new-cover.png')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Remove' })).toBeDefined();
  });

  it('clears cover image when clicking Remove', () => {
    renderWithForm(
      <MediaPickerContext.Provider value={vi.fn()}>
        <CoverImageField />
      </MediaPickerContext.Provider>,
      { coverImage: 'https://example.com/cover.jpg' }
    );

    expect(screen.getByText('https://example.com/cover.jpg')).toBeDefined();
    const removeBtn = screen.getByRole('button', { name: 'Remove' });

    fireEvent.click(removeBtn);

    expect(screen.queryByText('https://example.com/cover.jpg')).toBeNull();
    expect(screen.queryByAltText('Cover Thumbnail')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull();
  });
});
