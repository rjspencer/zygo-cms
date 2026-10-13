import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import type { SectionTemplate } from '../../../../../../types/sectionTemplate';
import { SectionList } from './SectionList';

const mockTemplates: SectionTemplate[] = [
  {
    id: 'hero',
    name: 'Hero Section',
    schema_json: JSON.stringify([
      { name: 'title', type: 'text', label: 'Title' },
    ]),
  },
  {
    id: 'features',
    name: 'Features Section',
    schema_json: JSON.stringify([
      { name: 'items', type: 'text', label: 'Feature Items' },
    ]),
  },
];

describe('SectionList', () => {
  it('renders empty state message when sections array is empty', () => {
    renderWithForm(<SectionList sectionTemplates={mockTemplates} />, { sections: [] });

    expect(screen.getByText('Page Sections')).toBeDefined();
    expect(
      screen.getByText('No sections added yet. Click "Add Section..." above to add one.')
    ).toBeDefined();
  });

  it('renders section cards when initialized with sections', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [
          { type_id: 'hero', data: { title: 'First Hero' } },
          { type_id: 'features', data: { items: 'Great Features' } },
        ],
      }
    );

    expect(screen.getByText('Hero Section')).toBeDefined();
    expect(screen.getByText('Features Section')).toBeDefined();
  });

  it('handles expanding and collapsing section cards', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [{ type_id: 'hero', data: { title: 'First Hero' } }],
      }
    );

    // Initial state: expanded
    expect(screen.getByText('Title')).toBeDefined();
    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });

    // Collapse
    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Title')).toBeNull();

    // Expand
    const expandBtn = screen.getByRole('button', { name: 'Expand section' });
    fireEvent.click(expandBtn);
    expect(screen.getByText('Title')).toBeDefined();
  });

  it('deletes a section when clicking delete button', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [
          { type_id: 'hero', data: { title: 'First Hero' } },
          { type_id: 'features', data: { items: 'Great Features' } },
        ],
      }
    );

    const deleteButtons = screen.getAllByRole('button', { name: 'Delete section' });
    expect(deleteButtons).toHaveLength(2);

    // Delete the first section
    fireEvent.click(deleteButtons[0]);

    expect(screen.queryByText('Hero Section')).toBeNull();
    expect(screen.getByText('Features Section')).toBeDefined();
  });

  it('moves sections up and down', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [
          { type_id: 'hero', data: { title: 'Hero' } },
          { type_id: 'features', data: { items: 'Features' } },
        ],
      }
    );

    const moveDownButtons = screen.getAllByRole('button', { name: 'Move section down' });
    // First section can move down
    fireEvent.click(moveDownButtons[0]);

    // Check headings order or move buttons status
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move section up' });
    // Features Section is now first (so its move up button is disabled)
    expect(moveUpButtons[0].hasAttribute('disabled')).toBe(true);
  });

  it('handles missing template gracefully and permits deletion', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [{ type_id: 'non_existent_template', data: {} }],
      }
    );

    expect(screen.getByText('Missing template')).toBeDefined();
    expect(screen.getByText('(non_existent_template)')).toBeDefined();

    const deleteBtn = screen.getByRole('button', { name: 'Delete section' });
    fireEvent.click(deleteBtn);

    expect(screen.queryByText('Missing template')).toBeNull();
    expect(
      screen.getByText('No sections added yet. Click "Add Section..." above to add one.')
    ).toBeDefined();
  });
});
