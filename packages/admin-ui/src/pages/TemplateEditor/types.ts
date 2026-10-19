import type { SectionTemplateField } from '../../types/sectionTemplate';

export interface TemplateEditorProps {
  id?: string;
}

export interface TemplateEditorHeaderProps {
  isNew: boolean;
  formId: string;
  formName: string;
  isAdmin: boolean;
  isDesigner: boolean;
  isLocked: boolean;
  onLockedChange: (locked: boolean) => void;
  hasDraft: boolean;
  onDiscardClick: () => void;
  isSaving: boolean;
  onSave: () => void;
}

export interface TemplateMetadataCardProps {
  formId: string;
  onFormIdChange: (val: string) => void;
  formName: string;
  onFormNameChange: (val: string) => void;
  formDescription: string;
  onFormDescriptionChange: (val: string) => void;
  isNew: boolean;
  isLockedForDesigner: boolean;
}

export interface TemplateCodeTabsProps {
  activeTab: string;
  onActiveTabChange: (tab: string) => void;
  fields: SectionTemplateField[];
  onFieldsChange: (fields: SectionTemplateField[]) => void;
  formTemplateHtml: string;
  onHtmlChange: (val: string) => void;
  formTemplateCss: string;
  onCssChange: (val: string) => void;
  isLockedForDesigner: boolean;
}

export interface TemplatePreviewPaneProps {
  formId: string;
  previewHtml: string;
  formTemplateCss: string;
  debouncedWasmHtml: string;
  formTemplateHtml: string;
  isStatusCompiling: boolean;
  renderCount: number;
  themeCss?: string;
  fontUrl?: string;
}

export interface ConflictDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: string;
  isSaving: boolean;
  onForceSave: () => void;
}

export interface WarningDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  warnings: string[];
  isSaving: boolean;
  onSaveAnyway: () => void;
}

export interface DiscardDraftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCancel: () => void;
  onConfirmDiscard: () => void;
}
