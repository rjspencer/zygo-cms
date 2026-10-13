import React from 'react';
import { Box, Text } from '@radix-ui/themes';
import { Controller, useFormContext } from 'react-hook-form';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { RichTextEditor } from '../../../../../../components/RichTextEditor';
import { useOpenMediaPicker } from '../../../../context/MediaPickerContext';
import type { EntryFormValues, EntryType } from '../../../../types';

export interface PostBodyFieldProps {
  entryType: EntryType;
  onEditorReady?: ((editor: TipTapEditor | null) => void) | ((editor: TipTapEditor) => void);
}

export const PostBodyField: React.FC<PostBodyFieldProps> = ({ entryType, onEditorReady }) => {
  const { control } = useFormContext<EntryFormValues>();
  const openMediaPicker = useOpenMediaPicker();

  return (
    <Box>
      <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
        Body Content
      </Text>
      <Controller
        name="content"
        control={control}
        render={({ field }) => (
          <RichTextEditor
            value={field.value}
            onChange={field.onChange}
            onOpenMediaPicker={openMediaPicker}
            onEditorReady={onEditorReady ? (editor) => onEditorReady(editor as any) : undefined}
            minHeight="400px"
            aria-label={`${entryType === 'post' ? 'Post' : 'Doc'} Body`}
          />
        )}
      />
    </Box>
  );
};
