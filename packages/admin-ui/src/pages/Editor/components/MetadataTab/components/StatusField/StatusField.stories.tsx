import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { EntryFormValues, EntryStatus } from '../../../../types';
import { EMPTY_FORM_VALUES } from '../../../../utils/entryForm';
import { StatusField } from './StatusField';

interface StatusFieldStoryProps {
  status: EntryStatus;
  role: string;
}

const createQueryClient = (role: string) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });
  queryClient.setQueryData(['me'], { role });
  return queryClient;
};

const StatusFieldStoryWrapper: React.FC<StatusFieldStoryProps> = ({ status, role }) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, status },
  });

  const queryClient = createQueryClient(role);

  return (
    <Theme>
      <QueryClientProvider client={queryClient}>
        <Box p="4" style={{ maxWidth: '400px', backgroundColor: 'var(--color-panel-solid)' }}>
          <FormProvider {...methods}>
            <StatusField />
          </FormProvider>
        </Box>
      </QueryClientProvider>
    </Theme>
  );
};

const meta: Meta<typeof StatusFieldStoryWrapper> = {
  title: 'Editor/Subcomponents/StatusField',
  component: StatusFieldStoryWrapper,
};

export default meta;
type Story = StoryObj<typeof StatusFieldStoryWrapper>;

export const AuthorDraft: Story = {
  args: {
    status: 'draft',
    role: 'author',
  },
};

export const AuthorInReview: Story = {
  args: {
    status: 'in_review',
    role: 'author',
  },
};

export const EditorDraft: Story = {
  args: {
    status: 'draft',
    role: 'editor',
  },
};

export const EditorReadyForPublish: Story = {
  args: {
    status: 'ready_for_publish',
    role: 'editor',
  },
};

export const EditorPublished: Story = {
  args: {
    status: 'published',
    role: 'editor',
  },
};

export const AdminArchived: Story = {
  args: {
    status: 'archived',
    role: 'admin',
  },
};
