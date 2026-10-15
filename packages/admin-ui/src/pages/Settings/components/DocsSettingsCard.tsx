import React from 'react';
import { Card, Flex, Box, Heading, Text, Switch, TextField } from '@radix-ui/themes';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import type { SettingsFormValues } from '../types';

export const DocsSettingsCard: React.FC = () => {
  const { control, register } = useFormContext<SettingsFormValues>();
  const docsModeEnabled = useWatch({ control, name: 'docsModeEnabled' });

  return (
    <Card size="2">
      <Flex justify="between" align="center" gap="4" mb={docsModeEnabled ? '4' : '0'}>
        <Box style={{ flex: 1 }}>
          <Heading size="3" mb="1">
            Docs Mode
          </Heading>
          <Text size="2" color="gray">
            Enable product documentation features including tree navigation and table of contents
          </Text>
        </Box>

        <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
          <Controller
            control={control}
            name="docsModeEnabled"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Text size="2">Enable Docs Mode</Text>
        </Flex>
      </Flex>

      {docsModeEnabled && (
        <Box mb="2">
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Docs Base Path
          </Text>
          <TextField.Root
            {...register('docsPath')}
            placeholder="/docs"
          />
          <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
            The path where the documentation will be served. E.g., /docs
          </Text>
        </Box>
      )}
    </Card>
  );
};
