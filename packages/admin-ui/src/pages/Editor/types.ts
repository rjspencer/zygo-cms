import type { SectionInstance } from '../../types/sectionTemplate';

export type EntryType = 'page' | 'post' | 'doc';
export type EntryStatus = 'draft' | 'in_review' | 'ready_for_publish' | 'published' | 'archived' | 'scheduled';

/** The react-hook-form value shape for the entry editor. `entryType` is derived from the URL and is not a form field. */
export interface EntryFormValues {
  title: string;
  slug: string;
  status: EntryStatus;
  content: string;
  tags: string;
  description: string;
  category: string;
  coverImage: string;
  canonicalUrl: string;
  schemaJson: string;
  sections: SectionInstance[];
  parentId: string;
  sortOrder: number;
}

export type MediaPickerCallback = (url: string, altText?: string) => void;
export type OpenMediaPicker = (callback: MediaPickerCallback) => void;
