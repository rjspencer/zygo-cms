import React from 'react';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { LayoutTemplate, LayoutTemplateRevision } from '../../types/layoutTemplate';

export interface LayoutTemplateToolsOptions {
  templateId: string;
  template: LayoutTemplate | null | undefined;
  html: string;
  setHtml: (val: string) => void;
  css: string;
  setCss: (val: string) => void;
  onSave: () => Promise<void>;
  onReset: () => Promise<void>;
  revisions?: LayoutTemplateRevision[];
  onRestoreRevision?: (revId: string) => Promise<void>;
  isSaving: boolean;
}

export function useLayoutTemplateWebMCP(options: LayoutTemplateToolsOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const tools = React.useMemo<WebMCPToolDefinition[]>(() => {
    return [
      {
        name: `layout_template_get_${options.templateId}`,
        description: `Get the active ${options.templateId} layout template definition, HTML, and CSS styles`,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          return {
            toolResult: {
              id: opt.templateId,
              name: opt.template?.name || '',
              template_html: opt.html,
              template_css: opt.css,
              is_locked: !!opt.template?.is_locked,
              created_at: opt.template?.created_at,
              updated_at: opt.template?.updated_at,
            },
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    id: opt.templateId,
                    name: opt.template?.name,
                    html_length: opt.html.length,
                    css_length: opt.css.length,
                  },
                  null,
                  2
                ),
              },
            ],
          };
        },
      },
      {
        name: `layout_template_update_html_${options.templateId}`,
        description: `Update the draft HTML template for the ${options.templateId} layout`,
        inputSchema: {
          type: 'object',
          properties: {
            template_html: {
              type: 'string',
              description: 'The updated MiniJinja HTML template string',
            },
          },
          required: ['template_html'],
        },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          if (typeof args.template_html !== 'string') {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: template_html must be a string' }],
            };
          }
          opt.setHtml(args.template_html);
          return {
            toolResult: { success: true, length: args.template_html.length },
            content: [
              {
                type: 'text',
                text: `Successfully updated ${opt.templateId} layout HTML buffer (${args.template_html.length} chars).`,
              },
            ],
          };
        },
      },
      {
        name: `layout_template_update_css_${options.templateId}`,
        description: `Update the draft CSS stylesheet for the ${options.templateId} layout`,
        inputSchema: {
          type: 'object',
          properties: {
            template_css: {
              type: 'string',
              description: 'The updated CSS rules string',
            },
          },
          required: ['template_css'],
        },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          if (typeof args.template_css !== 'string') {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Error: template_css must be a string' }],
            };
          }
          opt.setCss(args.template_css);
          return {
            toolResult: { success: true, length: args.template_css.length },
            content: [
              {
                type: 'text',
                text: `Successfully updated ${opt.templateId} layout CSS buffer (${args.template_css.length} chars).`,
              },
            ],
          };
        },
      },
      {
        name: `layout_template_save_${options.templateId}`,
        description: `Save the active ${options.templateId} layout template to Cloudflare D1 and invalidate edge cache`,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          try {
            await opt.onSave();
            return {
              toolResult: { success: true },
              content: [
                {
                  type: 'text',
                  text: `Successfully saved ${opt.templateId} layout template and updated style cache.`,
                },
              ],
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to save template: ${msg}` }],
            };
          }
        },
      },
      {
        name: `layout_template_reset_${options.templateId}`,
        description: `Reset the ${options.templateId} layout template back to system defaults`,
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: async (): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          try {
            await opt.onReset();
            return {
              toolResult: { success: true },
              content: [
                {
                  type: 'text',
                  text: `Successfully reset ${opt.templateId} layout template to system defaults.`,
                },
              ],
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to reset template: ${msg}` }],
            };
          }
        },
      },
    ];
  }, [options.templateId]);

  useRegisterWebMCPTools(tools, [options.templateId]);
}
