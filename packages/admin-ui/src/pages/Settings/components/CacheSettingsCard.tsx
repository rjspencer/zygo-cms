import React from 'react';
import { Card, Flex, Box, Heading, Text, Button, Callout } from '@radix-ui/themes';
import { CheckCircledIcon, ExclamationTriangleIcon } from '@radix-ui/react-icons';

export interface CacheSettingsCardProps {
  onClear: () => void;
  isClearing?: boolean;
  isSuccess?: boolean;
  errorMessage?: string | null;
}

export const CacheSettingsCard: React.FC<CacheSettingsCardProps> = ({
  onClear,
  isClearing = false,
  isSuccess = false,
  errorMessage = null,
}) => {
  return (
    <Card size="2" data-testid="cache-settings-card">
      <Flex direction="column" gap="3">
        <Flex justify="between" align="center" wrap="wrap" gap="3">
          <Box style={{ flex: 1, minWidth: '240px' }}>
            <Heading size="3" mb="1">
              Cache
            </Heading>
            <Text id="cache-card-description" size="2" color="gray">
              Purge all cached public pages and force browsers to reload the stylesheet. Use this after a
              code deploy that changes styles, or if the public site looks out of date.
            </Text>
          </Box>
          <Button
            type="button"
            variant="soft"
            color="red"
            onClick={onClear}
            loading={isClearing}
            aria-describedby="cache-card-description"
            data-testid="clear-cache-button"
          >
            Clear Cache
          </Button>
        </Flex>

        {isSuccess && !isClearing && (
          <Callout.Root color="green" size="1" role="status">
            <Callout.Icon>
              <CheckCircledIcon />
            </Callout.Icon>
            <Callout.Text>Cache cleared. Changes may take a few seconds to appear.</Callout.Text>
          </Callout.Root>
        )}

        {errorMessage && (
          <Callout.Root color="red" size="1" role="alert">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>{errorMessage}</Callout.Text>
          </Callout.Root>
        )}
      </Flex>
    </Card>
  );
};
