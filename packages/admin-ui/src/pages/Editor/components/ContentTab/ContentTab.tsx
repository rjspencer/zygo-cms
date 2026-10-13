import React from 'react';
import { Flex } from '@radix-ui/themes';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { ENTRY_TYPE_CONFIG } from '../../constants';
import type { EntryType } from '../../types';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import { SlugField } from './components/SlugField';
import { PostBodyField } from './components/PostBodyField';
import { SectionList } from './components/SectionList';

export interface ContentTabProps {
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  onEditorReady?: ((editor: TipTapEditor | null) => void) | ((editor: TipTapEditor) => void);
}

export const ContentTab: React.FC<ContentTabProps> = ({
  entryType,
  sectionTemplates,
  onEditorReady,
}) => {
  return (
    <Flex direction="column" gap="4">
      <SlugField entryType={entryType} />
      {ENTRY_TYPE_CONFIG[entryType].usesSections ? (
        <SectionList sectionTemplates={sectionTemplates} />
      ) : (
        <PostBodyField entryType={entryType} onEditorReady={onEditorReady} />
      )}
    </Flex>
  );
};
