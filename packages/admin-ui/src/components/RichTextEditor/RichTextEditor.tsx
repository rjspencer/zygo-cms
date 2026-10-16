import React from 'react';
import { Box } from '@radix-ui/themes';
import { EditorContent } from '@tiptap/react';
import { RichTextToolbar } from './components/RichTextToolbar';
import { useRichTextEditor } from './hooks/useRichTextEditor';
import type { RichTextEditorProps } from './types';

export const RichTextEditor: React.FC<RichTextEditorProps> = (props) => {
  const { minHeight = '200px' } = props;
  const { editor, handleToggleLink, handleInsertImage } = useRichTextEditor(props);

  if (!editor) {
    return null;
  }

  return (
    <Box
      className="rich-text-editor-container"
      style={{
        border: '1px solid var(--gray-a6)',
        borderRadius: 'var(--radius-2)',
        backgroundColor: 'var(--color-surface)',
        overflow: 'hidden',
      }}
    >
      <RichTextToolbar
        editor={editor}
        onToggleLink={handleToggleLink}
        onInsertImage={handleInsertImage}
      />

      {/* Editor Content Area */}
      <Box
        p="3"
        style={{ minHeight, cursor: 'text' }}
        onClick={() => {
          if (!editor.isFocused) {
            editor.commands.focus();
          }
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
};

export default RichTextEditor;
