import { SectionTemplateField } from '../../types/sectionTemplate';

export interface VisualFieldBuilderProps {
  fields: SectionTemplateField[];
  onChange: (fields: SectionTemplateField[]) => void;
  disabled?: boolean;
}

export interface SelectOptionsEditorProps {
  options?: string[];
  onChange: (options: string[]) => void;
  disabled?: boolean;
}

export interface FieldCardProps {
  field: SectionTemplateField;
  index: number;
  disabled?: boolean;
  fieldId: string;
  onLabelChange: (index: number, newLabel: string) => void;
  onNameChange: (index: number, newName: string) => void;
  onTypeChange: (index: number, newType: string) => void;
  onRequiredChange: (index: number, checked: boolean) => void;
  onRemoveField: (index: number) => void;
  onOptionsChange: (index: number, options: string[]) => void;
  // Subfield handlers
  onAddSubfield: (fieldIndex: number) => void;
  onRemoveSubfield: (fieldIndex: number, subIndex: number) => void;
  onSubfieldLabelChange: (fieldIndex: number, subIndex: number, newLabel: string) => void;
  onSubfieldNameChange: (fieldIndex: number, subIndex: number, newName: string) => void;
  onSubfieldTypeChange: (fieldIndex: number, subIndex: number, newType: string) => void;
  onSubfieldRequiredChange: (fieldIndex: number, subIndex: number, checked: boolean) => void;
  onSubfieldOptionsChange: (fieldIndex: number, subIndex: number, options: string[]) => void;
  getFieldId: (f: SectionTemplateField) => string;
}

export interface SubfieldCardProps {
  fieldIndex: number;
  subIndex: number;
  subfield: SectionTemplateField;
  subId: string;
  disabled?: boolean;
  onSubfieldLabelChange: (fieldIndex: number, subIndex: number, newLabel: string) => void;
  onSubfieldNameChange: (fieldIndex: number, subIndex: number, newName: string) => void;
  onSubfieldTypeChange: (fieldIndex: number, subIndex: number, newType: string) => void;
  onSubfieldRequiredChange: (fieldIndex: number, subIndex: number, checked: boolean) => void;
  onSubfieldOptionsChange: (fieldIndex: number, subIndex: number, options: string[]) => void;
  onRemoveSubfield: (fieldIndex: number, subIndex: number) => void;
}

export interface ListSubfieldsEditorProps {
  fieldIndex: number;
  subfields?: SectionTemplateField[];
  disabled?: boolean;
  onAddSubfield: (fieldIndex: number) => void;
  onRemoveSubfield: (fieldIndex: number, subIndex: number) => void;
  onSubfieldLabelChange: (fieldIndex: number, subIndex: number, newLabel: string) => void;
  onSubfieldNameChange: (fieldIndex: number, subIndex: number, newName: string) => void;
  onSubfieldTypeChange: (fieldIndex: number, subIndex: number, newType: string) => void;
  onSubfieldRequiredChange: (fieldIndex: number, subIndex: number, checked: boolean) => void;
  onSubfieldOptionsChange: (fieldIndex: number, subIndex: number, options: string[]) => void;
  getFieldId: (f: SectionTemplateField) => string;
}
