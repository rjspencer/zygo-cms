import React, { useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import type { EntryFormValues } from '../../../../types';
import type { SectionTemplate } from '../../../../../../types/sectionTemplate';
import { AddSectionSelect } from './components/AddSectionSelect';
import { SectionCard } from './components/SectionCard';

export interface SectionListProps {
  sectionTemplates: SectionTemplate[];
}

export const SectionList: React.FC<SectionListProps> = ({ sectionTemplates }) => {
  const { control, setValue } = useFormContext<EntryFormValues>();
  const { fields, append, move, remove } = useFieldArray({
    control,
    name: 'sections',
  });
  const watchedSections = useWatch({
    control,
    name: 'sections',
    defaultValue: [],
  });
  const sections = watchedSections ?? [];

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  const handleToggleExpand = (fieldId: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [fieldId]: !(prev[fieldId] ?? true),
    }));
  };

  const handleAddSection = (typeId: string) => {
    append({ type_id: typeId, data: {} });
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="4">
        <Text as="label" size="2" weight="bold">
          Page Sections
        </Text>
        <AddSectionSelect
          sectionTemplates={sectionTemplates}
          onAddSection={handleAddSection}
        />
      </Flex>

      <Flex direction="column" gap="3">
        {fields.length === 0 && (
          <Text size="2" color="gray">
            No sections added yet. Click &quot;Add Section...&quot; above to add one.
          </Text>
        )}
        {fields.map((field, index) => {
          const section = sections[index] ?? field;
          const template = sectionTemplates.find((t) => t.id === section.type_id);
          const isExpanded = expandedSections[field.id] ?? true;

          return (
            <SectionCard
              key={field.id}
              section={section}
              index={index}
              totalSections={fields.length}
              template={template}
              isExpanded={isExpanded}
              onToggleExpand={() => handleToggleExpand(field.id)}
              onMoveUp={() => move(index, index - 1)}
              onMoveDown={() => move(index, index + 1)}
              onDelete={() => remove(index)}
              onChangeData={(newData) =>
                setValue(`sections.${index}.data`, newData, { shouldDirty: true })
              }
            />
          );
        })}
      </Flex>
    </Box>
  );
};
