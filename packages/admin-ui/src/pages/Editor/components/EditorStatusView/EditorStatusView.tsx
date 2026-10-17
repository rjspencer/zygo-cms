import React from 'react';
import { Box, Button, Callout, Flex, Spinner, Text } from '@radix-ui/themes';
import { BackButton } from '../../../../components/BackButton';

export interface EditorStatusViewProps {
  status: 'loading' | 'error';
  errorMessage?: string;
  onRetry?: () => void;
}

export const EditorStatusView: React.FC<EditorStatusViewProps> = ({ status, errorMessage, onRetry }) => {
  if (status === 'loading') {
    return (
      <Flex role="status" aria-live="polite" align="center" justify="center" direction="column" gap="3" p="6">
        <Spinner size="3" />
        <Text size="3" color="gray">
          Loading entry...
        </Text>
      </Flex>
    );
  }

  return (
    <Box p="4">
      <BackButton />
      <Callout.Root color="red" role="alert" mt="4">
        <Callout.Text>Failed to load entry{errorMessage ? `: ${errorMessage}` : ''}</Callout.Text>
        {onRetry && (
          <Button variant="soft" color="red" size="2" mt="3" onClick={onRetry}>
            Retry
          </Button>
        )}
      </Callout.Root>
    </Box>
  );
};

export default EditorStatusView;
