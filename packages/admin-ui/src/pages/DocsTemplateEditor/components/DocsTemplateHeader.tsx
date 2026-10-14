import React from 'react';
import { Flex, Heading, Text, Badge, Button, Box } from '@radix-ui/themes';
import { ResetIcon, CounterClockwiseClockIcon, CheckIcon } from '@radix-ui/react-icons';

export interface DocsTemplateHeaderProps {
  hasUnsavedChanges: boolean;
  isSaving: boolean;
  revisionCount: number;
  onSave: () => void;
  onOpenReset: () => void;
  onOpenRevisions: () => void;
}

export const DocsTemplateHeader: React.FC<DocsTemplateHeaderProps> = ({
  hasUnsavedChanges,
  isSaving,
  revisionCount,
  onSave,
  onOpenReset,
  onOpenRevisions,
}) => {
  return (
    <Flex justify="between" align="center" mb="4" wrap="wrap" gap="3">
      <Flex align="center" gap="3">
        <Box>
          <Flex align="center" gap="2">
            <Heading size="5">Docs Template</Heading>
            <Badge color="blue" variant="soft">
              System Layout
            </Badge>
            {hasUnsavedChanges && (
              <Badge color="amber" variant="surface">
                Unsaved Changes
              </Badge>
            )}
          </Flex>
          <Text size="2" color="gray">
            Customize 3-column documentation layout, navigation sidebar, and reading styles.
          </Text>
        </Box>
      </Flex>

      <Flex align="center" gap="2">
        <Button
          variant="outline"
          color="gray"
          onClick={onOpenReset}
          data-testid="docs-template-reset-btn"
          aria-label="Reset to default"
        >
          <ResetIcon />
          Reset to Default
        </Button>
        <Button
          variant="outline"
          color="gray"
          onClick={onOpenRevisions}
          data-testid="docs-template-revisions-btn"
          aria-label="View revisions"
        >
          <CounterClockwiseClockIcon />
          Revisions ({revisionCount})
        </Button>
        <Button
          variant="solid"
          color="blue"
          onClick={onSave}
          disabled={!hasUnsavedChanges || isSaving}
          data-testid="docs-template-save-btn"
          aria-label="Save changes"
        >
          <CheckIcon />
          {isSaving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Flex>
    </Flex>
  );
};
