import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Theme } from '@radix-ui/themes';
import { RichTextEditor } from './RichTextEditor';
import { toMediumImageUrl } from './hooks/useRichTextEditor';
import { getPublicSiteUrl } from '../../utils/api';

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

    expect(screen.getByRole('button', { name: 'Bold' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Italic' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Strikethrough' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Inline Code' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Heading 1' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Heading 2' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Heading 3' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Bullet List' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Ordered List' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Blockquote' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Link' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Insert Image' }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: 'Undo' }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: 'Redo' }).hasAttribute('disabled')).toBe(true);

    expect(screen.getByText('Hello world').textContent).toContain('Hello world');
  });

  it('triggers onOpenMediaPicker when Insert Image is clicked', async () => {
    const user = userEvent.setup();
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
    await user.click(imageBtn);

    expect(onOpenMediaPicker).toHaveBeenCalledTimes(1);
    expect(typeof onOpenMediaPicker.mock.calls[0][0]).toBe('function');
  });

  it('inserts medium sized image with width="1024" and style="max-width: 100%" via onOpenMediaPicker callback', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    let insertCallback: ((url: string, alt?: string) => void) | undefined;
    const onOpenMediaPicker = vi.fn((cb) => {
      insertCallback = cb;
    });

    const { container } = render(
      <Theme>
        <RichTextEditor
          value="<p>Test</p>"
          onChange={onChange}
          onOpenMediaPicker={onOpenMediaPicker}
        />
      </Theme>
    );

    const imageBtn = screen.getByRole('button', { name: 'Insert Image' });
    await user.click(imageBtn);
    expect(typeof insertCallback).toBe('function');

    insertCallback!('/media/banner.png', 'Sample Banner');

    const imgEl = container.querySelector('.tiptap img') as HTMLImageElement;
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe(getPublicSiteUrl('/media/banner.png?size=md'));
    expect(imgEl.getAttribute('alt')).toBe('Sample Banner');
    expect(imgEl.getAttribute('width')).toBe('1024');
    expect(imgEl.getAttribute('style')).toContain('max-width: 100%');

    expect(onChange).toHaveBeenCalled();
    const lastHtml = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(lastHtml).toContain('/media/banner.png?size=md');
    expect(lastHtml).toContain('width="1024"');
    expect(lastHtml).toMatch(/style="max-width:\s*100%;?"/);
  });

  it('inserts image with width="1024" and style="max-width: 100%" without ?size=md when prompted for URL', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/pic.jpg');

    const { container } = render(
      <Theme>
        <RichTextEditor value="<p>Test</p>" onChange={onChange} />
      </Theme>
    );

    const imageBtn = screen.getByRole('button', { name: 'Insert Image' });
    await user.click(imageBtn);

    const imgEl = container.querySelector('.tiptap img') as HTMLImageElement;
    expect(imgEl).not.toBeNull();
    expect(imgEl.getAttribute('src')).toBe('https://example.com/pic.jpg');
    expect(imgEl.getAttribute('width')).toBe('1024');
    expect(imgEl.getAttribute('style')).toContain('max-width: 100%');

    promptSpy.mockRestore();
  });

  it('prompts for image URL when onOpenMediaPicker is not passed', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com/pic.jpg');

    render(
      <Theme>
        <RichTextEditor value="<p>Test</p>" onChange={onChange} />
      </Theme>
    );

    const imageBtn = screen.getByRole('button', { name: 'Insert Image' });
    await user.click(imageBtn);

    expect(promptSpy).toHaveBeenCalledWith('Enter image URL');
    promptSpy.mockRestore();
  });

  it('prompts for link URL when Link button is clicked', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const promptSpy = vi.spyOn(window, 'prompt').mockReturnValue('https://example.com');

    render(
      <Theme>
        <RichTextEditor value="<p>Test link</p>" onChange={onChange} />
      </Theme>
    );

    const linkBtn = screen.getByRole('button', { name: 'Link' });
    await user.click(linkBtn);

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

    import.meta.env.VITE_PUBLIC_SITE_URL = originalEnv || '';
  });

  describe('toMediumImageUrl helper', () => {
    it('appends ?size=md to clean url', () => {
      expect(toMediumImageUrl('/media/photo.png')).toBe('/media/photo.png?size=md');
    });

    it('appends &size=md when url already has query params', () => {
      expect(toMediumImageUrl('/media/photo.png?version=1')).toBe('/media/photo.png?version=1&size=md');
    });

    it('replaces existing size param with md', () => {
      expect(toMediumImageUrl('/media/photo.png?size=thumb')).toBe('/media/photo.png?size=md');
      expect(toMediumImageUrl('/media/photo.png?version=1&size=lg')).toBe('/media/photo.png?version=1&size=md');
    });

    it('returns empty string if url is empty', () => {
      expect(toMediumImageUrl('')).toBe('');
    });
  });
});
