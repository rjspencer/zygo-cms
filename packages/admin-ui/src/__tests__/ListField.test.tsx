import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { ListField } from '../components/ListField';
import { SectionTemplateField } from '../types/sectionTemplate';

describe('ListField Component', () => {
  const mockField: SectionTemplateField = {
    name: 'features',
    type: 'list',
    label: 'Features List',
    fields: [
      { name: 'title', type: 'text', label: 'Title' },
      { name: 'description', type: 'textarea', label: 'Description' },
      { name: 'is_active', type: 'boolean', label: 'Active' },
    ],
  };

  it('renders items with correct labels, and Add Item button', () => {
    const items = [
      { title: 'Feature 1', description: 'Desc 1', is_active: true },
      { title: 'Feature 2', description: 'Desc 2', is_active: false },
    ];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    expect(screen.getByText('Item #1')).toBeDefined();
    expect(screen.getByText('Item #2')).toBeDefined();
    expect(screen.getByRole('button', { name: /\+ add item/i })).toBeDefined();

    // Verify subfields rendered
    expect(screen.getByDisplayValue('Feature 1')).toBeDefined();
    expect(screen.getByDisplayValue('Feature 2')).toBeDefined();
  });

  it('disables Up button on first item and Down button on last item', () => {
    const items = [
      { title: 'Item 1' },
      { title: 'Item 2' },
    ];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    const upButtons = screen.getAllByRole('button', { name: /up/i });
    const downButtons = screen.getAllByRole('button', { name: /down/i });

    expect(upButtons[0].hasAttribute('disabled')).toBe(true);
    expect(upButtons[1].hasAttribute('disabled')).toBe(false);

    expect(downButtons[0].hasAttribute('disabled')).toBe(false);
    expect(downButtons[1].hasAttribute('disabled')).toBe(true);
  });

  it('calls onChange when "+ Add item" is clicked', () => {
    const items = [{ title: 'First' }];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    const addButton = screen.getByRole('button', { name: /\+ add item/i });
    fireEvent.click(addButton);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ title: 'First' }, {}]);
  });

  it('calls onChange to move item down', () => {
    const items = [{ title: 'Item A' }, { title: 'Item B' }];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    const downButtons = screen.getAllByRole('button', { name: /down/i });
    fireEvent.click(downButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ title: 'Item B' }, { title: 'Item A' }]);
  });

  it('calls onChange to move item up', () => {
    const items = [{ title: 'Item A' }, { title: 'Item B' }];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    const upButtons = screen.getAllByRole('button', { name: /up/i });
    fireEvent.click(upButtons[1]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ title: 'Item B' }, { title: 'Item A' }]);
  });

  it('calls onChange to remove an item', () => {
    const items = [{ title: 'Item 1' }, { title: 'Item 2' }];
    const onChange = vi.fn();

    render(
      <Theme>
        <ListField field={mockField} items={items} onChange={onChange} />
      </Theme>
    );

    const removeButtons = screen.getAllByRole('button', { name: /remove/i });
    fireEvent.click(removeButtons[0]);

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith([{ title: 'Item 2' }]);
  });
});
