import React from 'react';
import { apiFetch } from '../../utils/api';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { SectionTemplateField } from '../../types/sectionTemplate';
import { generateDummyDataFromSchema } from '../../utils/dummyData';

export interface SyntaxValidationResult {
  valid: boolean;
  errors: string[];
}

const ALLOWED_FIELD_TYPES = new Set([
  'text',
  'textarea',
  'richtext',
  'rich-text',
  'url',
  'boolean',
  'image',
  'select',
  'list',
]);

const BUILTIN_IDENTIFIERS = new Set([
  'loop',
  'true',
  'false',
  'none',
  'null',
  'undefined',
  'this',
  'self',
  'super',
  'range',
  'dict',
  'lipsum',
  'cycler',
  'joiner',
  'namespace',
]);

const BUILTIN_OPERATORS_AND_KEYWORDS = new Set([
  'and',
  'or',
  'not',
  'in',
  'is',
  'if',
  'else',
  'elif',
  'autoescape',
  'endautoescape',
  'raw',
  'endraw',
]);

/**
 * Pure helper validating MiniJinja syntax and schema structure:
 * - Valid JSON array in schemaJson, valid field types, required names, options on select, fields on list (no nested lists).
 * - Balanced MiniJinja delimiters ({{ ... }} and {% ... %}) and matching block tags (if/endif, for/endfor),
 *   plus checking top-level variable references against schema field names (allowing built-ins like loop).
 */
