import React from 'react';
import { Box, Button, Flex } from '@radix-ui/themes';
import { BackButton } from '../../../../components/BackButton';
import type { EntryType } from '../../types';
import { EntryBadges } from '../EntryBadges/EntryBadges';
import { TitleEditor } from '../TitleEditor/TitleEditor';

interface EditorHeaderProps {
  entryType: EntryType;
  isNewEntry: boolean;
  isSaved: boolean;
  onSaveDraft: () => void;
  onPublish: () => void;
}

export const EditorHeader: React.FC<EditorHeaderProps> = ({ entryType, isNewEntry, isSaved, onSaveDraft, onPublish }) => (
  <>
    <Flex justify="between" align="center" mb="2">
      <BackButton />
      <Flex gap="2">
        <Button variant="soft" color="gray" onClick={onSaveDraft}>
          Save Draft
        </Button>
        <Button variant="solid" color="cyan" onClick={onPublish}>
          Publish
        </Button>
      </Flex>
    </Flex>

    <Box mb="5">
      <TitleEditor isNewEntry={isNewEntry} />
      <EntryBadges entryType={entryType} isSaved={isSaved} />
    </Box>
  </>
);
