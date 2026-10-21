import type { Editor as TipTapEditor } from '@tiptap/react';

declare module '@tiptap/extension-image' {
  interface SetImageOptions {
    style?: string;
  }
}

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onOpenMediaPicker?: (insertImage: (url: string, alt?: string) => void) => void;
  onEditorReady?: (editor: TipTapEditor | null) => void;
  'aria-label'?: string;
  id?: string;
}

export interface RichTextToolbarProps {
  editor: TipTapEditor;
  onToggleLink: () => void;
  onInsertImage: () => void;
}
