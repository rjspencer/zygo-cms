import type { SectionTemplateField } from '../../types/sectionTemplate';

export type { SectionTemplateField };

export interface SectionFieldRendererProps {
  fields: SectionTemplateField[];
  data: Record<string, any>;
  onChange: (data: Record<string, any>) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
  isNested?: boolean;
  errors?: Record<string, string>;
}

export interface SectionFieldControlProps {
  field: SectionTemplateField;
  value: any;
  onChange: (value: any) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
  id?: string;
  labelId?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
}
