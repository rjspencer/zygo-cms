import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { LivePreviewPane } from './LivePreviewPane';

describe('LivePreviewPane', () => {
  it('renders iframe with public site base tag, style.css, and preview content', () => {
    const previewHtml = '<section class="section-hero"><h1>Hello World</h1></section>';
    const previewCss = '.section-hero { color: red; }';

    render(
      <Theme>
        <LivePreviewPane previewHtml={previewHtml} previewCss={previewCss} />
      </Theme>
    );

    const iframe = screen.getByTitle('Wasm Preview') as HTMLIFrameElement;
    expect(iframe).toBeDefined();

    const srcDoc = iframe.getAttribute('srcdoc') || '';

    // Verify base tag is present to resolve relative /media/ URLs
    expect(srcDoc).toContain('<base href="');

    // Verify correct public stylesheet is linked
    expect(srcDoc).toContain('/style.css');
    expect(srcDoc).not.toContain('/styles/main.css');

    // Verify preview content and css are injected
    expect(srcDoc).toContain(previewHtml);
    expect(srcDoc).toContain(previewCss);

    // Verify click interceptor script is present
    expect(srcDoc).toContain('e.preventDefault()');
  });

  it('renders waiting message when previewHtml is empty', () => {
    render(
      <Theme>
        <LivePreviewPane previewHtml="" previewCss="" />
      </Theme>
    );

    const iframe = screen.getByTitle('Wasm Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcdoc') || '';
    expect(srcDoc).toContain('Waiting for preview render...');
  });
});
