import React, { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Flex, Box, IconButton, Button, Separator } from '@radix-ui/themes';
import {
  FontBoldIcon,
  FontItalicIcon,
  StrikethroughIcon,
  CodeIcon,
  ListBulletIcon,
  QuoteIcon,
  Link2Icon,
  ImageIcon,
  ResetIcon,
  ResumeIcon,
} from '@radix-ui/react-icons';

export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  onOpenMediaPicker?: (insertImage: (url: string, alt?: string) => void) => void;
  'aria-label'?: string;
  id?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder,
  minHeight = '200px',
  onOpenMediaPicker,
  'aria-label': ariaLabel,
  id,
}) => {
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
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
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

  if (!editor) {
    return null;
  }

  const handleToggleLink = () => {
    const previousUrl = editor.getAttributes('link').href || '';
    const url = window.prompt('Enter URL', previousUrl);
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  };

  const handleInsertImage = () => {
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
      {/* Formatting toolbar */}
      <Flex
        wrap="wrap"
        gap="1"
        p="2"
        align="center"
        style={{
          borderBottom: '1px solid var(--gray-a4)',
          backgroundColor: 'var(--gray-a2)',
        }}
      >
        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('bold') ? 'solid' : 'ghost'}
          color={editor.isActive('bold') ? 'cyan' : 'gray'}
          aria-label="Bold"
          title="Bold"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <FontBoldIcon />
        </IconButton>

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('italic') ? 'solid' : 'ghost'}
          color={editor.isActive('italic') ? 'cyan' : 'gray'}
          aria-label="Italic"
          title="Italic"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <FontItalicIcon />
        </IconButton>

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('strike') ? 'solid' : 'ghost'}
          color={editor.isActive('strike') ? 'cyan' : 'gray'}
          aria-label="Strikethrough"
          title="Strikethrough"
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <StrikethroughIcon />
        </IconButton>

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('code') ? 'solid' : 'ghost'}
          color={editor.isActive('code') ? 'cyan' : 'gray'}
          aria-label="Inline Code"
          title="Inline Code"
          onClick={() => editor.chain().focus().toggleCode().run()}
        >
          <CodeIcon />
        </IconButton>

        <Separator orientation="vertical" style={{ height: '18px', margin: '0 2px' }} />

        <Button
          size="1"
          type="button"
          variant={editor.isActive('heading', { level: 1 }) ? 'solid' : 'ghost'}
          color={editor.isActive('heading', { level: 1 }) ? 'cyan' : 'gray'}
          aria-label="Heading 1"
          title="Heading 1"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          style={{ minWidth: '28px', height: '24px', padding: '0 6px', fontWeight: 'bold' }}
        >
          H1
        </Button>

        <Button
          size="1"
          type="button"
          variant={editor.isActive('heading', { level: 2 }) ? 'solid' : 'ghost'}
          color={editor.isActive('heading', { level: 2 }) ? 'cyan' : 'gray'}
          aria-label="Heading 2"
          title="Heading 2"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          style={{ minWidth: '28px', height: '24px', padding: '0 6px', fontWeight: 'bold' }}
        >
          H2
        </Button>

        <Button
          size="1"
          type="button"
          variant={editor.isActive('heading', { level: 3 }) ? 'solid' : 'ghost'}
          color={editor.isActive('heading', { level: 3 }) ? 'cyan' : 'gray'}
          aria-label="Heading 3"
          title="Heading 3"
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          style={{ minWidth: '28px', height: '24px', padding: '0 6px', fontWeight: 'bold' }}
        >
          H3
        </Button>

        <Separator orientation="vertical" style={{ height: '18px', margin: '0 2px' }} />

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('bulletList') ? 'solid' : 'ghost'}
          color={editor.isActive('bulletList') ? 'cyan' : 'gray'}
          aria-label="Bullet List"
          title="Bullet List"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <ListBulletIcon />
        </IconButton>

        <Button
          size="1"
          type="button"
          variant={editor.isActive('orderedList') ? 'solid' : 'ghost'}
          color={editor.isActive('orderedList') ? 'cyan' : 'gray'}
          aria-label="Ordered List"
          title="Ordered List"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          style={{ minWidth: '28px', height: '24px', padding: '0 6px', fontWeight: 'bold' }}
        >
          1.
        </Button>

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('blockquote') ? 'solid' : 'ghost'}
          color={editor.isActive('blockquote') ? 'cyan' : 'gray'}
          aria-label="Blockquote"
          title="Blockquote"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        >
          <QuoteIcon />
        </IconButton>

        <Separator orientation="vertical" style={{ height: '18px', margin: '0 2px' }} />

        <IconButton
          size="1"
          type="button"
          variant={editor.isActive('link') ? 'solid' : 'ghost'}
          color={editor.isActive('link') ? 'cyan' : 'gray'}
          aria-label="Link"
          title="Link"
          onClick={handleToggleLink}
        >
          <Link2Icon />
        </IconButton>

        <IconButton
          size="1"
          type="button"
          variant="ghost"
          color="gray"
          aria-label="Insert Image"
          title="Insert Image"
          onClick={handleInsertImage}
        >
          <ImageIcon />
        </IconButton>

        <Separator orientation="vertical" style={{ height: '18px', margin: '0 2px' }} />

        <IconButton
          size="1"
          type="button"
          variant="ghost"
          color="gray"
          aria-label="Undo"
          title="Undo"
          disabled={!editor.can().undo()}
          onClick={() => editor.chain().focus().undo().run()}
        >
          <ResetIcon />
        </IconButton>

        <IconButton
          size="1"
          type="button"
          variant="ghost"
          color="gray"
          aria-label="Redo"
          title="Redo"
          disabled={!editor.can().redo()}
          onClick={() => editor.chain().focus().redo().run()}
        >
          <ResumeIcon />
        </IconButton>
      </Flex>

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
