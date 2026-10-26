import React from 'react';
import { Card, Flex, Box, Heading, Text, Switch, TextField } from '@radix-ui/themes';
import { Controller, useFormContext } from 'react-hook-form';
import type { SettingsFormValues } from '../types';

export const AnalyticsSettingsCard: React.FC = () => {
  const { control, register } = useFormContext<SettingsFormValues>();

  return (
    <Card size="2">
      <Flex justify="between" align="center" gap="4" mb="4">
        <Box style={{ flex: 1 }}>
          <Heading size="3" mb="1">
            Cloudflare Web Analytics
          </Heading>
          <Text id="settings-analytics-description" size="2" color="gray">
            Enable pageview tracking using Cloudflare's privacy-first web analytics. Requires CF_API_TOKEN, CF_ZONE_ID, and CF_ACCOUNT_ID in worker secrets.
          </Text>
        </Box>

        <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
          <Controller
            control={control}
            name="analyticsEnabled"
            render={({ field }) => (
              <Switch
                id="settings-analytics-switch"
                aria-describedby="settings-analytics-description"
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            )}
          />
          <Text as="label" htmlFor="settings-analytics-switch" size="2">
            Enable Web Analytics
          </Text>
        </Flex>
      </Flex>

      <Box>
        <Text as="label" htmlFor="settings-analytics-site-tag" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
          Cloudflare Web Analytics Site Tag / Token
        </Text>
        <TextField.Root
          id="settings-analytics-site-tag"
          aria-describedby="settings-analytics-site-tag-desc"
          {...register('analyticsSiteTag')}
          placeholder="e.g. a1b2c3d4e5f6g7h8i9j0..."
        />
        <Text id="settings-analytics-site-tag-desc" size="1" color="gray" mt="1" style={{ display: 'block' }}>
          Obtained from the Cloudflare Dashboard (Analytics & Logs → Web Analytics). Used to inject the privacy-first RUM beacon on public pages.
        </Text>
      </Box>
    </Card>
  );
};
