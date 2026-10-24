import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import '@radix-ui/themes/styles.css';
import { Box, Theme } from '@radix-ui/themes';
import { FormProvider, useForm } from 'react-hook-form';
import type { EntryFormValues, EntryStatus, EntryType } from '../../types';
import { EMPTY_FORM_VALUES } from '../../utils/entryForm';
import { EntryBadges } from './EntryBadges';

interface EntryBadgesStoryProps {
  entryType: EntryType;
  status: EntryStatus;
  isSaved: boolean;
}

const EntryBadgesWrapper: React.FC<EntryBadgesStoryProps> = ({ entryType, status, isSaved }) => {
  const methods = useForm<EntryFormValues>({
    defaultValues: { ...EMPTY_FORM_VALUES, status },
  });

  return (
    <Theme>
      <Box p="4" style={{ maxWidth: '400px', backgroundColor: 'var(--color-panel-solid)' }}>
        <FormProvider {...methods}>
          <EntryBadges entryType={entryType} isSaved={isSaved} />
        </FormProvider>
      </Box>
    </Theme>
  );
};

const meta: Meta<typeof EntryBadgesWrapper> = {
  title: 'Editor/Subcomponents/EntryBadges',
  component: EntryBadgesWrapper,
};

export default meta;
type Story = StoryObj<typeof EntryBadgesWrapper>;

export const DraftPost: Story = {
  args: {
    entryType: 'post',
    status: 'draft',
    isSaved: false,
  },
};

export const InReviewPage: Story = {
  args: {
    entryType: 'page',
    status: 'in_review',
    isSaved: true,
  },
};

export const ReadyForPublishDoc: Story = {
  args: {
    entryType: 'doc',
    status: 'ready_for_publish',
    isSaved: true,
  },
};

export const PublishedPost: Story = {
  args: {
    entryType: 'post',
    status: 'published',
    isSaved: true,
  },
};

export const ArchivedPost: Story = {
  args: {
    entryType: 'post',
    status: 'archived',
    isSaved: false,
  },
};

export const ScheduledPost: Story = {
  args: {
    entryType: 'post',
    status: 'scheduled',
    isSaved: true,
  },
};
