import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import type { EntryFormValues, EntryType } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EditorUIStateProvider } from '../../context/EditorUIStateContext';
import { EditorHeader } from './EditorHeader';

interface HeaderStoryWrapperProps {
  entryType: EntryType;
  isNewEntry: boolean;
  isSaved: boolean;
  initialTitle?: string;
}

const HeaderStoryWrapper: React.FC<HeaderStoryWrapperProps> = ({
  entryType,
  isNewEntry,
  isSaved,
  initialTitle = 'Sample Post Title',
}) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, title: initialTitle },
  });

  const Component = () => (
    <Theme>
      <Box p="4" style={{ maxWidth: '700px', backgroundColor: 'var(--color-panel-solid)' }}>
        <FormProvider {...methods}>
          <EditorUIStateProvider initialTitleEditing={isNewEntry}>
            <EditorHeader
              entryType={entryType}
              isNewEntry={isNewEntry}
              isSaved={isSaved}
              onSaveDraft={() => console.log('Save Draft clicked')}
              onPublish={() => console.log('Publish clicked')}
            />
          </EditorUIStateProvider>
        </FormProvider>
      </Box>
    </Theme>
  );

  const router = createMemoryRouter([
    {
      path: '/',
      element: <Component />,
    },
  ]);

  return <RouterProvider router={router} />;
};

const meta: Meta<typeof HeaderStoryWrapper> = {
  title: 'Editor/Subcomponents/EditorHeader',
  component: HeaderStoryWrapper,
};

export default meta;
type Story = StoryObj<typeof HeaderStoryWrapper>;

export const NewPostDraft: Story = {
  args: {
    entryType: 'post',
    isNewEntry: true,
    isSaved: false,
    initialTitle: '',
  },
};

export const SavedPage: Story = {
  args: {
    entryType: 'page',
    isNewEntry: false,
    isSaved: true,
    initialTitle: 'About Our Company',
  },
};

export const UnsavedDoc: Story = {
  args: {
    entryType: 'doc',
    isNewEntry: false,
    isSaved: false,
    initialTitle: 'REST API Documentation',
  },
};
