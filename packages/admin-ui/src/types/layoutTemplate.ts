export interface LayoutTemplate {
  id: string;
  name: string;
  description?: string | null;
  template_html: string;
  template_css: string;
  is_locked?: boolean | number;
  created_at?: string;
  updated_at?: string;
}

export interface LayoutTemplateRevision {
  id: string;
  layout_template_id: string;
  template_html: string;
  template_css: string;
  created_at: string;
}

export interface LayoutTemplatePayload {
  name?: string;
  description?: string | null;
  template_html?: string;
  template_css?: string;
  is_locked?: boolean;
}
