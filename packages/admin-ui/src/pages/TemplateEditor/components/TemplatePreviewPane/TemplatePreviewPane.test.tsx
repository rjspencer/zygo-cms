import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Theme } from '@radix-ui/themes';
import { TemplatePreviewPane } from './TemplatePreviewPane';

describe('TemplatePreviewPane', () => {
  it('renders iframe with public site base tag, style.css, and preview content', () => {
    const previewHtml = '<div class="hero-block"><h3>Template Title</h3></div>';
    const formTemplateCss = '.hero-block { background: blue; }';

    render(
      <Theme>
        <TemplatePreviewPane
          formId="hero_section"
          previewHtml={previewHtml}
          formTemplateCss={formTemplateCss}
          debouncedWasmHtml={previewHtml}
          formTemplateHtml={previewHtml}
          isStatusCompiling={false}
          renderCount={1}
        />
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
    expect(srcDoc).toContain(formTemplateCss);

    // Verify click interceptor script is present
    expect(srcDoc).toContain('e.preventDefault()');
  });

  it('renders waiting message when previewHtml is empty', () => {
    render(
      <Theme>
        <TemplatePreviewPane
          formId="hero_section"
          previewHtml=""
          formTemplateCss=""
          debouncedWasmHtml=""
          formTemplateHtml=""
          isStatusCompiling={false}
          renderCount={0}
        />
      </Theme>
    );

    const iframe = screen.getByTitle('Wasm Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcdoc') || '';
    expect(srcDoc).toContain('Waiting for template render...');
  });

  it('injects active theme fontUrl and themeCss into preview iframe', () => {
    const customThemeCss = ':root { --color-accent: #ffdf00; --border-radius: 2px; }';
    const customFontUrl = 'https://fonts.googleapis.com/css2?family=Space+Grotesk&display=swap';

    render(
      <Theme>
        <TemplatePreviewPane
          formId="hero_section"
          previewHtml="<div>Bento Preview</div>"
          formTemplateCss=""
          debouncedWasmHtml="<div>Bento Preview</div>"
          formTemplateHtml="<div>Bento Preview</div>"
          isStatusCompiling={false}
          renderCount={1}
          themeCss={customThemeCss}
          fontUrl={customFontUrl}
        />
      </Theme>
    );

    const iframe = screen.getByTitle('Wasm Preview') as HTMLIFrameElement;
    const srcDoc = iframe.getAttribute('srcdoc') || '';
    expect(srcDoc).toContain(customFontUrl);
    expect(srcDoc).toContain('id="zygo-theme-tokens"');
    expect(srcDoc).toContain(customThemeCss);
  });
});
