import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CodeEditor } from './CodeEditor';
import * as themeModule from '../../context/ThemeModeContext';
import * as formatterModule from './hooks/useCodeFormatter';

describe('CodeEditor Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithTheme = (ui: React.ReactElement, mode: 'light' | 'dark' = 'dark') => {
    vi.spyOn(themeModule, 'useThemeMode').mockReturnValue({
      mode,
      toggleTheme: vi.fn(),
    });
    return render(ui);
  };

  it('renders HTML with MiniJinja template tags syntax highlighted', () => {
    const htmlSnippet = '<section class="hero">\n  {% if headline %}\n    <h1>{{ headline }}</h1>\n  {% endif %}\n</section>';
    const onChange = vi.fn();

    const { container } = renderWithTheme(
      <CodeEditor value={htmlSnippet} onChange={onChange} language="html" />
    );

    const textarea = screen.getByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });
    expect((textarea as HTMLTextAreaElement).value).toBe(htmlSnippet);

    // Verify Prism highlighted MiniJinja tokens in the <pre> block
    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();

    // Check for tokenized elements
    const tokens = container.querySelectorAll('.token');
    expect(tokens.length).toBeGreaterThan(0);

    // Check for django/jinja or delimiter / keyword tokens
    const delimiters = container.querySelectorAll('.token.delimiter, .token.django, .token.tag, .token.variable');
    expect(delimiters.length).toBeGreaterThan(0);
  });

  it('renders CSS with selectors and properties syntax highlighted', () => {
    const cssSnippet = '.hero {\n  position: relative;\n  color: #ffffff;\n  padding: 2rem;\n}';
    const onChange = vi.fn();

    const { container } = renderWithTheme(
      <CodeEditor value={cssSnippet} onChange={onChange} language="css" />
    );

    const textarea = screen.getByRole('textbox', { name: /CSS Stylesheet/i });
    expect((textarea as HTMLTextAreaElement).value).toBe(cssSnippet);

    const pre = container.querySelector('pre');
    expect(pre).not.toBeNull();

    const selectors = container.querySelectorAll('.token.selector');
    expect(selectors.length).toBeGreaterThan(0);

    const properties = container.querySelectorAll('.token.property');
    expect(properties.length).toBeGreaterThan(0);
  });

  it('renders base text and untokenized text with high-contrast styling and appropriate theme attributes in dark mode', () => {
    const htmlSnippet = '<div>Plain untokenized text content</div>';
    const onChange = vi.fn();

    const { container } = renderWithTheme(
      <CodeEditor value={htmlSnippet} onChange={onChange} language="html" />,
      'dark'
    );

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.classList.contains('zygo-code-editor')).toBe(true);
    expect(rootWrapper.classList.contains('zygo-code-editor--dark')).toBe(true);
    expect(rootWrapper.getAttribute('data-theme')).toBe('dark');
  });

  it('renders base text and untokenized text with appropriate theme attributes in light mode', () => {
    const htmlSnippet = '<div>Plain untokenized text content</div>';
    const onChange = vi.fn();

    const { container } = renderWithTheme(
      <CodeEditor value={htmlSnippet} onChange={onChange} language="html" />,
      'light'
    );

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.classList.contains('zygo-code-editor')).toBe(true);
    expect(rootWrapper.classList.contains('zygo-code-editor--light')).toBe(true);
    expect(rootWrapper.getAttribute('data-theme')).toBe('light');
  });

  it('blur event calls formatCode and triggers onChange with formatted code when valid', async () => {
    const user = userEvent.setup();
    const unformattedHtml = '<section><div><span>Unformatted</span></div></section>';
    const formattedHtml = '<section>\n  <div>\n    <span>Unformatted</span>\n  </div>\n</section>';
    const onChange = vi.fn();
    const onBlur = vi.fn();

    const formatSpy = vi.spyOn(formatterModule, 'formatCode').mockResolvedValue(formattedHtml);

    renderWithTheme(
      <CodeEditor
        value={unformattedHtml}
        onChange={onChange}
        language="html"
        onBlur={onBlur}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });

    await user.click(textarea);
    textarea.blur();

    await waitFor(() => {
      expect(formatSpy).toHaveBeenCalledWith(unformattedHtml, 'html');
      expect(onChange).toHaveBeenCalledWith(formattedHtml);
      expect(onBlur).toHaveBeenCalled();
    });
  });

  it('blur event does NOT crash or wipe code when syntax is invalid/incomplete', async () => {
    const user = userEvent.setup();
    const invalidHtml = '<section class="hero"><div unclosed-tag>';
    const onChange = vi.fn();
    const onBlur = vi.fn();

    // formatCode catches errors internally and returns original code (or throws if mocked)
    const formatSpy = vi.spyOn(formatterModule, 'formatCode').mockRejectedValue(new Error('SyntaxError: Unexpected closing tag'));

    renderWithTheme(
      <CodeEditor
        value={invalidHtml}
        onChange={onChange}
        language="html"
        onBlur={onBlur}
      />
    );

    const textarea = screen.getByRole('textbox', { name: /HTML Template \(MiniJinja\)/i });

    await user.click(textarea);
    textarea.blur();

    await waitFor(() => {
      expect(formatSpy).toHaveBeenCalledWith(invalidHtml, 'html');
      expect(onBlur).toHaveBeenCalled();
    });

    // Should NOT wipe code or call onChange with empty/corrupted value
    expect(onChange).not.toHaveBeenCalled();
    expect((textarea as HTMLTextAreaElement).value).toBe(invalidHtml);
  });

  it('disabled={true} disables the editor', () => {
    const snippet = '<p>Read only content</p>';
    const onChange = vi.fn();

    const { container } = renderWithTheme(
      <CodeEditor value={snippet} onChange={onChange} language="html" disabled={true} />
    );

    const textarea = screen.getByRole('textbox', { name: /HTML Template \(MiniJinja\)/i }) as HTMLTextAreaElement;
    expect(textarea.disabled).toBe(true);

    const rootWrapper = container.firstChild as HTMLElement;
    expect(rootWrapper.classList.contains('zygo-code-editor--disabled')).toBe(true);
    expect(rootWrapper.getAttribute('data-disabled')).toBe('true');
  });

  it('accessibility: aria-label is present and accessible with default or custom value', () => {
    const onChange = vi.fn();

    // Default HTML aria-label
    const { unmount } = renderWithTheme(
      <CodeEditor value="<div></div>" onChange={onChange} language="html" />
    );
    expect(
      screen.getByRole('textbox', { name: 'HTML Template (MiniJinja)' }).tagName
    ).toBe('TEXTAREA');
    unmount();

    // Default CSS aria-label
    const { unmount: unmountCss } = renderWithTheme(
      <CodeEditor value="body {}" onChange={onChange} language="css" />
    );
    expect(
      screen.getByRole('textbox', { name: 'CSS Stylesheet' }).tagName
    ).toBe('TEXTAREA');
    unmountCss();

    // Custom aria-label override
    renderWithTheme(
      <CodeEditor
        value="<span></span>"
        onChange={onChange}
        language="html"
        ariaLabel="Custom Code Editor Area"
      />
    );
    expect(
      screen.getByRole('textbox', { name: 'Custom Code Editor Area' }).tagName
    ).toBe('TEXTAREA');
  });

  it('respects explicit theme prop override regardless of context', () => {
    const { container: lightOverride } = renderWithTheme(
      <CodeEditor value="<div></div>" language="html" theme="light" />,
      'dark'
    );
    const lightEl = lightOverride.firstChild as HTMLElement;
    expect(lightEl.classList.contains('zygo-code-editor--light')).toBe(true);
    expect(lightEl.getAttribute('data-theme')).toBe('light');

    const { container: darkOverride } = renderWithTheme(
      <CodeEditor value="<div></div>" language="html" theme="dark" />,
      'light'
    );
    const darkEl = darkOverride.firstChild as HTMLElement;
    expect(darkEl.classList.contains('zygo-code-editor--dark')).toBe(true);
    expect(darkEl.getAttribute('data-theme')).toBe('dark');
  });
});
