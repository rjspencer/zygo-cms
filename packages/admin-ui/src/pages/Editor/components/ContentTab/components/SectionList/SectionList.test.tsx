import React, { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { render, screen } from '@testing-library/react';
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

    const heading = screen.getByText('Page Sections');
    expect(heading.textContent).toBe('Page Sections');
    const emptyNotice = screen.getByText(
      'No sections added yet. Click "Add Section..." above to add one.'
    );
    expect(emptyNotice.textContent).toContain('No sections added yet');
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

    const heroTitle = screen.getByText('Hero Section');
    expect(heroTitle.textContent).toBe('Hero Section');
    const featuresTitle = screen.getByText('Features Section');
    expect(featuresTitle.textContent).toBe('Features Section');

    const heroInput = screen.getByRole('textbox', { name: 'Title' });
    expect(heroInput.getAttribute('value')).toBe('First Hero');
    const featuresInput = screen.getByRole('textbox', { name: 'Feature Items' });
    expect(featuresInput.getAttribute('value')).toBe('Great Features');
  });

  it('handles expanding and collapsing section cards', async () => {
    const user = userEvent.setup();
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [{ type_id: 'hero', data: { title: 'First Hero' } }],
      }
    );

    // Initial state: expanded
    const titleInput = screen.getByRole('textbox', { name: 'Title' });
    expect(titleInput.getAttribute('value')).toBe('First Hero');
    const collapseBtn = screen.getByRole('button', { name: 'Collapse section' });

    // Collapse
    await user.click(collapseBtn);
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();

    // Expand
    const expandBtn = screen.getByRole('button', { name: 'Expand section' });
    await user.click(expandBtn);
    const restoredTitleInput = screen.getByRole('textbox', { name: 'Title' });
    expect(restoredTitleInput.getAttribute('value')).toBe('First Hero');
  });

  it('deletes a section when clicking delete button', async () => {
    const user = userEvent.setup();
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
    await user.click(deleteButtons[0]);

    expect(screen.queryByText('Hero Section')).toBeNull();
    const remainingHeading = screen.getByText('Features Section');
    expect(remainingHeading.textContent).toBe('Features Section');
    expect(screen.getAllByRole('button', { name: 'Delete section' })).toHaveLength(1);
  });

  it('moves sections up and down', async () => {
    const user = userEvent.setup();
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
    expect(moveDownButtons[0].hasAttribute('disabled')).toBe(false);
    expect(moveDownButtons[1].hasAttribute('disabled')).toBe(true);

    // First section can move down
    await user.click(moveDownButtons[0]);

    // Check headings order or move buttons status
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move section up' });
    // Features Section is now first (so its move up button is disabled)
    expect(moveUpButtons[0].hasAttribute('disabled')).toBe(true);
    expect(moveUpButtons[1].hasAttribute('disabled')).toBe(false);

    const sectionHeadings = screen.getAllByText(/(Hero|Features) Section/);
    expect(sectionHeadings.map((h) => h.textContent)).toEqual([
      'Features Section',
      'Hero Section',
    ]);
  });

  it('handles missing template gracefully and permits deletion', async () => {
    const user = userEvent.setup();
    renderWithForm(
      <SectionList sectionTemplates={mockTemplates} />,
      {
        sections: [{ type_id: 'non_existent_template', data: {} }],
      }
    );

    const missingNotice = screen.getByText('Missing template');
    expect(missingNotice.textContent).toBe('Missing template');
    const missingTypeId = screen.getByText('(non_existent_template)');
    expect(missingTypeId.textContent).toBe('(non_existent_template)');

    const deleteBtn = screen.getByRole('button', { name: 'Delete section' });
    await user.click(deleteBtn);

    expect(screen.queryByText('Missing template')).toBeNull();
    const emptyNotice = screen.getByText(
      'No sections added yet. Click "Add Section..." above to add one.'
    );
    expect(emptyNotice.textContent).toContain('No sections added yet');
  });

  it('preserves collapsed section state when moving sections up and down', async () => {
    const user = userEvent.setup();
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
    await user.click(collapseButtons[0]);

    // First section is now collapsed (has "Expand section" button)
    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();

    // Move first section down
    const moveDownButtons = screen.getAllByRole('button', { name: 'Move section down' });
    await user.click(moveDownButtons[0]);

    // Now index 0 is Features (expanded) and index 1 is Hero (collapsed)
    const expandButtonsAfterMove = screen.getAllByRole('button', { name: 'Expand section' });
    expect(expandButtonsAfterMove).toHaveLength(1);
    expect(screen.getByRole('textbox', { name: 'Feature Items' }).getAttribute('value')).toBe('Feature 2');
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();

    // Move index 1 (Hero) back up
    const moveUpButtons = screen.getAllByRole('button', { name: 'Move section up' });
    await user.click(moveUpButtons[1]);

    // Hero is back at index 0 and still collapsed
    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
  });

  it('preserves collapsed section state when another section is deleted', async () => {
    const user = userEvent.setup();
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
    await user.click(collapseButtons[1]); // Collapse Features

    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: 'Feature Items' })).toBeNull();

    // Delete first section (Hero)
    const deleteButtons = screen.getAllByRole('button', { name: 'Delete section' });
    await user.click(deleteButtons[0]);

    // Now Features is at index 0 and should still be collapsed
    expect(screen.getAllByRole('button', { name: 'Expand section' })).toHaveLength(1);
    expect(screen.queryByRole('textbox', { name: 'Feature Items' })).toBeNull();
  });

  it('renders inline error message with role="alert" when section has nested validation error', async () => {
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

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Title is required');
  });

  it('auto-expands collapsed section when validation error arrives', async () => {
    const user = userEvent.setup();
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
    await user.click(collapseBtn);
    expect(screen.queryByRole('textbox', { name: 'Title' })).toBeNull();
    const expandBtn = screen.getByRole('button', { name: 'Expand section' });
    expect(expandBtn.getAttribute('aria-label')).toBe('Expand section');

    // Trigger error
    await user.click(screen.getByRole('button', { name: 'Trigger Error' }));

    // Should auto-expand and show alert
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Title is required');
    const restoredTitleInput = screen.getByRole('textbox', { name: 'Title' });
    expect(restoredTitleInput.getAttribute('aria-invalid')).toBe('true');
  });
});
