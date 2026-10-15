import React from 'react';
import { Card, Flex, Box, Heading, Text, Switch } from '@radix-ui/themes';
import { Controller, useFormContext } from 'react-hook-form';
import type { SettingsFormValues } from '../types';

export const AnalyticsSettingsCard: React.FC = () => {
  const { control } = useFormContext<SettingsFormValues>();

  return (
    <Card size="2">
      <Flex justify="between" align="center" gap="4">
        <Box style={{ flex: 1 }}>
          <Heading size="3" mb="1">
            Cloudflare Web Analytics
          </Heading>
          <Text size="2" color="gray">
            Enable pageview tracking using Cloudflare's privacy-first web analytics. You must also configure CF_API_TOKEN and CF_ZONE_ID in your worker secrets.
          </Text>
        </Box>

        <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
          <Controller
            control={control}
            name="analyticsEnabled"
            render={({ field }) => (
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Text size="2">Enable Web Analytics</Text>
        </Flex>
      </Flex>
    </Card>
  );
};
