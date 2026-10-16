import React from 'react';
import { Dialog, Flex, Text, Badge, Button } from '@radix-ui/themes';
import { DiffPane } from './components/DiffPane';
import type { StagedDiffModalProps } from './types';

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
          <DiffPane
            title="Current (Before)"
            badgeLabel="Original"
            badgeColor="gray"
            text={beforeText}
            isModified={false}
          />
          <DiffPane
            title="Proposed (After)"
            badgeLabel="Modified"
            badgeColor="cyan"
            text={afterText}
            isModified={true}
          />
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
