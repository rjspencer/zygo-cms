import type { SectionTemplateField } from '../../types/sectionTemplate';

export type { SectionTemplateField };

export interface ListFieldProps {
  field: SectionTemplateField;
  items: Record<string, any>[];
  onChange: (items: Record<string, any>[]) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
}

export interface ListFieldItemCardProps {
  item: Record<string, any>;
  index: number;
  totalItems: number;
  field: SectionTemplateField;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (index: number) => void;
  onChange: (index: number, updatedData: Record<string, any>) => void;
  onOpenMediaPicker?: (callback: (url: string, alt?: string) => void) => void;
}
