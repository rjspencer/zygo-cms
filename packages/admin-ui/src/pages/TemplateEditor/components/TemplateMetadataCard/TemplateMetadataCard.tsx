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
            <Text as="label" htmlFor="template-id-input" size="2" mb="1" weight="bold" style={{ display: 'block' }}>
              Identifier (Slug)
            </Text>
            <TextField.Root
              id="template-id-input"
              value={formId}
              onChange={(e) => onFormIdChange(e.target.value)}
              placeholder="e.g. hero-banner"
              disabled={!isNew || isLockedForDesigner}
              aria-label="Identifier (Slug)"
            />
          </Box>

          <Box style={{ flex: 2 }}>
            <Text as="label" htmlFor="template-name-input" size="2" mb="1" weight="bold" style={{ display: 'block' }}>
              Template Name
            </Text>
            <TextField.Root
              id="template-name-input"
              value={formName}
              onChange={(e) => onFormNameChange(e.target.value)}
              placeholder="e.g. Hero Banner"
              disabled={isLockedForDesigner}
              aria-label="Template Name"
            />
          </Box>
        </Flex>

        <Box>
          <Text as="label" htmlFor="template-description-input" size="2" mb="1" weight="bold" style={{ display: 'block' }}>
            Description
          </Text>
          <TextField.Root
            id="template-description-input"
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
