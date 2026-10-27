import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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
    const slugInput = screen.getByRole('textbox', { name: 'Slug' }) as HTMLInputElement;
    expect(slugInput.value).toBe('about-us');
    screen.getByText('/');

    // SectionList
    screen.getByText('Page Sections');
    screen.getByText('Hero Section');
    const titleInput = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
    expect(titleInput.value).toBe('Welcome');
    screen.getByRole('button', { name: 'Collapse section' });
    screen.getByRole('button', { name: 'Delete section' });

    // No PostBodyField
    expect(screen.queryByText('Body Content')).toBeNull();
    expect(screen.queryByRole('textbox', { name: /body/i })).toBeNull();
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
    const slugInput = screen.getByRole('textbox', { name: 'Slug' }) as HTMLInputElement;
    expect(slugInput.value).toBe('my-first-post');
    screen.getByText('/post/');

    // PostBodyField
    screen.getByText('Body Content');
    const postBody = screen.getByRole('textbox', { name: 'Post Body' });
    expect(postBody.textContent).toContain('Post body');
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
    const slugInput = screen.getByRole('textbox', { name: 'Slug' }) as HTMLInputElement;
    expect(slugInput.value).toBe('intro');
    screen.getByText('/docs/');

    // PostBodyField
    screen.getByText('Body Content');
    const docBody = screen.getByRole('textbox', { name: 'Doc Body' });
    expect(docBody.textContent).toContain('Documentation');

    // No SectionList
    expect(screen.queryByText('Page Sections')).toBeNull();
  });

  it('allows typing into the slug field and toggling section expansion in page mode', async () => {
    const user = userEvent.setup();

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

    const slugInput = screen.getByRole('textbox', { name: 'Slug' }) as HTMLInputElement;
    expect(slugInput.value).toBe('initial');

    await user.clear(slugInput);
    await user.type(slugInput, 'updated-slug');
    expect(slugInput.value).toBe('updated-slug');

    const titleInput = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
    expect(titleInput.value).toBe('Hero');

    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
    await user.click(collapseBtn);

    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
    expect(screen.queryByText('Title')).toBeNull();
    const expandBtn = screen.getByRole('button', { name: 'Expand section' });

    await user.click(expandBtn);
    const restoredTitleInput = screen.getByRole('textbox', { name: 'Title' }) as HTMLInputElement;
    expect(restoredTitleInput.value).toBe('Hero');
  });
});
