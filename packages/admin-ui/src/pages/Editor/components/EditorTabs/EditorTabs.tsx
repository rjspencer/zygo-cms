import React from 'react';
import { Tabs } from '@radix-ui/themes';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { useFormContext, useWatch } from 'react-hook-form';
import { LinksTab } from '../../../../components/LinksTab';
import type { SectionTemplate } from '../../../../types/sectionTemplate';
import { getPublicSiteUrl } from '../../../../utils/api';
import { getEntryPublicPath } from '../../constants';
import type { EntryFormValues, EntryType } from '../../types';
import { ContentTab } from '../ContentTab/ContentTab';
import { MetadataTab } from '../MetadataTab/MetadataTab';

export interface EditorTabsProps {
  id: string | undefined;
  entryType: EntryType;
  sectionTemplates: SectionTemplate[];
  /** True when the entry exists on the server and has no unsaved edits. */
  isSaved: boolean;
  onEditorReady: (editor: TipTapEditor) => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export const EditorTabs: React.FC<EditorTabsProps> = ({
  id,
  entryType,
  sectionTemplates,
  isSaved,
  onEditorReady,
  activeTab,
  onTabChange,
}) => {
  const { control } = useFormContext<EntryFormValues>();
  const [canonicalUrl, slug] = useWatch({ control, name: ['canonicalUrl', 'slug'] });

  const rootProps =
    activeTab !== undefined
      ? { value: activeTab, onValueChange: onTabChange }
      : { defaultValue: 'content' };

  return (
    <Tabs.Root {...rootProps}>
      <Tabs.List mb="4">
        <Tabs.Trigger value="content">Content</Tabs.Trigger>
        <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
        <Tabs.Trigger value="links">Links</Tabs.Trigger>
      </Tabs.List>

      <Tabs.Content value="content">
        <ContentTab entryType={entryType} sectionTemplates={sectionTemplates} onEditorReady={onEditorReady} />
      </Tabs.Content>

      <Tabs.Content value="metadata">
        <MetadataTab entryType={entryType} />
      </Tabs.Content>

      <Tabs.Content value="links">
        <LinksTab
          entryId={id}
          baseCanonicalUrl={canonicalUrl || getPublicSiteUrl(getEntryPublicPath(entryType, slug))}
          isSaved={isSaved}
        />
      </Tabs.Content>
    </Tabs.Root>
  );
};