export function validateMiniJinjaSyntaxAndSchema(
  templateHtml: string,
  schemaJson: string
): SyntaxValidationResult {
  const errors: string[] = [];

  // 1. Schema Validation
  let parsedSchema: any = null;
  const knownFieldNames = new Set<string>();

  if (!schemaJson || !schemaJson.trim()) {
    errors.push('Schema JSON cannot be empty');
  } else {
    try {
      parsedSchema = JSON.parse(schemaJson);
      if (!Array.isArray(parsedSchema)) {
        errors.push('Schema must be a JSON array of fields');
      } else {
        for (const field of parsedSchema) {
          if (!field || typeof field !== 'object') {
            errors.push('Schema field must be an object');
            continue;
          }
          if (!field.name || typeof field.name !== 'string' || !field.name.trim()) {
            errors.push('Field missing required "name" property');
          } else {
            knownFieldNames.add(field.name.trim());
          }

          if (!field.type || typeof field.type !== 'string' || !ALLOWED_FIELD_TYPES.has(field.type)) {
            errors.push(
              `Invalid field type "${field.type}" for field "${field.name || 'unnamed'}". Allowed types: text, textarea, richtext, url, boolean, image, select, list`
            );
          }

          if (field.type === 'select') {
            if (!Array.isArray(field.options) || field.options.length === 0) {
              errors.push(`Field "${field.name || 'unnamed'}" of type "select" requires non-empty "options" array`);
            }
          }

          if (field.type === 'list') {
            if (!Array.isArray(field.fields)) {
              errors.push(`Field "${field.name || 'unnamed'}" of type "list" requires a "fields" array`);
            } else {
              for (const sub of field.fields) {
                if (!sub || typeof sub !== 'object') {
                  errors.push(`Sub-field of list "${field.name}" must be an object`);
                  continue;
                }
                if (!sub.name || typeof sub.name !== 'string' || !sub.name.trim()) {
                  errors.push(`Sub-field of list "${field.name}" missing required "name" property`);
                }
                if (sub.type === 'list') {
                  errors.push(`Nested lists are not allowed (field "${field.name}" -> "${sub.name || 'unnamed'}")`);
                } else if (!sub.type || typeof sub.type !== 'string' || !ALLOWED_FIELD_TYPES.has(sub.type)) {
                  errors.push(
                    `Invalid field type "${sub.type}" for sub-field "${sub.name || 'unnamed'}" in list "${field.name}"`
                  );
                }
                if (sub.type === 'select' && (!Array.isArray(sub.options) || sub.options.length === 0)) {
                  errors.push(
                    `Sub-field "${sub.name || 'unnamed'}" of type "select" in list "${field.name}" requires non-empty "options" array`
                  );
                }
              }
            }
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`Invalid schema JSON syntax: ${msg}`);
    }
  }

  // 2. MiniJinja Delimiter & Tag Scanning
  const blockStack: { tag: string; varNames?: string[] }[] = [];
  const reportedUnknownVars = new Set<string>();

  const isVariableDeclared = (name: string): boolean => {
    if (BUILTIN_IDENTIFIERS.has(name)) return true;
    if (knownFieldNames.has(name)) return true;
    for (const b of blockStack) {
      if (b.varNames && b.varNames.includes(name)) {
        return true;
      }
    }
    return false;
  };

  const checkExpressionIdentifiers = (expr: string) => {
    if (!Array.isArray(parsedSchema)) return;

    // Remove string literals
    let sanitized = expr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, ' ');
    // Remove filters (e.g. | default(...) or | length)
    sanitized = sanitized.replace(/\|\s*[a-zA-Z_][a-zA-Z0-9_]*/g, ' ');
    // Remove property accesses (.property)
    sanitized = sanitized.replace(/\.\s*[a-zA-Z_][a-zA-Z0-9_]*/g, ' ');

    const tokenRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g;
    let match: RegExpExecArray | null;
    while ((match = tokenRegex.exec(sanitized)) !== null) {
      const token = match[1];
      if (BUILTIN_OPERATORS_AND_KEYWORDS.has(token)) continue;
      if (!isVariableDeclared(token)) {
        if (!reportedUnknownVars.has(token)) {
          reportedUnknownVars.add(token);
          errors.push(`Unknown variable "${token}" referenced in template (not defined in schema)`);
        }
      }
    }
  };

  const processBlockTag = (tagContent: string) => {
    const trimmed = tagContent.trim();
    if (!trimmed) return;

    // For statement: {% for <vars> in <iter> %}
    const forMatch = trimmed.match(/^for\s+([a-zA-Z0-9_,\s]+)\s+in\s+([\s\S]+)$/);
    if (forMatch) {
      const loopVarsStr = forMatch[1];
      const iterExpr = forMatch[2];
      checkExpressionIdentifiers(iterExpr);
      const loopVars = loopVarsStr
        .split(',')
        .map((v) => v.trim())
        .filter((v) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(v));
      blockStack.push({ tag: 'for', varNames: loopVars });
      return;
    }

    if (/^endfor\b/.test(trimmed)) {
      const top = blockStack[blockStack.length - 1];
      if (top?.tag === 'for') {
        blockStack.pop();
      } else {
        errors.push(
          top
            ? `Mismatched closing tag "{% endfor %}" (expected "{% end${top.tag} %}")`
            : 'Unexpected closing tag "{% endfor %}" (no matching "{% for %}")'
        );
      }
      return;
    }

    // If statement: {% if <cond> %}
    const ifMatch = trimmed.match(/^if\s+([\s\S]+)$/);
    if (ifMatch) {
      checkExpressionIdentifiers(ifMatch[1]);
      blockStack.push({ tag: 'if' });
      return;
    }

    if (/^elif\b/.test(trimmed)) {
      const top = blockStack[blockStack.length - 1];
      if (top?.tag !== 'if') {
        errors.push('Unexpected "{% elif %}" outside of "{% if %}" block');
      }
      const elifMatch = trimmed.match(/^elif\s+([\s\S]+)$/);
      if (elifMatch) {
        checkExpressionIdentifiers(elifMatch[1]);
      }
      return;
    }

    if (/^else\b/.test(trimmed)) {
      const top = blockStack[blockStack.length - 1];
      if (top?.tag !== 'if' && top?.tag !== 'for') {
        errors.push('Unexpected "{% else %}" outside of "{% if %}" or "{% for %}" block');
      }
      return;
    }

    if (/^endif\b/.test(trimmed)) {
      const top = blockStack[blockStack.length - 1];
      if (top?.tag === 'if') {
        blockStack.pop();
      } else {
        errors.push(
          top
            ? `Mismatched closing tag "{% endif %}" (expected "{% end${top.tag} %}")`
            : 'Unexpected closing tag "{% endif %}" (no matching "{% if %}")'
        );
      }
      return;
    }

    // Macro: {% macro name(...) %}
    const macroMatch = trimmed.match(/^macro\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([^)]*)\)/);
    if (macroMatch) {
      const macroParams = macroMatch[2]
        .split(',')
        .map((p) => p.trim().split('=')[0].trim())
        .filter((p) => /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(p));
      blockStack.push({ tag: 'macro', varNames: macroParams });
      return;
    }

    if (/^endmacro\b/.test(trimmed)) {
      const top = blockStack[blockStack.length - 1];
      if (top?.tag === 'macro') {
        blockStack.pop();
      } else {
        errors.push('Unexpected closing tag "{% endmacro %}"');
      }
      return;
    }

    // Set statement: {% set var = expr %}
    const setMatch = trimmed.match(/^set\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/);
    if (setMatch) {
      checkExpressionIdentifiers(setMatch[2]);
      if (blockStack.length > 0) {
        const top = blockStack[blockStack.length - 1];
        top.varNames = [...(top.varNames || []), setMatch[1]];
      } else {
        knownFieldNames.add(setMatch[1]);
      }
      return;
    }

    // Generic paired blocks: filter, call, block, raw, with
    const pairedBlockMatch = trimmed.match(/^(filter|call|block|raw|with)\b/);
    if (pairedBlockMatch) {
      blockStack.push({ tag: pairedBlockMatch[1] });
      return;
    }

    const endPairedMatch = trimmed.match(/^end(filter|call|block|raw|with)\b/);
    if (endPairedMatch) {
      const expectedTag = endPairedMatch[1];
      const top = blockStack[blockStack.length - 1];
      if (top?.tag === expectedTag) {
        blockStack.pop();
      } else {
        errors.push(`Unexpected closing tag "{% end${expectedTag} %}"`);
      }
      return;
    }
  };

  let i = 0;
  const len = templateHtml.length;
  while (i < len) {
    if (templateHtml.startsWith('{#', i)) {
      const closeIdx = templateHtml.indexOf('#}', i + 2);
      if (closeIdx === -1) {
        errors.push('Unclosed comment tag "{#"');
        break;
      }
      i = closeIdx + 2;
    } else if (templateHtml.startsWith('{{', i)) {
      const closeIdx = templateHtml.indexOf('}}', i + 2);
      if (closeIdx === -1) {
        errors.push('Unclosed variable tag "{{"');
        break;
      }
      const inner = templateHtml.slice(i + 2, closeIdx);
      if (inner.includes('{{') || inner.includes('{%')) {
        errors.push('Unclosed variable tag "{{" before next delimiter');
      }
      checkExpressionIdentifiers(inner);
      i = closeIdx + 2;
    } else if (templateHtml.startsWith('{%', i)) {
      const closeIdx = templateHtml.indexOf('%}', i + 2);
      if (closeIdx === -1) {
        errors.push('Unclosed block tag "{%"');
        break;
      }
      const inner = templateHtml.slice(i + 2, closeIdx);
      if (inner.includes('{%') || inner.includes('{{')) {
        errors.push('Unclosed block tag "{%" before next delimiter');
      }
      processBlockTag(inner);
      i = closeIdx + 2;
    } else if (templateHtml.startsWith('}}', i)) {
      errors.push('Unexpected closing delimiter "}}"');
      i += 2;
    } else if (templateHtml.startsWith('%}', i)) {
      errors.push('Unexpected closing delimiter "%}"');
      i += 2;
    } else {
      i++;
    }
  }

  while (blockStack.length > 0) {
    const unclosed = blockStack.pop();
    if (unclosed) {
      errors.push(`Unclosed block "{% ${unclosed.tag} %}" (missing "{% end${unclosed.tag} %}")`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Fallback lightweight MiniJinja renderer for environments where Wasm or Workers
 * are unavailable (e.g. Node.js unit tests or headless fallbacks).
 */
export function renderFallbackMiniJinja(templateHtml: string, dummyDataJson: string): string {
  try {
    const data = JSON.parse(dummyDataJson || '{}');
    let output = templateHtml;

    // Handle simple {% if var %} ... {% endif %}
    output = output.replace(
      /\{%\s*if\s+([a-zA-Z0-9_]+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g,
      (_match, varName, body) => {
        return data[varName] ? body : '';
      }
    );

    // Handle simple {% for item in list %} ... {% endfor %}
    output = output.replace(
      /\{%\s*for\s+([a-zA-Z0-9_]+)\s+in\s+([a-zA-Z0-9_]+)\s*%\}([\s\S]*?)\{%\s*endfor\s*%\}/g,
      (_match, itemVar, listVar, body) => {
        const list = data[listVar];
        if (!Array.isArray(list)) return '';
        return list
          .map((item, index) => {
            let itemBody = body;
            itemBody = itemBody.replace(/\{\{\s*loop\.index\s*\}\}/g, String(index + 1));
            itemBody = itemBody.replace(/\{\{\s*loop\.index0\s*\}\}/g, String(index));
            if (typeof item === 'object' && item !== null) {
              for (const [k, v] of Object.entries(item)) {
                const regex = new RegExp(`\\{\\{\\s*${itemVar}\\.${k}(?:\\s*\\|\\s*[^}]+)?\\s*\\}\\}`, 'g');
                itemBody = itemBody.replace(regex, String(v ?? ''));
              }
            } else {
              const regex = new RegExp(`\\{\\{\\s*${itemVar}(?:\\s*\\|\\s*[^}]+)?\\s*\\}\\}`, 'g');
              itemBody = itemBody.replace(regex, String(item ?? ''));
            }
            return itemBody;
          })
          .join('');
      }
    );

    // Handle {{ var }} and {{ var | filter }}
    output = output.replace(
      /\{\{\s*([a-zA-Z0-9_]+)(?:\s*\|\s*[^}]+)?\s*\}\}/g,
      (_match, varName) => {
        const val = data[varName];
        if (val !== undefined && val !== null) {
          return String(val);
        }
        return '';
      }
    );

    return output;
  } catch {
    return templateHtml;
  }
}

/**
 * Creates the global WebMCP tools for section templates:
 * - list_section_templates
 * - get_section_template
 * - delete_section_template
 */
export function createGlobalTemplateTools(): WebMCPToolDefinition[] {
  return [
    {
      name: 'list_section_templates',
      description: 'List all section templates with their locked status and metadata',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: async (): Promise<WebMCPToolResult> => {
        try {
          let res = await apiFetch('/api/content-types');
          if (!res.ok) {
            // Fallback to /api/section-templates
            res = await apiFetch('/api/section-templates');
          }
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || errData.message || `Failed to fetch templates (${res.status})`;
            return {
              isError: true,
              content: [{ type: 'text', text: msg }],
            };
          }
          const templates = await res.json();
          return {
            toolResult: templates,
            content: [{ type: 'text', text: JSON.stringify(templates, null, 2) }],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error listing section templates: ${msg}` }],
          };
        }
      },
    },
    {
      name: 'get_section_template',
      description: 'Get details of a section template by identifier (id/slug)',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The template identifier/slug',
          },
        },
        required: ['id'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const id = args?.id;
        if (!id || typeof id !== 'string') {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Template "id" argument is required and must be a string.' }],
          };
        }
        try {
          let res = await apiFetch(`/api/content-types/${encodeURIComponent(id)}`);
          if (!res.ok && res.status === 404) {
            res = await apiFetch(`/api/section-templates/${encodeURIComponent(id)}`);
          }
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || errData.message || `Template "${id}" not found (${res.status})`;
            return {
              isError: true,
              content: [{ type: 'text', text: msg }],
            };
          }
          const data = await res.json();
          const template = {
            id: data.id,
            name: data.name,
            description: data.description ?? null,
            template_html: data.template_html ?? '',
            template_css: data.template_css ?? '',
            schema_json: data.schema_json ?? '[]',
            is_locked: Boolean(data.is_locked),
            created_at: data.created_at,
            updated_at: data.updated_at,
          };
          return {
            toolResult: template,
            content: [{ type: 'text', text: JSON.stringify(template, null, 2) }],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error fetching template "${id}": ${msg}` }],
          };
        }
      },
    },
    {
      name: 'delete_section_template',
      description: 'Delete a section template by identifier, with optional dry_run mode',
      inputSchema: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'The template identifier/slug to delete',
          },
          dry_run: {
            type: 'boolean',
            description: 'If true, simulates deletion without making any changes',
          },
        },
        required: ['id'],
      },
      handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
        const id = args?.id;
        if (!id || typeof id !== 'string') {
          return {
            isError: true,
            content: [{ type: 'text', text: 'Template "id" argument is required and must be a string.' }],
          };
        }

        if (args?.dry_run) {
          const preview = {
            dry_run: true,
            id,
            action: 'delete',
            message: `[Dry Run] Template "${id}" would be deleted.`,
          };
          return {
            toolResult: preview,
            content: [{ type: 'text', text: preview.message }],
          };
        }

        try {
          const res = await apiFetch(`/api/content-types/${encodeURIComponent(id)}`, {
            method: 'DELETE',
          });

          if (res.status === 409) {
            const errData = await res.json().catch(() => ({}));
            const msg =
              errData.error ||
              errData.message ||
              `Conflict: Template "${id}" is currently in use or locked and cannot be deleted.`;
            return {
              isError: true,
              toolResult: { error: msg, status: 409, id },
              content: [{ type: 'text', text: `Conflict deleting template "${id}": ${msg}` }],
            };
          }

          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData.error || errData.message || `Failed to delete template "${id}" (${res.status})`;
            return {
              isError: true,
              toolResult: { error: msg, status: res.status, id },
              content: [{ type: 'text', text: `Error deleting template "${id}": ${msg}` }],
            };
          }

          const resultData = await res.json().catch(() => ({ success: true, id }));
          return {
            toolResult: resultData,
            content: [{ type: 'text', text: `Template "${id}" deleted successfully.` }],
          };
        } catch (err: unknown) {
          const msg = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [{ type: 'text', text: `Error deleting template "${id}": ${msg}` }],
          };
        }
      },
    },
  ];
}

