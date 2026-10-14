import React from 'react';
import type { Blocker } from 'react-router-dom';
import { ConflictDialog } from '../ConflictDialog/ConflictDialog';
import { WarningDialog } from '../WarningDialog/WarningDialog';
import { DiscardDraftDialog } from '../DiscardDraftDialog/DiscardDraftDialog';
import { UnsavedChangesDialog } from '../../../../components/UnsavedChangesDialog';

export interface TemplateEditorDialogsProps {
  conflictModalOpen: boolean;
  setConflictModalOpen: (open: boolean) => void;
  conflictMessage: string;
  isSaving: boolean;
  onForceSave: () => void;
  warningModalOpen: boolean;
  setWarningModalOpen: (open: boolean) => void;
  warningList: string[];
  onSaveAnyway: () => void;
  isDiscardModalOpen: boolean;
  setIsDiscardModalOpen: (open: boolean) => void;
  onConfirmDiscard: () => void;
  blocker: Blocker;
}

export const TemplateEditorDialogs: React.FC<TemplateEditorDialogsProps> = ({
  conflictModalOpen,
  setConflictModalOpen,
  conflictMessage,
  isSaving,
  onForceSave,
  warningModalOpen,
  setWarningModalOpen,
  warningList,
  onSaveAnyway,
  isDiscardModalOpen,
  setIsDiscardModalOpen,
  onConfirmDiscard,
  blocker,
}) => {
  return (
    <>
      <ConflictDialog
        open={conflictModalOpen}
        onOpenChange={setConflictModalOpen}
        message={conflictMessage}
        isSaving={isSaving}
        onForceSave={onForceSave}
      />

      <WarningDialog
        open={warningModalOpen}
        onOpenChange={setWarningModalOpen}
        warnings={warningList}
        isSaving={isSaving}
        onSaveAnyway={onSaveAnyway}
      />

      <DiscardDraftDialog
        open={isDiscardModalOpen}
        onOpenChange={setIsDiscardModalOpen}
        onCancel={() => setIsDiscardModalOpen(false)}
        onConfirmDiscard={onConfirmDiscard}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
};
