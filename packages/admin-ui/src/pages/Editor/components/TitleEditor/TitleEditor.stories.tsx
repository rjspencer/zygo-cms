import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import type { EntryFormValues } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EditorUIStateProvider } from '../../context/EditorUIStateContext';
import { TitleEditor } from './TitleEditor';

interface WrapperProps {
  initialTitle?: string;
  isNewEntry: boolean;
}

const TitleEditorStoryWrapper: React.FC<WrapperProps> = ({ initialTitle = '', isNewEntry }) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, title: initialTitle },
  });

  return (
    <Theme>
      <Box p="4" style={{ maxWidth: '600px', backgroundColor: 'var(--color-panel-solid)' }}>
        <FormProvider {...methods}>
          <EditorUIStateProvider initialTitleEditing={isNewEntry}>
            <TitleEditor isNewEntry={isNewEntry} />
          </EditorUIStateProvider>
        </FormProvider>
      </Box>
    </Theme>
  );
};

const meta: Meta<typeof TitleEditorStoryWrapper> = {
  title: 'Editor/Subcomponents/TitleEditor',
  component: TitleEditorStoryWrapper,
};

export default meta;
type Story = StoryObj<typeof TitleEditorStoryWrapper>;

export const NewEntry: Story = {
  args: {
    initialTitle: '',
    isNewEntry: true,
  },
};

export const ExistingEntry: Story = {
  args: {
    initialTitle: 'Getting Started with Zygo CMS',
    isNewEntry: false,
  },
};

export const LongTitle: Story = {
  args: {
    initialTitle: 'Building Enterprise JAMstack Frontends with Cloudflare Workers, D1 Database, and Zygo Headless CMS',
    isNewEntry: false,
  },
};
