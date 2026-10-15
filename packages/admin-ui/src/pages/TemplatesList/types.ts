export interface TemplateItem {
  id: string;
  name: string;
  description: string | null;
  schema_json: string;
  template_html?: string | null;
  template_css?: string | null;
  css_classes_json?: string;
  is_locked?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface UseTemplatesFiltersReturn {
  search: string;
  setSearch: (value: string) => void;
}

export interface UseTemplatesDataReturn {
  templates: TemplateItem[];
  role: string;
  isAdmin: boolean;
  isDesigner: boolean;
  isLoading: boolean;
  fetchError: Error | null;
  actionError: string | null;
  toggleLock: (template: TemplateItem, isLocked: boolean) => void;
  isTogglingLock: boolean;
  deleteTemplate: (id: string) => void;
  isDeleting: boolean;
}
