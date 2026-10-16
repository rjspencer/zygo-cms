import React from 'react';
import { Table, Text, Flex, IconButton, Button } from '@radix-ui/themes';
import { CopyIcon, TrashIcon, CheckIcon } from '@radix-ui/react-icons';
import { QRCodeDialog } from '../../../QRCodeDialog';
import type { TrackableLinksTableProps } from '../../types';

export const TrackableLinksTable: React.FC<TrackableLinksTableProps> = ({
  links,
  isLoading,
  copiedLink,
  onCopy,
  onDelete,
  isDeleting,
  constructFullUrl,
}) => {
  if (isLoading) {
    return <Text color="gray">Loading links...</Text>;
  }

  if (links.length === 0) {
    return <Text color="gray" size="2">No trackable links created yet.</Text>;
  }

  return (
    <Table.Root variant="surface">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Parameters</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell align="right">Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {links.map((link) => {
          const fullUrl = constructFullUrl(link.url_params);
          return (
            <Table.Row key={link.id} align="center">
              <Table.RowHeaderCell>{link.name}</Table.RowHeaderCell>
              <Table.Cell>
                <Text size="1" color="gray" style={{ wordBreak: 'break-all' }}>
                  ?{link.url_params}
                </Text>
              </Table.Cell>
              <Table.Cell>
                <Flex gap="2" justify="end" align="center">
                  <IconButton
                    size="1"
                    variant="soft"
                    onClick={() => onCopy(fullUrl)}
                    title="Copy URL"
                    aria-label={`Copy link ${link.name}`}
                  >
                    {copiedLink === fullUrl ? <CheckIcon color="green" /> : <CopyIcon />}
                  </IconButton>
                  <QRCodeDialog url={fullUrl} trigger={<Button size="1" variant="soft">QR Code</Button>} />
                  <IconButton
                    size="1"
                    variant="soft"
                    color="red"
                    onClick={() => onDelete(link.id)}
                    disabled={isDeleting}
                    aria-label={`Delete link ${link.name}`}
                  >
                    <TrashIcon />
                  </IconButton>
                </Flex>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
};

export default TrackableLinksTable;
