import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import { SlugField } from './SlugField';

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
});
