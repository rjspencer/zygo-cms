import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { RichTextEditor } from '../components/RichTextEditor';

describe('RichTextEditor Component', () => {
  it('renders all required formatting toolbar buttons with correct aria-labels', () => {
    const onChange = vi.fn();
    render(
      <Theme>
        <RichTextEditor
          value="<p>Hello world</p>"
          onChange={onChange}
          aria-label="Post Body"
        />
      </Theme>
    );

    expect(screen.getByRole('button', { name: 'Bold' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Italic' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Strikethrough' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Inline Code' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Heading 1' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Heading 2' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Heading 3' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Bullet List' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Ordered List' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Blockquote' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Link' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Insert Image' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Undo' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Redo' })).toBeDefined();

    expect(screen.getByText('Hello world')).toBeDefined();
  });

  it('triggers onOpenMediaPicker when Insert Image is clicked', () => {
    const onChange = vi.fn();
    const onOpenMediaPicker = vi.fn();

    render(
      <Theme>
        <RichTextEditor
          value="<p>Test</p>"
          onChange={onChange}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      </Theme>
    );

    const imageBtn = screen.getByRole('button', { name: 'Insert Image' });
    fireEvent.click(imageBtn);

    expect(onOpenMediaPicker).toHaveBeenCalledTimes(1);
    expect(typeof onOpenMediaPicker.mock.calls[0][0]).toBe('function');
  });

  it('prompts for image URL when onOpenMediaPicker is not passed', () => {
    const onChange = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/pic.jpg');

    render(
      <Theme>
        <RichTextEditor value="<p>Test</p>" onChange={onChange} />
      </Theme>
    );

    const imageBtn = screen.getByRole('button', { name: 'Insert Image' });
    fireEvent.click(imageBtn);

    expect(promptSpy).toHaveBeenCalledWith('Enter image URL');
    promptSpy.mockRestore();
  });

  it('prompts for link URL when Link button is clicked', () => {
    const onChange = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    render(
      <Theme>
        <RichTextEditor value="<p>Test link</p>" onChange={onChange} />
      </Theme>
    );

    const linkBtn = screen.getByRole('button', { name: 'Link' });
    fireEvent.click(linkBtn);

    expect(promptSpy).toHaveBeenCalled();
    promptSpy.mockRestore();
  });
});
