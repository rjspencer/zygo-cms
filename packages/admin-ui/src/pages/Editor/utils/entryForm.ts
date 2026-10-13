import type { SectionInstance } from '../../../types/sectionTemplate';
import type { EntryFormValues, EntryStatus, EntryType } from '../types';
import { slugify } from './slugify';

export const EMPTY_FORM_VALUES: EntryFormValues = {
  title: '',
  slug: '',
  status: 'draft',
  content: '',
  tags: '',
  description: '',
  category: '',
  coverImage: '',
  canonicalUrl: '',
  schemaJson: '',
  sections: [],
  parentId: '',
  sortOrder: 0,
};

/** Maps the `/api/admin/editor/:id` entry record to form values. */
export const toFormValues = (entry: Record<string, any>): EntryFormValues => {
  let sections: SectionInstance[] = [];
  if (entry.body_json) {
    try {
      const parsed = JSON.parse(entry.body_json);
      if (Array.isArray(parsed)) sections = parsed;
    } catch (e) {
      console.error('Failed to parse body_json', e);
    }
  }
  return {
    title: entry.title || '',
    slug: entry.slug || '',
    status: entry.status || 'draft',
    content: entry.body_html || '',
    tags: entry.tags || '',
    description: entry.description || '',
    category: entry.category || '',
    coverImage: entry.cover_image || '',
    canonicalUrl: entry.canonical_url || '',
    schemaJson: entry.schema_json || '',
    sections,
    parentId: entry.parent_id ? String(entry.parent_id) : '',
    sortOrder: entry.sort_order || 0,
  };
};

/** Builds the request body for POST/PUT `/api/entries`. Applies the 'Untitled' / slug fallbacks. */
export const buildEntryPayload = (
  values: EntryFormValues,
  entryType: EntryType,
  status: EntryStatus,
  draftOnly = false
): Record<string, unknown> => {
  const title = values.title.trim() || 'Untitled';
  const slug = values.slug.trim() || slugify(title) || 'untitled';
  const payload: Record<string, unknown> = {
    title,
    slug,
    type: entryType,
    status,
    description: values.description,
    category: values.category,
    cover_image: values.coverImage,
    canonical_url: values.canonicalUrl,
    schema_json: values.schemaJson,
    body_html: entryType === 'page' ? '' : values.content,
    body_json: entryType === 'page' ? JSON.stringify(values.sections) : '{}',
    tags: values.tags,
    parent_id: values.parentId ? Number(values.parentId) : null,
    sort_order: values.sortOrder,
  };
  if (draftOnly) payload.draft_only = true;
  return payload;
};
