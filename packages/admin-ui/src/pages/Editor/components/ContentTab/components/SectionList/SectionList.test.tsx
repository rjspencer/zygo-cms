import React, { useEffect } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { Theme } from '@radix-ui/themes';
import { describe, expect, it } from 'vitest';
import { renderWithForm } from '../../../../testUtils/renderWithForm';
import type { SectionTemplate } from '../../../../../../types/sectionTemplate';
import type { EntryFormValues } from '../../../../types';
import { EMPTY_FORM_VALUES } from '../../../../utils/entryForm';
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
  {
    id: 'about',
    name: 'About Section',
    schema_json: JSON.stringify([
      { name: 'bio', type: 'text', label: 'Bio' },
    ]),
  },
];

const SectionListWithErrorHarness: React.FC<{
  sectionTemplates: SectionTemplate[];
  initialSections: any[];
  sectionErrors: Record<string, string>;
}> = ({ sectionTemplates, initialSections, sectionErrors }) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, sections: initialSections },
  });

  useEffect(() => {
    Object.entries(sectionErrors).forEach(([fieldName, message]) => {
      methods.setError(`sections.0.data.${fieldName}` as any, {
        type: 'required',
        message,
      });
    });
  }, [methods, sectionErrors]);

  return (
    <Theme>
      <FormProvider {...methods}>
        <SectionList sectionTemplates={sectionTemplates} />
      </FormProvider>
    </Theme>
  );
};

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

  it('preserves collapsed section state when moving sections up and down', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [
          { type_id: 'hero', data: { title: 'Hero 1' } },
          { type_id: 'features', data: { items: 'Feature 2' } },
        ],
      }
    );

    // Collapse the first section (Hero)
    const collapseButtons = screen.getAllByRole('button', { name: 'Collapse section' });
    expect(collapseButtons).toHaveLength(2);
    fireEvent.click(collapseButtons[0]);

    // First section is now collapsed (has "Expand section" button)
    expect(screen.getByRole('button', { name: 'Expand section' })).toBeDefined();

    // Move first section down
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move section down' });
    fireEvent.click(moveDownButtons[0]);

    // Now index 0 is Features (expanded) and index 1 is Hero (collapsed)
    const expandButtonsAfterMove = screen.getAllByRole('button', { name: 'Expand section' });
    expect(expandButtonsAfterMove).toHaveLength(1);

    // Move index 1 (Hero) back up
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move section up' });
    fireEvent.click(moveUpButtons[1]);

    // Hero is back at index 0 and still collapsed
    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
  });

  it('preserves collapsed section state when another section is deleted', () => {
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [
          { type_id: 'hero', data: { title: 'Hero 1' } },
          { type_id: 'features', data: { items: 'Feature 2' } },
          { type_id: 'about', data: { bio: 'About 3' } },
        ],
      }
    );

    // Collapse the second section (Features)
    const collapseButtons = screen.getAllByRole('button', { name: 'Collapse section' });
    expect(collapseButtons).toHaveLength(3);
    fireEvent.click(collapseButtons[1]); // Collapse Features

    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);

    // Delete first section (Hero)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete section' });
    fireEvent.click(deleteButtons[0]);

    // Now Features is at index 0 and should still be collapsed
    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
    expect(screen.queryByText('Feature 2')).toBeNull(); // Still collapsed, body content hidden
  });

  it('renders inline error message with role="alert" when section has nested validation error', () => {
    const templatesWithRequired: SectionTemplate[] = [
      {
        id: 'hero',
        name: 'Hero Section',
        schema_json: JSON.stringify([
          { name: 'title', type: 'text', label: 'Title', required: true },
        ]),
      },
    ];

    render(
      <SectionListWithErrorHarness
        sectionTemplates={templatesWithRequired}
        initialSections={[{ type_id: 'hero', data: { title: '' } }]}
        sectionErrors={{ title: 'Title is required' }}
      />
    );

    const alert = screen.getByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe('Title is required');
  });

  it('auto-expands collapsed section when validation error arrives', async () => {
    const templatesWithRequired: SectionTemplate[] = [
      {
        id: 'hero',
        name: 'Hero Section',
        schema_json: JSON.stringify([
          { name: 'title', type: 'text', label: 'Title', required: true },
        ]),
      },
    ];

    const Harness: React.FC = () => {
      const methods = useForm<EntryFormValues>({
        defaultValues: {
          ...EMPTY_FORM_VALUES,
          sections: [{ type_id: 'hero', data: { title: '' } }],
        },
      });

      return (
        <Theme>
          <FormProvider {...methods}>
            <button
              type="button"
              onClick={() =>
                methods.setError('sections.0.data.title' as any, {
                  type: 'required',
                  message: 'Title is required',
                })
              }
            >
              Trigger Error
            </button>
            <SectionList sectionTemplates={templatesWithRequired} />
          </FormProvider>
        </Theme>
      );
    };

    render(<Harness />);

    // Collapse it first
    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });
    fireEvent.click(collapseBtn);
    expect(screen.queryByText('Title is required')).toBeNull();
    expect(screen.getByRole('button', { name: 'Expand section' })).toBeDefined();

    // Trigger error
    fireEvent.click(screen.getByText('Trigger Error'));

    // Should auto-expand and show alert
    const alert = await screen.findByRole('alert');
    expect(alert).toBeDefined();
    expect(alert.textContent).toBe('Title is required');
  });
});
