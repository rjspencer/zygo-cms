import React, { useState } from 'react';
import { Box, Flex } from '@radix-ui/themes';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useFormState, useWatch, useFormContext } from 'react-hook-form';
import { UnsavedChangesDialog } from '../../../../components/UnsavedChangesDialog';
import { useUnsavedChangesBlocker } from '../../../../hooks/useUnsavedChangesBlocker';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import { useEditorWebMCP } from '../../hooks/useEditorWebMCP';
import { useSaveEntry } from '../../hooks/useSaveEntry';
import { useWasmPreview } from '../../hooks/useWasmPreview';
import type { EntryFormValues, EntryType } from '../../types';
import { EditorHeader } from '../EditorHeader/EditorHeader';
import { EditorTabs } from '../EditorTabs/EditorTabs';
import { LivePreviewPane } from '../LivePreviewPane/LivePreviewPane';
import { MediaPickerProvider } from '../MediaPickerProvider/MediaPickerProvider';

interface EditorLayoutProps {
  id: string | undefined;
  isEditing: boolean;
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
}

/** Everything inside the form provider: wires save, unsaved-changes blocking, preview and WebMCP to the layout. */
export const EditorLayout: React.FC<EditorLayoutProps> = ({ id, isEditing, entryType, sectionTemplates }) => {
  const { control } = useFormContext<EntryFormValues>();
  const { isDirty } = useFormState({ control });
  const [title, content, sections] = useWatch({ control, name: ['title', 'content', 'sections'] });
  const [tiptapEditor, setTiptapEditor] = useState<TipTapEditor | null>(null);

  const { blocker, allowNextNavigation } = useUnsavedChangesBlocker(isDirty);
  const { save, isSaved } = useSaveEntry({ id, isEditing, entryType, allowNextNavigation });
  const { previewHtml, previewCss } = useWasmPreview({ entryType, title, content, sections, sectionTemplates });

  const saveDraft = () => save(false);
  const publish = () => save(true);
  useEditorWebMCP({ editor: tiptapEditor, entryType, sectionTemplates, saveDraft, publish });

  return (
    <MediaPickerProvider>
      <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        <EditorHeader
          entryType={entryType}
          isNewEntry={!isEditing}
          isSaved={isSaved}
          onSaveDraft={saveDraft}
          onPublish={publish}
        />

        <Flex gap="4" direction={{ initial: 'column', md: 'row' }} align="stretch" style={{ flexGrow: 1, minHeight: 0 }}>
          <Box
            style={{
              flexShrink: 0,
              width: '100%',
              maxWidth: '600px',
              minWidth: 0,
              height: '100%',
              overflowY: 'auto',
              paddingRight: '8px',
            }}
          >
            <EditorTabs
              id={id}
              entryType={entryType}
              sectionTemplates={sectionTemplates}
              isSaved={isEditing && !isDirty}
              onEditorReady={setTiptapEditor}
            />
          </Box>
          <LivePreviewPane previewHtml={previewHtml} previewCss={previewCss} />
        </Flex>

        <UnsavedChangesDialog blocker={blocker} />
      </Box>
    </MediaPickerProvider>
  );
};
