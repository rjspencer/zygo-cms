import React, { useEffect, useState } from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useFieldArray, useFormContext, useFormState, useWatch } from 'react-hook-form';
import type { EntryFormValues } from '../../../../types';
import type { SectionTemplate } from '../../../../../../types/sectionTemplate';
import { AddSectionSelect } from './components/AddSectionSelect';
import { SectionCard } from './components/SectionCard';

export interface SectionListProps {
  sectionTemplates: SectionTemplate[];
}

function getSectionFieldErrors(sectionError: any): Record<string, string> {
  const rawDataErrors = sectionError?.data;
  if (!rawDataErrors || typeof rawDataErrors !== 'object') {
    return {};
  }
  const fieldErrors: Record<string, string> = {};
  for (const [fieldName, errObj] of Object.entries(rawDataErrors)) {
    if (typeof errObj === 'string') {
      fieldErrors[fieldName] = errObj;
    } else if (errObj && typeof (errObj as any).message === 'string') {
      fieldErrors[fieldName] = (errObj as any).message;
    }
  }
  return fieldErrors;
}

export const SectionList: React.FC<SectionListProps> = ({ sectionTemplates }) => {
  const { control, setValue, clearErrors } = useFormContext<EntryFormValues>();
  const { errors } = useFormState({ control });
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

  const [expandedByIndex, setExpandedByIndex] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!errors.sections) return;
    const sectionErrors = errors.sections as any;
    const updates: Record<number, boolean> = {};
    let hasUpdates = false;

    const checkSection = (secErr: any, idx: number) => {
      const fieldErrors = getSectionFieldErrors(secErr);
      if (Object.keys(fieldErrors).length > 0) {
        updates[idx] = true;
        hasUpdates = true;
      }
    };

    if (Array.isArray(sectionErrors)) {
      sectionErrors.forEach((secErr, idx) => checkSection(secErr, idx));
    } else if (typeof sectionErrors === 'object') {
      Object.entries(sectionErrors).forEach(([key, secErr]: [string, any]) => {
        const idx = Number(key);
        if (!Number.isNaN(idx)) {
          checkSection(secErr, idx);
        }
      });
    }

    if (hasUpdates) {
      setExpandedByIndex((prev) => ({ ...prev, ...updates }));
    }
  }, [errors.sections]);

  const handleToggleExpand = (index: number) => {
    setExpandedByIndex((prev) => ({
      ...prev,
      [index]: !(prev[index] ?? true),
    }));
  };

  const handleMove = (from: number, to: number) => {
    move(from, to);
    setExpandedByIndex((prev) => {
      const fromExpanded = prev[from] ?? true;
      const toExpanded = prev[to] ?? true;
      return {
        ...prev,
        [from]: toExpanded,
        [to]: fromExpanded,
      };
    });
  };

  const handleRemove = (index: number) => {
    remove(index);
    setExpandedByIndex((prev) => {
      const next: Record<number, boolean> = {};
      Object.entries(prev).forEach(([keyStr, val]) => {
        const k = Number(keyStr);
        if (k < index) {
          next[k] = val;
        } else if (k > index) {
          next[k - 1] = val;
        }
      });
      return next;
    });
  };

  const handleAddSection = (typeId: string) => {
    append({ type_id: typeId, data: {} });
  };

  return (
    <Box>
      <Flex justify="between" align="center" mb="4">
        <Text as="div" size="2" weight="bold">
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
          const sectionError = (errors.sections as any)?.[index];
          const fieldErrors = getSectionFieldErrors(sectionError);
          const isExpanded = expandedByIndex[index] ?? true;

          return (
            <SectionCard
              key={field.id}
              section={section}
              index={index}
              totalSections={fields.length}
              template={template}
              isExpanded={isExpanded}
              fieldErrors={fieldErrors}
              onToggleExpand={() => handleToggleExpand(index)}
              onMoveUp={() => handleMove(index, index - 1)}
              onMoveDown={() => handleMove(index, index + 1)}
              onDelete={() => handleRemove(index)}
              onChangeData={(newData) => {
                setValue(`sections.${index}.data`, newData, {
                  shouldDirty: true,
                  shouldValidate: true,
                });
                clearErrors(`sections.${index}` as any);
              }}
            />
          );
        })}
      </Flex>
    </Box>
  );
};
