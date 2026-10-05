export interface SectionTemplateField {
  name: string;
  type: string; // 'text' | 'textarea' | 'richtext' | 'url' | 'boolean' | 'image' | 'select' | 'list'
  label: string;
  required?: boolean;
  options?: string[];
  fields?: SectionTemplateField[];
}

export interface SectionTemplate {
  id: string;
  name: string;
  description?: string | null;
  schema_json: string;
  template_html?: string | null;
  template_css?: string | null;
  css_classes_json?: string;
  is_locked?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface SectionInstance {
  type_id: string;
  data: Record<string, any>;
}
