import React from 'react';
import { Select } from '@radix-ui/themes';
import type { SectionTemplate } from '../../../../../../../../types/sectionTemplate';

export interface AddSectionSelectProps {
  sectionTemplates: SectionTemplate[];
  onAddSection: (typeId: string) => void;
}

export const AddSectionSelect: React.FC<AddSectionSelectProps> = ({
  sectionTemplates,
  onAddSection,
}) => {
  return (
    <Select.Root onValueChange={onAddSection}>
      <Select.Trigger placeholder="Add Section..." />
      <Select.Content>
        {sectionTemplates.map((st) => (
          <Select.Item key={st.id} value={st.id}>
            {st.name}
          </Select.Item>
        ))}
      </Select.Content>
    </Select.Root>
  );
};
