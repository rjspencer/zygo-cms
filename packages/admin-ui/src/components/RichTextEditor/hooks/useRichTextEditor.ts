import { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import type { RichTextEditorProps } from '../types';

export const useRichTextEditor = ({
  value,
  onChange,
  placeholder,
  minHeight = '200px',
  onOpenMediaPicker,
  onEditorReady,
  'aria-label': ariaLabel,
  id,
}: RichTextEditorProps) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
        link: false,
      }),
      Image.configure({
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          target: null,
          rel: null,
        },
      }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap',
        ...(ariaLabel ? { 'aria-label': ariaLabel } : {}),
        ...(id ? { id } : {}),
        ...(placeholder ? { 'data-placeholder': placeholder } : {}),
        style: `min-height: ${minHeight}; outline: none;`,
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  // Sync external value changes without losing cursor unnecessarily
  useEffect(() => {
    if (!editor) return;
    const currentHtml = editor.getHTML();
    if (value !== currentHtml && (value !== '' || !editor.isEmpty)) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
  }, [value, editor]);

  useEffect(() => {
    if (editor) {
      onEditorReady?.(editor);
    }
    return () => {
      onEditorReady?.(null);
    };
  }, [editor, onEditorReady]);

  const handleToggleLink = () => {
    if (!editor) return;
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      const isExternal = /^https?:\/\//i.test(url.trim());
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({
          href: url,
          target: isExternal ? '_blank' : null,
          rel: isExternal ? 'noopener noreferrer' : null,
        })
        .run();
    }
  };

  const handleInsertImage = () => {
    if (!editor) return;
    if (onOpenMediaPicker) {
      onOpenMediaPicker((url: string, alt?: string) => {
        editor.chain().focus().setImage({ src: url, alt: alt || '' }).run();
      });
    } else {
      const url = window.prompt('Enter image URL');
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      }
    }
  };

  return {
    editor,
    handleToggleLink,
    handleInsertImage,
  };
};

export default useRichTextEditor;
