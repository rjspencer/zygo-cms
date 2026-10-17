import React from 'react';
import { Card, Flex, Box, Text, IconButton } from '@radix-ui/themes';
import {
  CaretUpIcon,
  CaretDownIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import { SectionFieldRenderer } from '../../../../../../../../components/SectionFieldRenderer';
import { useOpenMediaPicker } from '../../../../../../context/MediaPickerContext';
import type { SectionInstance, SectionTemplate } from '../../../../../../../../types/sectionTemplate';
import { parseTemplateFields } from './parseTemplateFields';

export interface SectionCardProps {
  section: SectionInstance;
  index: number;
  totalSections: number;
  template?: SectionTemplate;
  isExpanded: boolean;
  fieldErrors?: Record<string, string>;
  onToggleExpand: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onDelete: () => void;
  onChangeData: (newData: Record<string, any>) => void;
}

export const SectionCard: React.FC<SectionCardProps> = ({
  section,
  index,
  totalSections,
  template,
  isExpanded,
  fieldErrors,
  onToggleExpand,
  onMoveUp,
  onMoveDown,
  onDelete,
  onChangeData,
}) => {
  const openMediaPicker = useOpenMediaPicker();
  const isMissing = !template;
  const fields = parseTemplateFields(template);

  return (
    <Card variant="surface" style={{ padding: 0, overflow: 'hidden' }}>
      <Flex
        align="center"
        justify="between"
        p="3"
        style={{
          borderBottom: isExpanded ? '1px solid var(--gray-a4)' : 'none',
          backgroundColor: 'var(--gray-a2)',
        }}
      >
        <Flex align="center" gap="3">
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            type="button"
            aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
            onClick={onToggleExpand}
          >
            {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
          </IconButton>
          {isMissing ? (
            <Flex align="center" gap="2">
              <Text weight="bold" size="2" color="red">
                Missing template
              </Text>
              <Text size="1" color="gray">
                ({section.type_id})
              </Text>
            </Flex>
          ) : (
            <Text weight="bold" size="2">
              {template.name}
            </Text>
          )}
        </Flex>

        <Flex gap="2">
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="soft"
            type="button"
            disabled={index === 0}
            aria-label="Move section up"
            title="Move Up"
            onClick={onMoveUp}
          >
            <CaretUpIcon />
          </IconButton>
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="soft"
            type="button"
            disabled={index === totalSections - 1}
            aria-label="Move section down"
            title="Move Down"
            onClick={onMoveDown}
          >
            <CaretDownIcon />
          </IconButton>
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="soft"
            color="red"
            type="button"
            aria-label="Delete section"
            title="Delete Section"
            onClick={onDelete}
          >
            <TrashIcon />
          </IconButton>
        </Flex>
      </Flex>

      {isExpanded && (
        <Box p="4">
          {isMissing ? (
            <Text size="2" color="red">
              This section uses a template ({section.type_id}) that cannot be found. You can remove it using the delete button above.
            </Text>
          ) : (
            <SectionFieldRenderer
              fields={fields}
              data={section.data || {}}
              onChange={onChangeData}
              onOpenMediaPicker={openMediaPicker}
              errors={fieldErrors}
            />
          )}
        </Box>
      )}
    </Card>
  );
};
