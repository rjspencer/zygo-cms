import type { SectionTemplateField } from '../../types/sectionTemplate';

export type { SectionTemplateField };

export interface SectionFieldRendererProps {
  fields: SectionTemplateField[];
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
  isNested?: boolean;
}

export interface SectionFieldControlProps {
  field: SectionTemplateField;
  value: any;
  onChange: (value: any) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
}
