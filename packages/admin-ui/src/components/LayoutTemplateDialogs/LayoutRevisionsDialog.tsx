import React from 'react';
import { Dialog, Button, Flex, Text, Table, Badge, ScrollArea } from '@radix-ui/themes';
import { CounterClockwiseClockIcon } from '@radix-ui/react-icons';
import type { LayoutTemplateRevision } from '../../types/layoutTemplate';

export interface LayoutRevisionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  revisions: LayoutTemplateRevision[];
  isLoading: boolean;
  onRestore: (revId: string) => void;
  isSaving: boolean;
}

export const LayoutRevisionsDialog: React.FC<LayoutRevisionsDialogProps> = ({
  open,
  onOpenChange,
  revisions,
  isLoading,
  onRestore,
  isSaving,
}) => {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content style={{ maxWidth: 650 }}>
        <Dialog.Title>
          <Flex align="center" gap="2">
            <CounterClockwiseClockIcon />
            Revision History
          </Flex>
        </Dialog.Title>
        <Dialog.Description size="2" mb="3">
          Restore previous snapshots of this layout template and its styles.
        </Dialog.Description>

        <ScrollArea type="auto" scrollbars="vertical" style={{ maxHeight: 350 }}>
          {isLoading ? (
            <Text color="gray">Loading revision history...</Text>
          ) : revisions.length === 0 ? (
            <Text color="gray">No previous revisions recorded yet.</Text>
          ) : (
            <Table.Root variant="surface">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Saved At</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>HTML Size</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>CSS Size</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell align="right">Action</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {revisions.map((rev) => (
                  <Table.Row key={rev.id}>
                    <Table.Cell>
                      <Text size="2" weight="medium">
                        {rev.created_at || 'Automatic snapshot'}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color="gray" variant="soft">
                        {rev.template_html?.length || 0} chars
                      </Badge>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color="gray" variant="soft">
                        {rev.template_css?.length || 0} chars
                      </Badge>
                    </Table.Cell>
                    <Table.Cell align="right">
                      <Button
                        size="1"
                        variant="soft"
                        color="blue"
                        onClick={() => onRestore(rev.id)}
                        disabled={isSaving}
                        data-testid={`restore-rev-${rev.id}`}
                      >
                        Restore
                      </Button>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Root>
          )}
        </ScrollArea>

        <Flex gap="3" justify="end" mt="4">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
