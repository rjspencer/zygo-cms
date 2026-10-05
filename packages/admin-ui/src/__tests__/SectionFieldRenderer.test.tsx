import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { SectionFieldRenderer } from '../components/SectionFieldRenderer';
import { SectionTemplateField } from '../types/sectionTemplate';

describe('SectionFieldRenderer Component', () => {
  const fields: SectionTemplateField[] = [
    { name: 'headline', type: 'text', label: 'Headline', required: true },
    { name: 'bio', type: 'textarea', label: 'Bio' },
    { name: 'website', type: 'url', label: 'Website' },
    { name: 'is_featured', type: 'boolean', label: 'Featured' },
    { name: 'avatar', type: 'image', label: 'Avatar' },
    { name: 'role', type: 'select', label: 'Role', options: ['Admin', 'Editor', 'Viewer'] },
    {
      name: 'items',
      type: 'list',
      label: 'Items',
      fields: [{ name: 'item_name', type: 'text', label: 'Item Name' }],
    },
  ];

  it('renders all supported field types properly', () => {
    const data = {
      headline: 'My Headline',
      bio: 'My bio content',
      website: 'https://example.com',
      is_featured: true,
      avatar: '/media/avatar.png',
      role: 'Editor',
      items: [{ item_name: 'Sub Item 1' }],
    };
    const onChange = vi.fn();

    render(
      <Theme>
        <SectionFieldRenderer fields={fields} data={data} onChange={onChange} />
      </Theme>
    );

    expect(screen.getByDisplayValue('My Headline')).toBeDefined();
    expect(screen.getByDisplayValue('My bio content')).toBeDefined();
    expect(screen.getByDisplayValue('https://example.com')).toBeDefined();
    expect(screen.getByText('/media/avatar.png')).toBeDefined();
    expect(screen.getByText('Item #1')).toBeDefined();
    expect(screen.getByDisplayValue('Sub Item 1')).toBeDefined();
  });

  it('calls onChange when text field is updated', () => {
    const data = { headline: 'Initial' };
    const onChange = vi.fn();

    render(
      <Theme>
        <SectionFieldRenderer fields={fields} data={data} onChange={onChange} />
      </Theme>
    );

    const input = screen.getByDisplayValue('Initial');
    fireEvent.change(input, { target: { value: 'Updated' } });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ headline: 'Updated' })
    );
  });

  it('calls onOpenMediaPicker when Select Image is clicked on image field', () => {
    const data = { avatar: '' };
    const onChange = vi.fn();
    const onOpenMediaPicker = vi.fn();

    render(
      <Theme>
        <SectionFieldRenderer
          fields={fields}
          data={data}
          onChange={onChange}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      </Theme>
    );

    const selectImageBtn = screen.getByRole('button', { name: /select image/i });
    fireEvent.click(selectImageBtn);

    expect(onOpenMediaPicker).toHaveBeenCalledTimes(1);
    expect(typeof onOpenMediaPicker.mock.calls[0][0]).toBe('function');
  });

  it('removes image URL when Remove button is clicked', () => {
    const data = { avatar: '/media/old.png' };
    const onChange = vi.fn();

    render(
      <Theme>
        <SectionFieldRenderer fields={fields} data={data} onChange={onChange} />
      </Theme>
    );

    const removeBtn = screen.getByRole('button', { name: /remove/i });
    fireEvent.click(removeBtn);

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ avatar: '' })
    );
  });
});
