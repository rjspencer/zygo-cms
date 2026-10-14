import React from 'react';
import { Card, Flex, Box, Text, TextField } from '@radix-ui/themes';
import type { TemplateMetadataCardProps } from '../../types';

export const TemplateMetadataCard: React.FC<TemplateMetadataCardProps> = ({
  formId,
  onFormIdChange,
  formName,
  onFormNameChange,
  formDescription,
  onFormDescriptionChange,
  isNew,
  isLockedForDesigner,
}) => {
  return (
    <Card size="2" style={{ flexShrink: 0 }}>
      <Flex direction="column" gap="3">
        <Flex gap="4">
          <Box style={{ flex: 1 }}>
            <Text as="div" size="2" mb="1" weight="bold">
              Identifier (Slug)
            </Text>
            <TextField.Root
              value={formId}
              onChange={(e) => onFormIdChange(e.target.value)}
              placeholder="e.g. hero-banner"
              disabled={!isNew || isLockedForDesigner}
              aria-label="Identifier (Slug)"
            />
          </Box>

          <Box style={{ flex: 2 }}>
            <Text as="div" size="2" mb="1" weight="bold">
              Template Name
            </Text>
            <TextField.Root
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              placeholder="e.g. Hero Banner"
              disabled={isLockedForDesigner}
              aria-label="Template Name"
            />
          </Box>
        </Flex>

        <Box>
          <Text as="div" size="2" mb="1" weight="bold">
            Description
          </Text>
          <TextField.Root
            value={formDescription}
            onChange={(e) => onFormDescriptionChange(e.target.value)}
            placeholder="Optional summary or usage instructions"
            disabled={isLockedForDesigner}
            aria-label="Description"
          />
        </Box>
      </Flex>
    </Card>
  );
};
