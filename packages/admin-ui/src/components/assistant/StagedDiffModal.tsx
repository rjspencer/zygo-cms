import React from 'react';
import {
  Dialog,
  Flex,
  Box,
  Heading,
  Text,
  Badge,
  Button,
  Card,
} from '@radix-ui/themes';

export interface StagedDiffModalProps {
  open: boolean;
  title: string;
  description?: string;
  fieldLabel: string;
  beforeText: string;
  afterText: string;
  onAccept: () => void;
  onReject: () => void;
}

export const StagedDiffModal: React.FC<StagedDiffModalProps> = ({
  open,
  title,
  description,
  fieldLabel,
  beforeText,
  afterText,
  onAccept,
  onReject,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => { if (!isOpen) onReject(); }}>
      <Dialog.Content maxWidth="720px">
        <Dialog.Title>{title}</Dialog.Title>
        {description && (
          <Dialog.Description size="2" color="gray" mb="3">
            {description}
          </Dialog.Description>
        )}

        <Flex align="center" gap="2" my="3">
          <Text size="2" weight="medium" color="gray">
            Field:
          </Text>
          <Badge variant="outline" color="indigo">
            {fieldLabel}
          </Badge>
        </Flex>

        <Flex direction={{ initial: 'column', sm: 'row' }} gap="4" my="3">
          {/* Current / Before Pane */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap="2" mb="2">
              <Heading size="2" as="h4">
                Current (Before)
              </Heading>
              <Badge color="gray" variant="soft" size="1">
                Original
              </Badge>
            </Flex>
            <Card variant="surface" style={{ backgroundColor: 'var(--gray-a2)' }}>
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
                {beforeText ? (
                  beforeText
                ) : (
                  <Text size="2" color="gray">
                    <em>(empty)</em>
                  </Text>
                )}
              </Box>
            </Card>
          </Box>

          {/* Proposed / After Pane */}
          <Box style={{ flex: 1, minWidth: 0 }}>
            <Flex align="center" gap="2" mb="2">
              <Heading size="2" as="h4">
                Proposed (After)
              </Heading>
              <Badge color="cyan" variant="soft" size="1">
                Modified
              </Badge>
            </Flex>
            <Card
              variant="surface"
              style={{
                backgroundColor: 'var(--cyan-a2)',
                borderColor: 'var(--cyan-a6)',
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
                {afterText ? (
                  afterText
                ) : (
                  <Text size="2" color="gray">
                    <em>(empty)</em>
                  </Text>
                )}
              </Box>
            </Card>
          </Box>
        </Flex>

        <Flex justify="end" gap="3" mt="4">
          <Button variant="soft" color="gray" onClick={onReject}>
            Reject Changes
          </Button>
          <Button variant="solid" color="cyan" onClick={onAccept}>
            Accept Changes
          </Button>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default StagedDiffModal;
