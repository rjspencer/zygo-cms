import type { EntryType } from './types';

interface EntryTypeConfig {
  badgeColor: 'crimson' | 'blue' | 'cyan';
  /** Text shown before the slug input and in public URLs, e.g. `post/`. Empty for pages. */
  slugPrefix: string;
  /** Admin route prefix for the editor of this type. */
  editorPath: string;
  /** Whether the body is a list of page sections (true) or a rich-text body (false). */
  usesSections: boolean;
  /** Whether Parent ID / Sort Order fields are shown. */
  hasHierarchy: boolean;
}

export const ENTRY_TYPE_CONFIG: Record<EntryType, EntryTypeConfig> = {
  page: { badgeColor: 'cyan', slugPrefix: '', editorPath: '/pages/editor', usesSections: true, hasHierarchy: true },
  post: { badgeColor: 'crimson', slugPrefix: 'post/', editorPath: '/posts/editor', usesSections: false, hasHierarchy: false },
  doc: { badgeColor: 'blue', slugPrefix: 'docs/', editorPath: '/docs/editor', usesSections: false, hasHierarchy: true },
};

/** Public path for an entry, e.g. `/post/my-slug`, `/docs/my-slug`, `/my-slug`. */
export const getEntryPublicPath = (entryType: EntryType, slug: string): string =>
  `/${ENTRY_TYPE_CONFIG[entryType].slugPrefix}${slug}`;
