import React from 'react';
import { Flex, IconButton, Button, Separator } from '@radix-ui/themes';
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
import type { RichTextToolbarProps } from '../../types';

const HEADING_LEVELS = [1, 2, 3] as const;

export const RichTextToolbar: React.FC<RichTextToolbarProps> = ({
  editor,
  onToggleLink,
  onInsertImage,
}) => {
  const inlineButtons = [
    { mark: 'bold', label: 'Bold', icon: <FontBoldIcon />, action: () => editor.chain().focus().toggleBold().run() },
    { mark: 'italic', label: 'Italic', icon: <FontItalicIcon />, action: () => editor.chain().focus().toggleItalic().run() },
    { mark: 'strike', label: 'Strikethrough', icon: <StrikethroughIcon />, action: () => editor.chain().focus().toggleStrike().run() },
    { mark: 'code', label: 'Inline Code', icon: <CodeIcon />, action: () => editor.chain().focus().toggleCode().run() },
  ];

  return (
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
      {inlineButtons.map((btn) => (
        <IconButton
          key={btn.mark}
          size="1"
          type="button"
          variant={editor.isActive(btn.mark) ? 'solid' : 'ghost'}
          color={editor.isActive(btn.mark) ? 'cyan' : 'gray'}
          aria-label={btn.label}
          title={btn.label}
          onClick={btn.action}
        >
          {btn.icon}
        </IconButton>
      ))}

      <Separator orientation="vertical" style={{ height: '18px', margin: '0 2px' }} />

      {HEADING_LEVELS.map((level) => (
        <Button
          key={level}
          size="1"
          type="button"
          variant={editor.isActive('heading', { level }) ? 'solid' : 'ghost'}
          color={editor.isActive('heading', { level }) ? 'cyan' : 'gray'}
          aria-label={`Heading ${level}`}
          title={`Heading ${level}`}
          onClick={() => editor.chain().focus().toggleHeading({ level }).run()}
          style={{ minWidth: '28px', height: '24px', padding: '0 6px', fontWeight: 'bold' }}
        >
          H{level}
        </Button>
      ))}

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
        onClick={onToggleLink}
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
        onClick={onInsertImage}
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
  );
};

export default RichTextToolbar;

