import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EditorUIStateProvider } from '../../context/EditorUIStateContext';
import { EditorHeader } from './EditorHeader';

interface HeaderStoryWrapperProps {
  entryType: EntryType;
  isNewEntry: boolean;
  isSaved: boolean;
  status: EntryStatus;
  role: string;
  initialTitle?: string;
}

const createQueryClient = (role: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  queryClient.setQueryData(['me'], { role });
  return queryClient;
};

const HeaderStoryWrapper: React.FC<HeaderStoryWrapperProps> = ({
  entryType,
  isNewEntry,
  isSaved,
  status,
  role,
  initialTitle = 'Sample Post Title',
}) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, title: initialTitle, status },
  });

  const queryClient = createQueryClient(role);

  const Component = () => (
    <Theme>
      <QueryClientProvider client={queryClient}>
        <Box p="4" style={{ maxWidth: '700px', backgroundColor: 'var(--color-panel-solid)' }}>
          <FormProvider {...methods}>
            <EditorUIStateProvider initialTitleEditing={isNewEntry}>
              <EditorHeader
                entryType={entryType}
                isNewEntry={isNewEntry}
                isSaved={isSaved}
                onSaveDraft={() => console.log('Save Draft clicked')}
                onPublish={() => console.log('Publish clicked')}
                userRole={role}
              />
            </EditorUIStateProvider>
          </FormProvider>
        </Box>
      </QueryClientProvider>
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

export const AuthorDraftPost: Story = {
  args: {
    entryType: 'post',
    isNewEntry: true,
    isSaved: false,
    status: 'draft',
    role: 'author',
    initialTitle: 'New Article Draft',
  },
};

export const AuthorInReviewPost: Story = {
  args: {
    entryType: 'post',
    isNewEntry: false,
    isSaved: true,
    status: 'in_review',
    role: 'author',
    initialTitle: 'Article Pending Review',
  },
};

export const EditorInReviewPost: Story = {
  args: {
    entryType: 'post',
    isNewEntry: false,
    isSaved: true,
    status: 'in_review',
    role: 'editor',
    initialTitle: 'Post Awaiting Editorial Approval',
  },
};

export const EditorReadyForPublishPage: Story = {
  args: {
    entryType: 'page',
    isNewEntry: false,
    isSaved: true,
    status: 'ready_for_publish',
    role: 'editor',
    initialTitle: 'Landing Page Ready to Ship',
  },
};

export const EditorPublishedPage: Story = {
  args: {
    entryType: 'page',
    isNewEntry: false,
    isSaved: true,
    status: 'published',
    role: 'editor',
    initialTitle: 'Live Company Page',
  },
};

export const AdminArchivedDoc: Story = {
  args: {
    entryType: 'doc',
    isNewEntry: false,
    isSaved: true,
    status: 'archived',
    role: 'admin',
    initialTitle: 'Deprecated API v1 Docs',
  },
};
