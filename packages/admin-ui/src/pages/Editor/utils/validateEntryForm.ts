import type { FieldErrors, Resolver } from 'react-hook-form';
import type { SectionTemplate } from '../../../types/sectionTemplate';
import { parseTemplateFields } from '../components/ContentTab/components/SectionList/components/SectionCard/parseTemplateFields';
import type { EntryFormValues, EntryType } from '../types';
import { slugify } from './slugify';

export const RESERVED_SLUGS = [
  'admin',
  'api',
  'media',
  'post',
  'posts',
  'entries',
  'public',
  'style.css',
  'editor.css',
  'editor.js',
  'tag',
  'tags',
  'category',
  'categories',
] as const;

export interface ValidationContext {
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  currentEntryId?: string;
  existingEntries?: Array<{ id?: number | string; slug?: string }>;
}

export interface ValidationResult {
  valid: boolean;
  fieldErrors: Partial<Record<keyof EntryFormValues, string>>;
  sectionFieldErrors: Record<number, Record<string, string>>;
}

export function validateEntryValues(values: EntryFormValues, ctx: ValidationContext): ValidationResult {
  const fieldErrors: Partial<Record<keyof EntryFormValues, string>> = {};
  const sectionFieldErrors: Record<number, Record<string, string>> = {};

  // 1. Slug validation
  const rawSlug = (values.slug ?? '').trim();
  const effectiveSlug = rawSlug || slugify((values.title ?? '').trim()) || 'untitled';

  if ((RESERVED_SLUGS as readonly string[]).includes(effectiveSlug.toLowerCase())) {
    fieldErrors.slug = `Slug '${effectiveSlug}' is reserved by the system`;
  } else if (rawSlug !== '' && !/^[a-zA-Z0-9-]+$/.test(rawSlug)) {
    fieldErrors.slug = 'Slug must contain only alphanumeric characters and hyphens';
  } else if (
    ctx.existingEntries?.some(
      (e) =>
        e.slug &&
        e.slug.toLowerCase() === effectiveSlug.toLowerCase() &&
        String(e.id) !== String(ctx.currentEntryId ?? '')
    )
  ) {
    fieldErrors.slug = `An entry with slug '${effectiveSlug}' already exists`;
  }

  // 2. Canonical URL validation
  const rawUrl = (values.canonicalUrl ?? '').trim();
  if (rawUrl !== '') {
    try {
      const u = new URL(rawUrl);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') {
        fieldErrors.canonicalUrl = 'Canonical URL must be a valid HTTP/HTTPS URL';
      }
    } catch {
      fieldErrors.canonicalUrl = 'Canonical URL must be a valid HTTP/HTTPS URL';
    }
  }

  // 3. Schema JSON validation
  const rawSchema = (values.schemaJson ?? '').trim();
  if (rawSchema !== '') {
    try {
      const parsed = JSON.parse(rawSchema);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        fieldErrors.schemaJson = 'Schema JSON must be a valid JSON object';
      }
    } catch {
      fieldErrors.schemaJson = 'Schema JSON must be a valid JSON object';
    }
  }

  // 4. Parent ID validation
  const rawParent = (values.parentId ?? '').trim();
  if (rawParent !== '') {
    if (!/^[1-9]\d*$/.test(rawParent)) {
      fieldErrors.parentId = 'Parent ID must be a positive integer';
    } else if (ctx.currentEntryId && rawParent === String(ctx.currentEntryId)) {
      fieldErrors.parentId = 'Entry cannot be its own parent';
    }
  }

  // 5. Section template required fields validation (when ctx.entryType === 'page')
  if (ctx.entryType === 'page') {
    (values.sections ?? []).forEach((section, index) => {
      const template = ctx.sectionTemplates.find((t) => t.id === section.type_id);
      if (!template) return;
      const fields = parseTemplateFields(template);
      for (const field of fields) {
        if (field.required) {
          const val = section.data?.[field.name];
          let isEmpty = false;
          if (field.type === 'list') {
            isEmpty = !Array.isArray(val) || val.length === 0;
          } else if (field.type === 'boolean') {
            isEmpty = val !== true;
          } else if (field.type === 'richtext') {
            isEmpty = String(val ?? '').replace(/<[^>]*>/g, '').trim() === '';
          } else {
            isEmpty = String(val ?? '').trim() === '';
          }

          if (isEmpty) {
            if (!sectionFieldErrors[index]) {
              sectionFieldErrors[index] = {};
            }
            sectionFieldErrors[index][field.name] = `${field.label || field.name} is required`;
          }
        }
      }
    });
  }

  const valid = Object.keys(fieldErrors).length === 0 && Object.keys(sectionFieldErrors).length === 0;
  return { valid, fieldErrors, sectionFieldErrors };
}

export function createEntryFormResolver(
  getContext: () => ValidationContext
): Resolver<EntryFormValues> {
  return (values) => {
    const result = validateEntryValues(values, getContext());
    if (result.valid) {
      return { values, errors: {} };
    }

    const errors: FieldErrors<EntryFormValues> = {};
    for (const [key, message] of Object.entries(result.fieldErrors)) {
      (errors as any)[key] = { type: 'validation', message };
    }

    if (Object.keys(result.sectionFieldErrors).length > 0) {
      (errors as any).sections = [];
      for (const [idxStr, fieldMap] of Object.entries(result.sectionFieldErrors)) {
        (errors.sections as any)[Number(idxStr)] = {
          data: Object.fromEntries(
            Object.entries(fieldMap).map(([fName, msg]) => [fName, { type: 'required', message: msg }])
          ),
        };
      }
    }

    return { values: {} as any, errors };
  };
}