export interface UseTemplateEditorWebMCPOptions {
  formId: string;
  formName: string;
  formDescription: string;
  formTemplateHtml: string;
  formTemplateCss: string;
  formSchemaJson: string;
  isLocked: boolean;
  previewHtml: string;
  setFormTemplateHtml: (html: string) => void;
  setFormTemplateCss: (css: string) => void;
  setFormSchemaJson: (schemaJson: string) => void;
  setFields: (fields: SectionTemplateField[]) => void;
  renderPreview?: (html?: string, dummyDataJson?: string) => Promise<string> | string;
}

/**
 * Registers active template editor tools in the WebMCP Registry:
 * - template_get_active
 * - template_update_markup
 * - template_update_styles
 * - template_update_schema
 * - template_validate_syntax
 * - template_render_preview
 */
export function useTemplateEditorWebMCP(options: UseTemplateEditorWebMCPOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const tools: WebMCPToolDefinition[] = React.useMemo(() => {
    return [
      {
        name: 'template_get_active',
        description: 'Get the active template buffer from the editor (metadata, markup, CSS, schema, and preview)',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: (): WebMCPToolResult => {
          const opt = optionsRef.current;
          const active = {
            id: opt.formId,
            name: opt.formName,
            description: opt.formDescription,
            template_html: opt.formTemplateHtml,
            template_css: opt.formTemplateCss,
            schema_json: opt.formSchemaJson,
            is_locked: opt.isLocked,
            preview_html: opt.previewHtml,
          };
          return {
            toolResult: active,
            content: [{ type: 'text', text: JSON.stringify(active, null, 2) }],
          };
        },
      },
      {
        name: 'template_update_markup',
        description: 'Update the HTML template markup (MiniJinja) in the active template editor',
        inputSchema: {
          type: 'object',
          properties: {
            template_html: {
              type: 'string',
              description: 'The new MiniJinja HTML markup string',
            },
          },
          required: ['template_html'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          if (typeof args.template_html !== 'string') {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Argument "template_html" must be a string.' }],
            };
          }
          optionsRef.current.setFormTemplateHtml(args.template_html);
          return {
            toolResult: { success: true, template_html: args.template_html },
            content: [{ type: 'text', text: 'Active template HTML updated successfully.' }],
          };
        },
      },
      {
        name: 'template_update_styles',
        description: 'Update the CSS stylesheet in the active template editor',
        inputSchema: {
          type: 'object',
          properties: {
            template_css: {
              type: 'string',
              description: 'The new CSS stylesheet string',
            },
          },
          required: ['template_css'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          if (typeof args.template_css !== 'string') {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Argument "template_css" must be a string.' }],
            };
          }
          optionsRef.current.setFormTemplateCss(args.template_css);
          return {
            toolResult: { success: true, template_css: args.template_css },
            content: [{ type: 'text', text: 'Active template CSS updated successfully.' }],
          };
        },
      },
      {
        name: 'template_update_schema',
        description: 'Validate and update the JSON schema definition in the active template editor',
        inputSchema: {
          type: 'object',
          properties: {
            schema_json: {
              type: 'string',
              description: 'The new schema JSON string (array of field definitions)',
            },
          },
          required: ['schema_json'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          if (typeof args.schema_json !== 'string') {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Argument "schema_json" must be a string.' }],
            };
          }
          let parsed: any;
          try {
            parsed = JSON.parse(args.schema_json);
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              isError: true,
              content: [{ type: 'text', text: `Invalid JSON syntax in schema_json: ${msg}` }],
            };
          }
          if (!Array.isArray(parsed)) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Argument "schema_json" must be a JSON array of fields.' }],
            };
          }
          const validation = validateMiniJinjaSyntaxAndSchema('', args.schema_json);
          const schemaErrors = validation.errors.filter(
            (e) => !e.includes('Unclosed') && !e.includes('variable')
          );
          if (schemaErrors.length > 0) {
            return {
              isError: true,
              toolResult: { valid: false, errors: schemaErrors },
              content: [{ type: 'text', text: `Schema validation failed:\n- ${schemaErrors.join('\n- ')}` }],
            };
          }
          optionsRef.current.setFormSchemaJson(args.schema_json);
          optionsRef.current.setFields(parsed as SectionTemplateField[]);
          return {
            toolResult: { success: true, fields: parsed },
            content: [{ type: 'text', text: 'Active template schema and fields updated successfully.' }],
          };
        },
      },
      {
        name: 'template_validate_syntax',
        description: 'Validate MiniJinja template markup and JSON schema against balanced delimiters and field definitions',
        inputSchema: {
          type: 'object',
          properties: {
            template_html: {
              type: 'string',
              description: 'Optional template HTML to validate (defaults to active buffer)',
            },
            schema_json: {
              type: 'string',
              description: 'Optional schema JSON to validate (defaults to active buffer)',
            },
          },
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          const opt = optionsRef.current;
          const html = typeof args?.template_html === 'string' ? args.template_html : opt.formTemplateHtml;
          const schema = typeof args?.schema_json === 'string' ? args.schema_json : opt.formSchemaJson;
          const result = validateMiniJinjaSyntaxAndSchema(html, schema);
          return {
            isError: !result.valid,
            toolResult: result,
            content: [
              {
                type: 'text',
                text: result.valid
                  ? 'Syntax and schema validation passed with zero errors.'
                  : `Validation failed with ${result.errors.length} error(s):\n- ${result.errors.join('\n- ')}`,
              },
            ],
          };
        },
      },
      {
        name: 'template_render_preview',
        description: 'Render the template using the active Wasm renderer or fallback MiniJinja engine',
        inputSchema: {
          type: 'object',
          properties: {
            dummy_data_json: {
              type: 'string',
              description: 'Optional dummy data JSON string to pass into template rendering',
            },
            template_html: {
              type: 'string',
              description: 'Optional template HTML to render (defaults to active buffer)',
            },
          },
        },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          const html = typeof args?.template_html === 'string' ? args.template_html : opt.formTemplateHtml;
          const dummyData =
            typeof args?.dummy_data_json === 'string'
              ? args.dummy_data_json
              : generateDummyDataFromSchema(opt.formSchemaJson);

          let renderedHtml = '';
          if (opt.renderPreview) {
            try {
              renderedHtml = await opt.renderPreview(html, dummyData);
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                isError: true,
                content: [{ type: 'text', text: `Render error: ${msg}` }],
              };
            }
          } else {
            try {
              const wasm = await import('template-wasm');
              if (typeof wasm.render_template === 'function') {
                renderedHtml = wasm.render_template(html, dummyData);
              } else {
                renderedHtml = renderFallbackMiniJinja(html, dummyData);
              }
            } catch {
              renderedHtml = renderFallbackMiniJinja(html, dummyData);
            }
          }

          return {
            toolResult: { rendered_html: renderedHtml },
            content: [{ type: 'text', text: renderedHtml }],
          };
        },
      },
    ];
  }, []);

  useRegisterWebMCPTools(tools, []);
}
