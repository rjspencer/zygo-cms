import React, { useState } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { WebMCPProvider, useWebMCP } from '../providers/WebMCPProvider';
import { useLayoutTemplateWebMCP } from '../lib/webmcp/layoutTemplateTools';
import type { LayoutTemplate } from '../types/layoutTemplate';

const mockTemplate: LayoutTemplate = {
  id: 'post',
  name: 'Posts Template',
  description: 'Default layout for posts',
  template_html: '<article><h1>{{ post.title }}</h1></article>',
  template_css: '.posts-list { display: flex; }',
  is_locked: false,
};

const TestLayoutTemplateComponent: React.FC<{
  onSaveMock: () => Promise<void>;
  onResetMock: () => Promise<void>;
}> = ({ onSaveMock, onResetMock }) => {
  const [html, setHtml] = useState(mockTemplate.template_html);
  const [css, setCss] = useState(mockTemplate.template_css);

  useLayoutTemplateWebMCP({
    templateId: 'post',
    template: mockTemplate,
    html,
    setHtml,
    css,
    setCss,
    onSave: onSaveMock,
    onReset: onResetMock,
    isSaving: false,
  });

  return <div data-testid="test-layout-template-cmp">Active</div>;
};

describe('WebMCP Layout Template Tools Integration', () => {
  it('registers and executes layout template WebMCP tools', async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onReset = vi.fn().mockResolvedValue(undefined);

    let webmcpContext: any;
    const Inspector = () => {
      webmcpContext = useWebMCP();
      return null;
    };

    render(
      <WebMCPProvider>
        <Inspector />
        <TestLayoutTemplateComponent onSaveMock={onSave} onResetMock={onReset} />
      </WebMCPProvider>
    );

    await waitFor(() => {
      expect(webmcpContext).toBeDefined();
      const toolNames = webmcpContext.registry.getTools().map((t: any) => t.name);
      expect(toolNames).toContain('layout_template_get_post');
      expect(toolNames).toContain('layout_template_update_html_post');
      expect(toolNames).toContain('layout_template_update_css_post');
      expect(toolNames).toContain('layout_template_save_post');
      expect(toolNames).toContain('layout_template_reset_post');
    });

    // 1. Test get
    const getResult = await webmcpContext.registry.callTool('layout_template_get_post', {});
    expect(getResult.isError).toBeFalsy();
    expect(getResult.toolResult.id).toBe('post');
    expect(getResult.toolResult.template_html).toBe('<article><h1>{{ post.title }}</h1></article>');

    // 2. Test update HTML
    const updateHtmlResult = await webmcpContext.registry.callTool('layout_template_update_html_post', {
      template_html: '<main><h2>{{ post.title }}</h2></main>',
    });
    expect(updateHtmlResult.isError).toBeFalsy();
    expect(updateHtmlResult.toolResult.success).toBe(true);

    // 3. Test update CSS
    const updateCssResult = await webmcpContext.registry.callTool('layout_template_update_css_post', {
      template_css: '.posts-list { gap: 2rem; }',
    });
    expect(updateCssResult.isError).toBeFalsy();
    expect(updateCssResult.toolResult.success).toBe(true);

    // 4. Test save
    const saveResult = await webmcpContext.registry.callTool('layout_template_save_post', {});
    expect(saveResult.isError).toBeFalsy();
    expect(onSave).toHaveBeenCalled();

    // 5. Test reset
    const resetResult = await webmcpContext.registry.callTool('layout_template_reset_post', {});
    expect(resetResult.isError).toBeFalsy();
    expect(onReset).toHaveBeenCalled();
  });
});
