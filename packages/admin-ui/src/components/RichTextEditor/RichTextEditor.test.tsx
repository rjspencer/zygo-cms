import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Theme } from '@radix-ui/themes';
import { RichTextEditor } from './RichTextEditor';

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

  it('preserves internal links without forcing target="_blank" or nofollow', () => {
    const onChange = vi.fn();

    render(
      <Theme>
        <RichTextEditor
          value='<p><a href="/open-source">Open Source</a></p>'
          onChange={onChange}
        />
      </Theme>
    );

    const linkEl = screen.getByRole('link', { name: 'Open Source' });
    expect(linkEl.getAttribute('href')).toBe('/open-source');
    expect(linkEl.getAttribute('target')).toBeNull();
    expect(linkEl.getAttribute('rel')).toBeNull();
  });

  it('resolves relative /media/ URLs in editor DOM via getPublicSiteUrl while preserving relative paths in getHTML', () => {
    const originalEnv = import.meta.env.VITE_PUBLIC_SITE_URL;
    import.meta.env.VITE_PUBLIC_SITE_URL = 'https://zygodactylstudios.com';
    const onChange = vi.fn();

    const { container } = render(
      <Theme>
        <RichTextEditor
          value='<p><img src="/media/123-pic.webp" alt="Pic"></p>'
          onChange={onChange}
        />
      </Theme>
    );

    const imgEl = container.querySelector('.tiptap img') as HTMLImageElement;
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe('https://zygodactylstudios.com/media/123-pic.webp');
    expect(imgEl.getAttribute('alt')).toBe('Pic');

    import.meta.env.VITE_PUBLIC_SITE_URL = originalEnv;
  });
});
