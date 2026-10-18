import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { SectionFieldRenderer } from './SectionFieldRenderer';
import { SectionTemplateField } from '../../types/sectionTemplate';

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

  it('renders "Select Video" button and triggers onOpenMediaPicker for video field type', () => {
    const videoFields: SectionTemplateField[] = [
      { name: 'promo_video', type: 'video', label: 'Promo Video' },
    ];
    const data = { promo_video: '' };
    const onChange = vi.fn();
    const onOpenMediaPicker = vi.fn();

    render(
      <Theme>
        <SectionFieldRenderer
          fields={videoFields}
          data={data}
          onChange={onChange}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      </Theme>
    );

    const selectVideoBtn = screen.getByRole('button', { name: /select video/i });
    expect(selectVideoBtn).toBeDefined();
    fireEvent.click(selectVideoBtn);

    expect(onOpenMediaPicker).toHaveBeenCalledTimes(1);
  });

  it('correctly associates labels with form controls and avoids orphan labels for non-input controls', () => {
    const data = {
      headline: 'My Headline',
      bio: 'My bio content',
      website: 'https://example.com',
      is_featured: true,
      avatar: '/media/avatar.png',
      role: 'Editor',
      items: [{ item_name: 'Sub Item 1' }],
    };

    render(
      <Theme>
        <SectionFieldRenderer fields={fields} data={data} onChange={vi.fn()} />
      </Theme>
    );

    // Labelable fields use <label> with htmlFor matching control id
    const headlineLabel = screen.getByText(/Headline/);
    expect(headlineLabel.tagName.toLowerCase()).toBe('label');
    const headlineInput = screen.getByDisplayValue('My Headline');
    expect(headlineLabel.getAttribute('for')).toBe(headlineInput.getAttribute('id'));

    const bioLabel = screen.getByText('Bio');
    expect(bioLabel.tagName.toLowerCase()).toBe('label');
    const bioInput = screen.getByDisplayValue('My bio content');
    expect(bioLabel.getAttribute('for')).toBe(bioInput.getAttribute('id'));

    const websiteLabel = screen.getByText('Website');
    expect(websiteLabel.tagName.toLowerCase()).toBe('label');
    const websiteInput = screen.getByDisplayValue('https://example.com');
    expect(websiteLabel.getAttribute('for')).toBe(websiteInput.getAttribute('id'));

    const featuredLabel = screen.getByText('Featured');
    expect(featuredLabel.tagName.toLowerCase()).toBe('label');
    const switchControl = screen.getByRole('switch', { name: 'Featured' });
    expect(featuredLabel.getAttribute('for')).toBe(switchControl.getAttribute('id'));

    // Non-labelable fields render as <div> without htmlFor
    const avatarLabel = screen.getByText('Avatar');
    expect(avatarLabel.tagName.toLowerCase()).toBe('div');
    expect(avatarLabel.getAttribute('for')).toBeNull();

    // Image control group is labeled by the labelId
    const imageGroup = screen.getByRole('group');
    expect(imageGroup.getAttribute('aria-labelledby')).toBe(avatarLabel.getAttribute('id'));
  });

  it('sets aria-invalid and aria-describedby on inputs when field errors exist', () => {
    const data = { headline: '', bio: '' };
    const errors = {
      headline: 'Headline is required',
    };

    render(
      <Theme>
        <SectionFieldRenderer
          fields={fields}
          data={data}
          onChange={vi.fn()}
          errors={errors}
        />
      </Theme>
    );

    const errorMessage = screen.getByText('Headline is required');
    expect(errorMessage.getAttribute('role')).toBe('alert');
    const errorId = errorMessage.getAttribute('id');
    expect(errorId).toBeDefined();

    const headlineInput = screen.getByPlaceholderText('Enter Headline');
    expect(headlineInput.getAttribute('aria-invalid')).toBe('true');
    expect(headlineInput.getAttribute('aria-describedby')).toBe(errorId);

    // Un-errored field should not have aria-invalid true or aria-describedby
    const bioInput = screen.getByPlaceholderText('Enter Bio');
    expect(bioInput.getAttribute('aria-invalid')).toBe('false');
    expect(bioInput.getAttribute('aria-describedby')).toBeNull();
  });
});
