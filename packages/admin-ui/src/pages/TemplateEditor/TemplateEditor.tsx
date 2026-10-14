import React from 'react';
import { Box, Flex, Text, Callout } from '@radix-ui/themes';
import {
  LockClosedIcon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';
import { BackButton } from '../../components/BackButton';
import type { TemplateEditorProps } from './types';
import { useTemplateEditorState } from './hooks/useTemplateEditorState';
import { TemplateEditorHeader } from './components/TemplateEditorHeader/TemplateEditorHeader';
import { TemplateMetadataCard } from './components/TemplateMetadataCard/TemplateMetadataCard';
import { TemplateCodeTabs } from './components/TemplateCodeTabs/TemplateCodeTabs';
import { TemplatePreviewPane } from './components/TemplatePreviewPane/TemplatePreviewPane';
import { TemplateEditorDialogs } from './components/TemplateEditorDialogs/TemplateEditorDialogs';

export const TemplateEditor: React.FC<TemplateEditorProps> = ({ id: propId }) => {
  const state = useTemplateEditorState(propId);

  const isLockedForDesigner = state.isDesigner && state.isLocked;
  const lockedTooltipText =
    'This core template is locked. Please reach out to an admin if you need to make a change.';

  if (state.isLoadingTemplate && !state.isNew) {
    return (
      <Box style={{ width: '100%' }}>
        <Text color="gray">Loading template details...</Text>
      </Box>
    );
  }

  if (state.loadError && !state.isNew) {
    return (
      <Box style={{ width: '100%' }}>
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {state.loadError instanceof Error ? state.loadError.message : 'Failed to load template'}
          </Callout.Text>
        </Callout.Root>
        <BackButton to="/templates" label="Back to Templates" />
      </Box>
    );
  }

  return (
    <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <TemplateEditorHeader
        isNew={state.isNew}
        formId={state.formId}
        formName={state.formName}
        isAdmin={state.isAdmin}
        isDesigner={state.isDesigner}
        isLocked={state.isLocked}
        onLockedChange={state.setIsLocked}
        hasDraft={state.hasDraft}
        onDiscardClick={() => state.setIsDiscardModalOpen(true)}
        isSaving={state.isSaving}
        onSave={() => state.handleSave(false)}
      />

      {/* Designer Notice if locked */}
      {isLockedForDesigner && (
        <Callout.Root color="amber" mb="4">
          <Callout.Icon>
            <LockClosedIcon />
          </Callout.Icon>
          <Callout.Text>{lockedTooltipText}</Callout.Text>
        </Callout.Root>
      )}

      {/* Success Notification */}
      {state.saveSuccess && (
        <Callout.Root color="green" mb="4">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>Template saved successfully!</Callout.Text>
        </Callout.Root>
      )}

      {/* Error Notification */}
      {state.saveError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{state.saveError}</Callout.Text>
        </Callout.Root>
      )}

      {/* Split-Pane Editor & Preview */}
      <Flex gap="4" direction={{ initial: 'column', md: 'row' }} align="stretch" style={{ flexGrow: 1, minHeight: 0 }}>
        {/* Left Pane: Metadata & Multi-Tab Editor */}
        <Flex
          direction="column"
          gap="4"
          style={{
            flexShrink: 0,
            width: '100%',
            maxWidth: '600px',
            minWidth: 0,
            height: '100%',
            overflowY: 'auto',
            paddingRight: '8px',
            paddingBottom: '32px',
          }}
        >
          <TemplateMetadataCard
            formId={state.formId}
            onFormIdChange={state.setFormId}
            formName={state.formName}
            onFormNameChange={state.setFormName}
            formDescription={state.formDescription}
            onFormDescriptionChange={state.setFormDescription}
            isNew={state.isNew}
            isLockedForDesigner={isLockedForDesigner}
          />

          <TemplateCodeTabs
            activeTab={state.activeTab}
            onActiveTabChange={state.setActiveTab}
            fields={state.fields}
            onFieldsChange={state.handleFieldsChange}
            formTemplateHtml={state.formTemplateHtml}
            onHtmlChange={state.setFormTemplateHtml}
            formTemplateCss={state.formTemplateCss}
            onCssChange={state.setFormTemplateCss}
            isLockedForDesigner={isLockedForDesigner}
          />
        </Flex>

        {/* Right Pane: Live Wasm Preview */}
        <TemplatePreviewPane
          formId={state.formId}
          previewHtml={state.previewHtml}
          formTemplateCss={state.formTemplateCss}
          debouncedWasmHtml={state.debouncedWasmHtml}
          formTemplateHtml={state.formTemplateHtml}
          isStatusCompiling={state.isStatusCompiling}
          renderCount={state.renderCount}
        />
      </Flex>

      <TemplateEditorDialogs
        conflictModalOpen={state.conflictModalOpen}
        setConflictModalOpen={state.setConflictModalOpen}
        conflictMessage={state.conflictMessage}
        isSaving={state.isSaving}
        onForceSave={() => state.handleSave(true)}
        warningModalOpen={state.warningModalOpen}
        setWarningModalOpen={state.setWarningModalOpen}
        warningList={state.warningList}
        onSaveAnyway={() => state.handleSave(true)}
        isDiscardModalOpen={state.isDiscardModalOpen}
        setIsDiscardModalOpen={state.setIsDiscardModalOpen}
        onConfirmDiscard={state.discardDraft}
        blocker={state.blocker}
      />
    </Box>
  );
};

export default TemplateEditor;
