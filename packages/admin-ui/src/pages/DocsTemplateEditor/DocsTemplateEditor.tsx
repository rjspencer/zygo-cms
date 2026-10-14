import React, { useState } from 'react';
import { Box, Tabs, Callout, Text } from '@radix-ui/themes';
import { CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { CodeEditor } from '../../components/CodeEditor';
import { useLayoutTemplateEditorState } from '../../hooks/useLayoutTemplateEditorState';
import { DocsTemplateHeader } from './components/DocsTemplateHeader';
import { DocsTemplateGuidance } from './components/DocsTemplateGuidance';
import { LayoutResetDialog } from '../../components/LayoutTemplateDialogs/LayoutResetDialog';
import { LayoutRevisionsDialog } from '../../components/LayoutTemplateDialogs/LayoutRevisionsDialog';
import type { DocsTemplateEditorProps } from './types';

export const DocsTemplateEditor: React.FC<DocsTemplateEditorProps> = ({ initialTab = 'html' }) => {
  const [activeTab, setActiveTab] = useState<'html' | 'css'>(initialTab);
  const state = useLayoutTemplateEditorState('doc');

  if (state.isLoading) {
    return (
      <Box p="4">
        <Text color="gray">Loading Docs template...</Text>
      </Box>
    );
  }

  if (state.loadError) {
    return (
      <Box p="4">
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {state.loadError instanceof Error ? state.loadError.message : 'Failed to load docs template'}
          </Callout.Text>
        </Callout.Root>
      </Box>
    );
  }

  return (
    <Box>
      <DocsTemplateHeader
        hasUnsavedChanges={state.hasUnsavedChanges}
        isSaving={state.isSaving}
        revisionCount={state.revisions.length}
        onSave={state.handleSave}
        onOpenReset={() => state.setIsResetDialogOpen(true)}
        onOpenRevisions={() => state.setIsRevisionsDialogOpen(true)}
      />

      <DocsTemplateGuidance />

      {state.saveSuccess && (
        <Callout.Root color="green" mb="4" data-testid="save-success-callout">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>Docs template saved successfully! Public stylesheet cache updated.</Callout.Text>
        </Callout.Root>
      )}

      {state.saveError && (
        <Callout.Root color="red" mb="4" data-testid="save-error-callout">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{state.saveError}</Callout.Text>
        </Callout.Root>
      )}

      <Tabs.Root value={activeTab} onValueChange={(val) => setActiveTab(val as 'html' | 'css')}>
        <Tabs.List mb="3">
          <Tabs.Trigger value="html" data-testid="tab-trigger-html">
            HTML Template (Doc Page)
          </Tabs.Trigger>
          <Tabs.Trigger value="css" data-testid="tab-trigger-css">
            CSS Stylesheet (Docs Layout &amp; Navigation)
          </Tabs.Trigger>
        </Tabs.List>

        <Box pt="2">
          <Tabs.Content value="html">
            <CodeEditor
              value={state.html}
              onChange={state.setHtml}
              language="html"
              minHeight={450}
              ariaLabel="Docs HTML template editor"
              dataTestId="docs-template-html-editor"
            />
          </Tabs.Content>

          <Tabs.Content value="css">
            <CodeEditor
              value={state.css}
              onChange={state.setCss}
              language="css"
              minHeight={450}
              ariaLabel="Docs CSS stylesheet editor"
              dataTestId="docs-template-css-editor"
            />
          </Tabs.Content>
        </Box>
      </Tabs.Root>

      <LayoutResetDialog
        open={state.isResetDialogOpen}
        onOpenChange={state.setIsResetDialogOpen}
        templateName="Docs Template"
        onConfirm={state.handleReset}
        isSaving={state.isSaving}
      />

      <LayoutRevisionsDialog
        open={state.isRevisionsDialogOpen}
        onOpenChange={state.setIsRevisionsDialogOpen}
        revisions={state.revisions}
        isLoading={state.isLoadingRevisions}
        onRestore={state.handleRestoreRevision}
        isSaving={state.isSaving}
      />
    </Box>
  );
};

export default DocsTemplateEditor;
