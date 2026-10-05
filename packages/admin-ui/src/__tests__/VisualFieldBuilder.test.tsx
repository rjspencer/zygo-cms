import React, { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { Theme } from '@radix-ui/themes';
import {
  VisualFieldBuilder,
  slugify,
  FIELD_TYPES,
  SUBFIELD_TYPES,
} from '../components/VisualFieldBuilder';
import { SectionTemplateField } from '../types/sectionTemplate';

describe('slugify utility', () => {
  it('converts labels to lowercase slug format', () => {
    expect(slugify('Headline')).toBe('headline');
    expect(slugify('Hero Section Title')).toBe('hero_section_title');
    expect(slugify('  Spaced Label  ')).toBe('spaced_label');
    expect(slugify('Special @#$ Characters!')).toBe('special_____characters');
    expect(slugify('___Already_Underscored___')).toBe('already_underscored');
    expect(slugify('')).toBe('');
  });
});

describe('VisualFieldBuilder Component', () => {
  const renderBuilder = (
    fields: SectionTemplateField[],
    onChange = vi.fn(),
    disabled = false
  ) => {
    return render(
      <Theme>
        <VisualFieldBuilder fields={fields} onChange={onChange} disabled={disabled} />
      </Theme>
    );
  };

  const StatefulBuilder: React.FC<{
    initialFields?: SectionTemplateField[];
    onChangeSpy?: (fields: SectionTemplateField[]) => void;
    disabled?: boolean;
  }> = ({ initialFields = [], onChangeSpy, disabled = false }) => {
    const [fields, setFields] = useState<SectionTemplateField[]>(initialFields);
    const handleChange = (updated: SectionTemplateField[]) => {
      setFields(updated);
      onChangeSpy?.(updated);
    };

    return (
      <Theme>
        <VisualFieldBuilder fields={fields} onChange={handleChange} disabled={disabled} />
      </Theme>
    );
  };

  it('renders empty state when no fields are present', () => {
    renderBuilder([]);
    expect(screen.getByText(/no fields defined yet/i)).toBeDefined();
    expect(screen.getByRole('button', { name: /add field/i })).toBeDefined();
  });

  it('renders fields with correct values and controls', () => {
    const fields: SectionTemplateField[] = [
      {
        name: 'headline',
        type: 'text',
        label: 'Headline',
        required: true,
      },
    ];

    renderBuilder(fields);

    expect(screen.getByDisplayValue('Headline')).toBeDefined();
    expect(screen.getByDisplayValue('headline')).toBeDefined();
    expect(screen.getByRole('switch', { name: /required/i })).toBeDefined();
    expect(
      screen.getByRole('switch', { name: /required/i }).getAttribute('aria-checked')
    ).toBe('true');
    expect(screen.getByRole('button', { name: /delete field/i })).toBeDefined();
  });

  it('adds a new field with default values when Add Field is clicked', async () => {
    const onChange = vi.fn();
    renderBuilder([], onChange);

    const addBtn = screen.getByRole('button', { name: /add field/i });
    await userEvent.click(addBtn);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([
      {
        name: '',
        type: 'text',
        label: '',
        required: false,
      },
    ]);
  });

  it('auto-slugifies name from label when typing label', async () => {
    const onChangeSpy = vi.fn();
    render(
      <StatefulBuilder
        initialFields={[{ name: '', type: 'text', label: '', required: false }]}
        onChangeSpy={onChangeSpy}
      />
    );

    const labelInput = screen.getByPlaceholderText('Field Label') as HTMLInputElement;
    await userEvent.type(labelInput, 'Hero Title');

    expect(labelInput.value).toBe('Hero Title');
    const nameInput = screen.getByPlaceholderText('Field Name') as HTMLInputElement;
    expect(nameInput.value).toBe('hero_title');

    expect(onChangeSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({
        label: 'Hero Title',
        name: 'hero_title',
      }),
    ]);
  });

  it('stops auto-slugifying after name is manually edited', async () => {
    const onChangeSpy = vi.fn();
    render(
      <StatefulBuilder
        initialFields={[{ name: '', type: 'text', label: '', required: false }]}
        onChangeSpy={onChangeSpy}
      />
    );

    const labelInput = screen.getByPlaceholderText('Field Label') as HTMLInputElement;
    const nameInput = screen.getByPlaceholderText('Field Name') as HTMLInputElement;

    // 1. Type label -> name auto-slugifies
    await userEvent.type(labelInput, 'Banner');
    expect(nameInput.value).toBe('banner');

    // 2. Edit name directly
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'custom_banner_key');
    expect(nameInput.value).toBe('custom_banner_key');

    // 3. Edit label again -> name must NOT be overwritten
    await userEvent.clear(labelInput);
    await userEvent.type(labelInput, 'Updated Headline');

    expect(labelInput.value).toBe('Updated Headline');
    expect(nameInput.value).toBe('custom_banner_key');
  });

  it('toggles required switch', async () => {
    const onChange = vi.fn();
    renderBuilder(
      [{ name: 'title', type: 'text', label: 'Title', required: false }],
      onChange
    );

    const reqSwitch = screen.getByRole('switch', { name: /required/i });
    expect(reqSwitch.getAttribute('aria-checked')).toBe('false');

    fireEvent.click(reqSwitch);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'title',
        required: true,
      }),
    ]);
  });

  it('renders and allows interacting with field type selector', async () => {
    const onChange = vi.fn();
    renderBuilder(
      [{ name: 'description', type: 'text', label: 'Description', required: false }],
      onChange
    );

    const typeTrigger = screen.getByRole('combobox', { name: /field type/i });
    expect(typeTrigger).toBeDefined();
    expect(typeTrigger.textContent).toContain('Text');

    fireEvent.keyDown(typeTrigger, { key: ' ' });
    const textareaOption = await screen.findByRole('option', { name: 'Textarea' });
    expect(textareaOption).toBeDefined();
    fireEvent.click(textareaOption);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'textarea',
      }),
    ]);
  });

  it('deletes a field when Delete field is clicked', async () => {
    const onChange = vi.fn();
    const fields: SectionTemplateField[] = [
      { name: 'field_1', type: 'text', label: 'Field 1' },
      { name: 'field_2', type: 'text', label: 'Field 2' },
    ];
    renderBuilder(fields, onChange);

    const deleteButtons = screen.getAllByRole('button', { name: /delete field/i });
    expect(deleteButtons).toHaveLength(2);

    await userEvent.click(deleteButtons[0]);

    expect(onChange).toHaveBeenCalledWith([
      { name: 'field_2', type: 'text', label: 'Field 2' },
    ]);
  });

  describe('Select options editor', () => {
    it('renders options editor when type is select', () => {
      const fields: SectionTemplateField[] = [
        {
          name: 'choice',
          type: 'select',
          label: 'Choice',
          options: ['Option A', 'Option B'],
        },
      ];

      renderBuilder(fields);

      expect(screen.getByText('Select Options')).toBeDefined();
      expect(screen.getByDisplayValue('Option A')).toBeDefined();
      expect(screen.getByDisplayValue('Option B')).toBeDefined();
      expect(screen.getByRole('button', { name: /add option/i })).toBeDefined();
    });

    it('adds, edits, and deletes options', async () => {
      const onChangeSpy = vi.fn();
      render(
        <StatefulBuilder
          initialFields={[
            {
              name: 'choice',
              type: 'select',
              label: 'Choice',
              options: ['First'],
            },
          ]}
          onChangeSpy={onChangeSpy}
        />
      );

      // Add Option
      const addOptionBtn = screen.getByRole('button', { name: /add option/i });
      await userEvent.click(addOptionBtn);

      const optionInputs = screen.getAllByPlaceholderText(/Option \d+/i);
      expect(optionInputs).toHaveLength(2);

      // Edit newly added option
      const secondOptionInput = optionInputs[1] as HTMLInputElement;
      await userEvent.type(secondOptionInput, 'Second Option');
      expect(secondOptionInput.value).toBe('Second Option');

      // Delete the first option
      const removeButtons = screen.getAllByRole('button', { name: /remove option/i });
      await userEvent.click(removeButtons[0]);

      expect(screen.getAllByPlaceholderText(/Option \d+/i)).toHaveLength(1);
      expect(screen.getByDisplayValue('Second Option')).toBeDefined();
    });
  });

  describe('List sub-fields editor', () => {
    it('renders list sub-fields editor with sub-field elements', () => {
      const fields: SectionTemplateField[] = [
        {
          name: 'items',
          type: 'list',
          label: 'Items',
          fields: [
            { name: 'item_title', type: 'text', label: 'Item Title', required: true },
          ],
        },
      ];

      renderBuilder(fields);

      expect(screen.getByText('List Sub-fields')).toBeDefined();
      expect(screen.getByDisplayValue('Item Title')).toBeDefined();
      expect(screen.getByDisplayValue('item_title')).toBeDefined();
      expect(screen.getByRole('button', { name: /add sub-field/i })).toBeDefined();
      expect(screen.getByRole('button', { name: /remove sub-field/i })).toBeDefined();
    });

    it('adds sub-field and auto-slugifies sub-field label to name', async () => {
      const onChangeSpy = vi.fn();
      render(
        <StatefulBuilder
          initialFields={[
            {
              name: 'items',
              type: 'list',
              label: 'Items',
              fields: [],
            },
          ]}
          onChangeSpy={onChangeSpy}
        />
      );

      // Add subfield
      const addSubBtn = screen.getByRole('button', { name: /add sub-field/i });
      await userEvent.click(addSubBtn);

      const subLabelInput = screen.getByPlaceholderText('Sub-field Label') as HTMLInputElement;
      const subNameInput = screen.getByPlaceholderText('Sub-field Name') as HTMLInputElement;

      await userEvent.type(subLabelInput, 'Button Text');
      expect(subLabelInput.value).toBe('Button Text');
      expect(subNameInput.value).toBe('button_text');
    });

    it('stops auto-slugifying sub-field name when sub-field name is manually edited', async () => {
      const onChangeSpy = vi.fn();
      render(
        <StatefulBuilder
          initialFields={[
            {
              name: 'items',
              type: 'list',
              label: 'Items',
              fields: [{ name: '', type: 'text', label: '', required: false }],
            },
          ]}
          onChangeSpy={onChangeSpy}
        />
      );

      const subLabelInput = screen.getByPlaceholderText('Sub-field Label') as HTMLInputElement;
      const subNameInput = screen.getByPlaceholderText('Sub-field Name') as HTMLInputElement;

      await userEvent.type(subLabelInput, 'Price');
      expect(subNameInput.value).toBe('price');

      await userEvent.clear(subNameInput);
      await userEvent.type(subNameInput, 'custom_price');
      expect(subNameInput.value).toBe('custom_price');

      await userEvent.clear(subLabelInput);
      await userEvent.type(subLabelInput, 'Amount');

      expect(subLabelInput.value).toBe('Amount');
      expect(subNameInput.value).toBe('custom_price');
    });

    it('deletes a sub-field', async () => {
      const onChangeSpy = vi.fn();
      render(
        <StatefulBuilder
          initialFields={[
            {
              name: 'items',
              type: 'list',
              label: 'Items',
              fields: [
                { name: 'sub1', type: 'text', label: 'Sub 1' },
                { name: 'sub2', type: 'text', label: 'Sub 2' },
              ],
            },
          ]}
          onChangeSpy={onChangeSpy}
        />
      );

      const removeSubBtns = screen.getAllByRole('button', { name: /remove sub-field/i });
      expect(removeSubBtns).toHaveLength(2);

      await userEvent.click(removeSubBtns[0]);

      expect(screen.queryByDisplayValue('Sub 1')).toBeNull();
      expect(screen.getByDisplayValue('Sub 2')).toBeDefined();
    });

    it('changes sub-field type to select and renders sub-field options editor', async () => {
      const onChangeSpy = vi.fn();
      render(
        <StatefulBuilder
          initialFields={[
            {
              name: 'items',
              type: 'list',
              label: 'Items',
              fields: [{ name: 'sub1', type: 'text', label: 'Sub 1' }],
            },
          ]}
          onChangeSpy={onChangeSpy}
        />
      );

      const subTypeTrigger = screen.getByRole('combobox', { name: /sub-field type/i });
      fireEvent.keyDown(subTypeTrigger, { key: ' ' });
      const selectOption = await screen.findByRole('option', { name: 'Select' });
      fireEvent.click(selectOption);

      expect(await screen.findByText('Select Options')).toBeDefined();
    });

    it('SUBFIELD_TYPES disallows nested list type', () => {
      const subfieldValues = SUBFIELD_TYPES.map((t) => t.value);
      expect(subfieldValues).not.toContain('list');
      expect(subfieldValues).toEqual([
        'text',
        'textarea',
        'richtext',
        'url',
        'boolean',
        'image',
        'select',
      ]);

      const topFieldValues = FIELD_TYPES.map((t) => t.value);
      expect(topFieldValues).toContain('list');
    });
  });

  describe('Disabled state', () => {
    it('disables all inputs, buttons, and switches when disabled prop is true', () => {
      const fields: SectionTemplateField[] = [
        {
          name: 'choice',
          type: 'select',
          label: 'Choice',
          options: ['Option 1'],
        },
        {
          name: 'items',
          type: 'list',
          label: 'Items',
          fields: [{ name: 'sub', type: 'text', label: 'Sub' }],
        },
      ];

      renderBuilder(fields, vi.fn(), true);

      // Top level buttons
      expect((screen.getByRole('button', { name: /add field/i }) as HTMLButtonElement).disabled).toBe(true);
      screen.getAllByRole('button', { name: /delete field/i }).forEach((btn) => {
        expect((btn as HTMLButtonElement).disabled).toBe(true);
      });

      // Options editor buttons and inputs
      expect((screen.getByRole('button', { name: /add option/i }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: /remove option/i }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByPlaceholderText('Option 1') as HTMLInputElement).disabled).toBe(true);

      // Subfields editor buttons and inputs
      expect((screen.getByRole('button', { name: /add sub-field/i }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByRole('button', { name: /remove sub-field/i }) as HTMLButtonElement).disabled).toBe(true);
      expect((screen.getByPlaceholderText('Sub-field Label') as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByPlaceholderText('Sub-field Name') as HTMLInputElement).disabled).toBe(true);

      // Top level inputs and switches
      expect((screen.getByDisplayValue('Choice') as HTMLInputElement).disabled).toBe(true);
      expect((screen.getByDisplayValue('choice') as HTMLInputElement).disabled).toBe(true);
      screen.getAllByRole('switch').forEach((sw) => {
        expect((sw as HTMLButtonElement).disabled).toBe(true);
      });
    });
  });
});
