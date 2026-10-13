import { describe, it, expect } from 'vitest';
import { slugify } from './slugify';
import { buildEntryPayload, EMPTY_FORM_VALUES, toFormValues } from './entryForm';

describe('slugify', () => {
  it('lowercases, hyphenates and trims separators', () => {
    expect(slugify('  My Awesome New Article! ')).toBe('my-awesome-new-article');
  });
});

describe('toFormValues', () => {
  it('maps API fields and parses body_json sections', () => {
    const values = toFormValues({
      title: 'T',
      body_html: '<p>x</p>',
      parent_id: 4,
      body_json: JSON.stringify([{ type_id: 'hero', data: {} }]),
    });
    expect(values).toMatchObject({ title: 'T', content: '<p>x</p>', parentId: '4', sortOrder: 0, status: 'draft' });
    expect(values.sections).toEqual([{ type_id: 'hero', data: {} }]);
  });

  it('falls back to no sections on invalid body_json', () => {
    expect(toFormValues({ body_json: '{oops' }).sections).toEqual([]);
  });
});

describe('buildEntryPayload', () => {
  it('uses Untitled and derives slug fallback', () => {
    const payload = buildEntryPayload(EMPTY_FORM_VALUES, 'post', 'draft');
    expect(payload).toMatchObject({ title: 'Untitled', slug: 'untitled', body_json: '{}', parent_id: null });
  });

  it('stores sections in body_json and clears body_html for pages', () => {
    const sections = [{ type_id: 'hero', data: {} }];
    const payload = buildEntryPayload({ ...EMPTY_FORM_VALUES, content: 'x', sections, parentId: '2' }, 'page', 'published', true);
    expect(payload).toMatchObject({ body_html: '', body_json: JSON.stringify(sections), parent_id: 2, draft_only: true });
  });
});
