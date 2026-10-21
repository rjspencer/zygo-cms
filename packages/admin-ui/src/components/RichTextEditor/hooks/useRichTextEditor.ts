import { useEffect } from 'react';
import { useEditor, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { getPublicSiteUrl } from '../../../utils/api';
import type { RichTextEditorProps } from '../types';

export const ZygoImage = Image.extend({
  addNodeView() {
    return ({ node, HTMLAttributes }) => {
      const el = document.createElement('img');
      const mergedAttributes = mergeAttributes(this.options.HTMLAttributes, HTMLAttributes);
      Object.entries(mergedAttributes).forEach(([key, value]) => {
        if (value != null && key !== 'src') {
          el.setAttribute(key, String(value));
        }
      });

      const syncSrc = (rawSrc: string) => {
        if (!rawSrc) {
          el.removeAttribute('src');
          return;
        }
        const resolved =
          rawSrc.startsWith('/') && !rawSrc.startsWith('//')
            ? getPublicSiteUrl(rawSrc)
            : rawSrc;
        el.setAttribute('src', resolved);
      };

      syncSrc(node.attrs.src || '');

      return {
        dom: el,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) return false;
          syncSrc(updatedNode.attrs.src || '');
          if (updatedNode.attrs.alt != null) {
            el.setAttribute('alt', updatedNode.attrs.alt);
          } else {
            el.removeAttribute('alt');
          }
          if (updatedNode.attrs.title != null) {
            el.setAttribute('title', updatedNode.attrs.title);
          } else {
            el.removeAttribute('title');
          }
          return true;
        },
      };
    };
  },
});

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
      ZygoImage.configure({
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
