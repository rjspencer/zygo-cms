import React from 'react';
import { Popover, IconButton, Box, Text } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import ReactMarkdown from 'react-markdown';

interface AiContextInstructionsProps {
  instructions: string;
}

export const AiContextInstructions: React.FC<AiContextInstructionsProps> = ({ instructions }) => {
  return (
    <Box>
      <Popover.Root>
        <Popover.Trigger>
          <IconButton variant="ghost" color="gray" size="2" aria-label="Developer Context">
            <InfoCircledIcon width="18" height="18" />
          </IconButton>
        </Popover.Trigger>
        <Popover.Content width="360px">
          <Text size="2" weight="bold" mb="2" style={{ display: 'block' }}>
            Developer Context
          </Text>
          <Box style={{ fontSize: '13px', color: 'var(--gray-11)' }}>
            <ReactMarkdown>{instructions}</ReactMarkdown>
          </Box>
        </Popover.Content>
      </Popover.Root>
    </Box>
  );
};
