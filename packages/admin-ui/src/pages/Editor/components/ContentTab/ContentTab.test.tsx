import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithForm } from '../../testUtils/renderWithForm';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import { ContentTab } from './ContentTab';

const mockTemplates: SectionTemplate[] = [
  {
    id: 'hero',
    name: 'Hero Section',
    schema_json: JSON.stringify([
      { name: 'title', type: 'text', label: 'Title' },
    ]),
  },
];

describe('ContentTab', () => {
  it('renders SlugField and SectionList when entryType is "page"', () => {
    renderWithForm(
      <ContentTab
        entryType="page"
        sectionTemplates={mockTemplates}
        onEditorReady={vi.fn()}
      />,
      {
        slug: 'about-us',
        sections: [{ type_id: 'hero', data: { title: 'Welcome' } }],
      }
    );

    // SlugField
    expect(screen.getByText('Slug')).toBeDefined();
    expect(screen.getByText('/')).toBeDefined();

    // SectionList
    expect(screen.getByText('Page Sections')).toBeDefined();
    expect(screen.getByText('Hero Section')).toBeDefined();

    // No PostBodyField
    expect(screen.queryByText('Body Content')).toBeNull();
  });

  it('renders SlugField and PostBodyField when entryType is "post"', () => {
    const onEditorReady = vi.fn();
    renderWithForm(
      <ContentTab
        entryType="post"
        sectionTemplates={mockTemplates}
        onEditorReady={onEditorReady}
      />,
      {
        slug: 'my-first-post',
        content: '<p>Post body</p>',
      }
    );

    // SlugField
    expect(screen.getByText('Slug')).toBeDefined();
    expect(screen.getByText('/post/')).toBeDefined();

    // PostBodyField
    expect(screen.getByText('Body Content')).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Post Body' })).toBeDefined();
    expect(onEditorReady).toHaveBeenCalled();

    // No SectionList
    expect(screen.queryByText('Page Sections')).toBeNull();
  });

  it('renders SlugField and PostBodyField when entryType is "doc"', () => {
    renderWithForm(
      <ContentTab
        entryType="doc"
        sectionTemplates={mockTemplates}
        onEditorReady={vi.fn()}
      />,
      {
        slug: 'intro',
        content: '<p>Documentation</p>',
      }
    );

    // SlugField
    expect(screen.getByText('Slug')).toBeDefined();
    expect(screen.getByText('/docs/')).toBeDefined();

    // PostBodyField
    expect(screen.getByText('Body Content')).toBeDefined();
    expect(screen.getByRole('textbox', { name: 'Doc Body' })).toBeDefined();

    // No SectionList
    expect(screen.queryByText('Page Sections')).toBeNull();
  });

  it('allows typing into the slug field and toggling section expansion in page mode', () => {
    renderWithForm(
      <ContentTab
        entryType="page"
        sectionTemplates={mockTemplates}
        onEditorReady={vi.fn()}
      />,
      {
        slug: 'initial',
        sections: [{ type_id: 'hero', data: { title: 'Hero' } }],
      }
    );

    const input = screen.getByPlaceholderText('url-friendly-slug') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'updated-slug' } });
    expect(input.value).toBe('updated-slug');

    expect(screen.getByText('Title')).toBeDefined();
    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Title')).toBeNull();
  });
});
