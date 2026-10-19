import React from 'react';
import { Box, Flex, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { FormProvider } from 'react-hook-form';
import { UnsavedChangesDialog } from '../../components/UnsavedChangesDialog';
import {
  SettingsHeader,
  GeneralSettingsCard,
  BrandingSettingsCard,
  AnalyticsSettingsCard,
  DocsSettingsCard,
  EdgeEnvironmentCard,
} from './components';
import { useSettingsData, useSettingsForm } from './hooks';
import type { SettingsProps } from './types';

export const Settings: React.FC<SettingsProps> = () => {
  const { data: settingsData, isLoading, isSaving, saveSettings, invalidate } = useSettingsData();
  const {
    methods,
    blocker,
    isDirty,
    saved,
    error,
    handleSave,
  } = useSettingsForm(settingsData, saveSettings, invalidate);

  if (isLoading) {
    return (
      <Box style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        Loading settings...
      </Box>
    );
  }

  return (
    <FormProvider {...methods}>
      <Box>
        <SettingsHeader
          onSave={handleSave}
          isSaving={isSaving}
          isSaved={saved}
          isDirty={isDirty}
        />

        {error && (
          <Callout.Root color="red" size="2" mb="4">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>{error}</Callout.Text>
          </Callout.Root>
        )}

        <Flex direction="column" gap="4">
          <GeneralSettingsCard />
          <BrandingSettingsCard />
          <AnalyticsSettingsCard />
          <DocsSettingsCard />
          <EdgeEnvironmentCard />
        </Flex>

        <UnsavedChangesDialog blocker={blocker} />
      </Box>
    </FormProvider>
  );
};

export default Settings;
