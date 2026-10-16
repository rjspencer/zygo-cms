import React from 'react';
import { Box, Flex, Heading, Badge, Card, Text } from '@radix-ui/themes';
import type { DiffPaneProps } from '../../types';

export const DiffPane: React.FC<DiffPaneProps> = ({
  title,
  badgeLabel,
  badgeColor = 'gray',
  text,
  isModified = false,
}) => {
  return (
    <Box style={{ flex: 1, minWidth: 0 }}>
      <Flex align="center" gap="2" mb="2">
        <Heading size="2" as="h4">
          {title}
        </Heading>
        <Badge color={badgeColor} variant="soft" size="1">
          {badgeLabel}
        </Badge>
      </Flex>
      <Card
        variant="surface"
        style={{
          backgroundColor: isModified ? 'var(--cyan-a2)' : 'var(--gray-a2)',
          borderColor: isModified ? 'var(--cyan-a6)' : undefined,
        }}
      >
        <Box
          p="2"
          style={{
            maxHeight: '260px',
            overflowY: 'auto',
            fontFamily: 'monospace',
            fontSize: '13px',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {text ? (
            text
          ) : (
            <Text size="2" color="gray">
              <em>(empty)</em>
            </Text>
          )}
        </Box>
      </Card>
    </Box>
  );
};

export default DiffPane;
