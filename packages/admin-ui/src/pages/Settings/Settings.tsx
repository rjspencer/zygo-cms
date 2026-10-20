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
  AiCrawlSettingsCard,
  DocsSettingsCard,
  EdgeEnvironmentCard,
  CacheSettingsCard,
} from './components';
import { useSettingsData, useSettingsForm } from './hooks';
import type { SettingsProps } from './types';

export const Settings: React.FC<SettingsProps> = () => {
  const {
    data: settingsData,
    isLoading,
    aiCrawlData,
    isSaving,
    saveSettings,
    saveAiCrawlSettings,
    invalidate,
    clearCache,
    isClearingCache,
    clearCacheSuccess,
    clearCacheError,
  } = useSettingsData();

  const {
    methods,
    blocker,
    isDirty,
    saved,
    error,
    handleSave,
  } = useSettingsForm(settingsData, saveSettings, invalidate, aiCrawlData, saveAiCrawlSettings);

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
          <AiCrawlSettingsCard configured={aiCrawlData?.configured ?? false} />
          <DocsSettingsCard />
          <CacheSettingsCard
            onClear={() => clearCache()}
            isClearing={isClearingCache}
            isSuccess={clearCacheSuccess}
            errorMessage={clearCacheError}
          />
          <EdgeEnvironmentCard />
        </Flex>

        <UnsavedChangesDialog blocker={blocker} />
      </Box>
    </FormProvider>
  );
};

export default Settings;
