import '../../test/setup';
import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { Theme } from '@radix-ui/themes';
import {
  VisualFieldBuilder,
  slugify,
  FIELD_TYPES,
  SUBFIELD_TYPES,
} from './index';
import { SectionTemplateField } from '../../types/sectionTemplate';

beforeAll(() => {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
  window.HTMLElement.prototype.setPointerCapture = () => {};
  window.HTMLElement.prototype.releasePointerCapture = () => {};
  window.HTMLElement.prototype.scrollIntoView = () => {};
});

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
    expect(screen.getByText(/no fields defined yet/i).textContent).toContain('No fields defined yet');
    const addBtn = screen.getByRole('button', { name: /add field/i });
    expect(addBtn.hasAttribute('disabled')).toBe(false);
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

    const labelInput = screen.getByRole('textbox', { name: /field label/i });
    expect(labelInput.getAttribute('value')).toBe('Headline');
    const nameInput = screen.getByRole('textbox', { name: /field name/i });
    expect(nameInput.getAttribute('value')).toBe('headline');
    const reqSwitch = screen.getByRole('switch', { name: /required/i });
    expect(reqSwitch.getAttribute('aria-checked')).toBe('true');
    const deleteBtn = screen.getByRole('button', { name: /delete field/i });
    expect(deleteBtn.hasAttribute('disabled')).toBe(false);
  });

  it('adds a new field with default values when Add Field is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBuilder([], onChange);

    const addBtn = screen.getByRole('button', { name: /add field/i });
    await user.click(addBtn);

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
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(
      <StatefulBuilder
        initialFields={[{ name: '', type: 'text', label: '', required: false }]}
        onChangeSpy={onChangeSpy}
      />
    );

    const labelInput = screen.getByRole('textbox', { name: /field label/i });
    await user.type(labelInput, 'Hero Title');

    expect(labelInput.getAttribute('value')).toBe('Hero Title');
    const nameInput = screen.getByRole('textbox', { name: /field name/i });
    expect(nameInput.getAttribute('value')).toBe('hero_title');

    expect(onChangeSpy).toHaveBeenLastCalledWith([
      expect.objectContaining({
        label: 'Hero Title',
        name: 'hero_title',
      }),
    ]);
  });

  it('stops auto-slugifying after name is manually edited', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn();
    render(
      <StatefulBuilder
        initialFields={[{ name: '', type: 'text', label: '', required: false }]}
        onChangeSpy={onChangeSpy}
      />
    );

    const labelInput = screen.getByRole('textbox', { name: /field label/i });
    const nameInput = screen.getByRole('textbox', { name: /field name/i });

    // 1. Type label -> name auto-slugifies
    await user.type(labelInput, 'Banner');
    expect(nameInput.getAttribute('value')).toBe('banner');

    // 2. Edit name directly
    await user.clear(nameInput);
    await user.type(nameInput, 'custom_banner_key');
    expect(nameInput.getAttribute('value')).toBe('custom_banner_key');

    // 3. Edit label again -> name must NOT be overwritten
    await user.clear(labelInput);
    await user.type(labelInput, 'Updated Headline');

    expect(labelInput.getAttribute('value')).toBe('Updated Headline');
    expect(nameInput.getAttribute('value')).toBe('custom_banner_key');
  });

  it('toggles required switch', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBuilder(
      [{ name: 'title', type: 'text', label: 'Title', required: false }],
      onChange
    );

    const reqSwitch = screen.getByRole('switch', { name: /required/i });
    expect(reqSwitch.getAttribute('aria-checked')).toBe('false');

    await user.click(reqSwitch);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'title',
        required: true,
      }),
    ]);
  });

  it('renders and allows interacting with field type selector', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderBuilder(
      [{ name: 'description', type: 'text', label: 'Description', required: false }],
      onChange
    );

    const typeTrigger = screen.getByRole('combobox', { name: /field type/i });
    expect(typeTrigger.textContent).toContain('Text');

    await user.click(typeTrigger);
    const textareaOption = await screen.findByRole('option', { name: 'Textarea' });
    await user.click(textareaOption);

    expect(onChange).toHaveBeenCalledWith([
      expect.objectContaining({
        type: 'textarea',
      }),
    ]);
  });

  it('deletes a field when Delete field is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const fields: SectionTemplateField[] = [
      { name: 'field_1', type: 'text', label: 'Field 1' },
      { name: 'field_2', type: 'text', label: 'Field 2' },
    ];
    renderBuilder(fields, onChange);

    const deleteButtons = screen.getAllByRole('button', { name: /delete field/i });
    expect(deleteButtons).toHaveLength(2);

    await user.click(deleteButtons[0]);

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

      expect(screen.getByText('Select Options').textContent).toBe('Select Options');
      expect((screen.getByRole('textbox', { name: 'Option 1' }) as HTMLInputElement).value).toBe('Option A');
      expect((screen.getByRole('textbox', { name: 'Option 2' }) as HTMLInputElement).value).toBe('Option B');
      const addOptionBtn = screen.getByRole('button', { name: /add option/i });
      expect(addOptionBtn.hasAttribute('disabled')).toBe(false);
    });

    it('adds, edits, and deletes options', async () => {
      const user = userEvent.setup();
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
      await user.click(addOptionBtn);

      const optionInputs = screen.getAllByRole('textbox', { name: /Option \d+/i });
      expect(optionInputs).toHaveLength(2);

      // Edit newly added option
      const secondOptionInput = optionInputs[1];
      await user.type(secondOptionInput, 'Second Option');
      expect(secondOptionInput.getAttribute('value')).toBe('Second Option');

      // Delete the first option
      const removeButtons = screen.getAllByRole('button', { name: /remove option/i });
      await user.click(removeButtons[0]);

      expect(screen.getAllByRole('textbox', { name: /Option \d+/i })).toHaveLength(1);
      expect((screen.getByRole('textbox', { name: 'Option 1' }) as HTMLInputElement).value).toBe('Second Option');
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

      expect(screen.getByText('List Sub-fields').textContent).toBe('List Sub-fields');
      expect((screen.getByRole('textbox', { name: /sub-field label/i }) as HTMLInputElement).value).toBe('Item Title');
      expect((screen.getByRole('textbox', { name: /sub-field name/i }) as HTMLInputElement).value).toBe('item_title');
      const addSubBtn = screen.getByRole('button', { name: /add sub-field/i });
      expect(addSubBtn.hasAttribute('disabled')).toBe(false);
      const removeSubBtn = screen.getByRole('button', { name: /remove sub-field/i });
      expect(removeSubBtn.hasAttribute('disabled')).toBe(false);
    });

    it('adds sub-field and auto-slugifies sub-field label to name', async () => {
      const user = userEvent.setup();
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
      await user.click(addSubBtn);

      const subLabelInput = screen.getByRole('textbox', { name: /sub-field label/i });
      const subNameInput = screen.getByRole('textbox', { name: /sub-field name/i });

      await user.type(subLabelInput, 'Button Text');
      expect(subLabelInput.getAttribute('value')).toBe('Button Text');
      expect(subNameInput.getAttribute('value')).toBe('button_text');
    });

    it('stops auto-slugifying sub-field name when sub-field name is manually edited', async () => {
      const user = userEvent.setup();
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

      const subLabelInput = screen.getByRole('textbox', { name: /sub-field label/i });
      const subNameInput = screen.getByRole('textbox', { name: /sub-field name/i });

      await user.type(subLabelInput, 'Price');
      expect(subNameInput.getAttribute('value')).toBe('price');

      await user.clear(subNameInput);
      await user.type(subNameInput, 'custom_price');
      expect(subNameInput.getAttribute('value')).toBe('custom_price');

      await user.clear(subLabelInput);
      await user.type(subLabelInput, 'Amount');

      expect(subLabelInput.getAttribute('value')).toBe('Amount');
      expect(subNameInput.getAttribute('value')).toBe('custom_price');
    });

    it('deletes a sub-field', async () => {
      const user = userEvent.setup();
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

      await user.click(removeSubBtns[0]);

      expect(screen.queryByDisplayValue('Sub 1')).toBeNull();
      expect((screen.getByRole('textbox', { name: /sub-field label/i }) as HTMLInputElement).value).toBe('Sub 2');
    });

    it('changes sub-field type to select and renders sub-field options editor', async () => {
      const user = userEvent.setup();
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
      await user.click(subTypeTrigger);
      const selectOption = await screen.findByRole('option', { name: 'Select' });
      await user.click(selectOption);

      expect((await screen.findByText('Select Options')).textContent).toBe('Select Options');
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
        'video',
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
      expect(screen.getByRole('button', { name: /add field/i }).hasAttribute('disabled')).toBe(true);
      screen.getAllByRole('button', { name: /delete field/i }).forEach((btn) => {
        expect(btn.hasAttribute('disabled')).toBe(true);
      });

      // Options editor buttons and inputs
      expect(screen.getByRole('button', { name: /add option/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('button', { name: /remove option/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('textbox', { name: 'Option 1' }).hasAttribute('disabled')).toBe(true);

      // Subfields editor buttons and inputs
      expect(screen.getByRole('button', { name: /add sub-field/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('button', { name: /remove sub-field/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('textbox', { name: /sub-field label/i }).hasAttribute('disabled')).toBe(true);
      expect(screen.getByRole('textbox', { name: /sub-field name/i }).hasAttribute('disabled')).toBe(true);

      // Top level inputs and switches
      screen.getAllByRole('textbox', { name: /field label/i }).forEach((input) => {
        expect(input.hasAttribute('disabled')).toBe(true);
      });
      screen.getAllByRole('textbox', { name: /field name/i }).forEach((input) => {
        expect(input.hasAttribute('disabled')).toBe(true);
      });
      screen.getAllByRole('switch').forEach((sw) => {
        expect(sw.hasAttribute('disabled')).toBe(true);
      });
    });
  });
});
