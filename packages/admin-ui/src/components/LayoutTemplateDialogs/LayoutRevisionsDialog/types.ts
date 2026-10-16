import type { LayoutTemplateRevision } from '../../../types/layoutTemplate';

export interface LayoutRevisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: LayoutTemplateRevision[];
  isLoading: boolean;
  onRestore: (revId: string) => void;
  isSaving: boolean;
}
