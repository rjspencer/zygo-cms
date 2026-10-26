import React from 'react';
import { Table, Badge, IconButton, Flex, Text, Box, Tooltip } from '@radix-ui/themes';
import {
  EnvelopeClosedIcon,
  EnvelopeOpenIcon,
  TrashIcon,
} from '@radix-ui/react-icons';
import type { FormSubmission, SubmissionStatus } from '../types';

export interface SubmissionsTableProps {
  submissions: FormSubmission[];
  isLoading?: boolean;
  onSelectSubmission: (submission: FormSubmission) => void;
  onToggleRead: (id: number, currentStatus: SubmissionStatus) => void;
  onDelete: (id: number) => void;
}

export const SubmissionsTable: React.FC<SubmissionsTableProps> = ({
  submissions,
  isLoading,
  onSelectSubmission,
  onToggleRead,
  onDelete,
}) => {
  if (isLoading) {
    return (
      <Box py="6" style={{ textAlign: 'center' }}>
        <Text color="gray">Loading submissions...</Text>
      </Box>
    );
  }

  if (submissions.length === 0) {
    return (
      <Box py="8" style={{ textAlign: 'center' }}>
        <Text color="gray">No submissions found.</Text>
      </Box>
    );
  }

  return (
    <Table.Root variant="surface" data-testid="submissions-table">
      <Table.Header>
        <Table.Row>
          <Table.ColumnHeaderCell style={{ width: '90px' }}>Status</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Sender</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell>Form / Subject</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: '180px' }}>Date</Table.ColumnHeaderCell>
          <Table.ColumnHeaderCell style={{ width: '120px', textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
        </Table.Row>
      </Table.Header>
      <Table.Body>
        {submissions.map((item) => {
          const isUnread = item.status === 'unread';
          const toggleLabel = isUnread ? 'Mark as read' : 'Mark as unread';

          return (
            <Table.Row
              key={item.id}
              data-testid={`submission-row-${item.id}`}
              style={{
                cursor: 'pointer',
                fontWeight: isUnread ? 600 : 400,
                backgroundColor: isUnread ? 'var(--accent-a2)' : undefined,
              }}
              onClick={() => onSelectSubmission(item)}
            >
              <Table.Cell>
                <Badge
                  color={
                    item.status === 'unread'
                      ? 'blue'
                      : item.status === 'read'
                      ? 'gray'
                      : 'amber'
                  }
                  variant={isUnread ? 'solid' : 'soft'}
                  size="1"
                >
                  {item.status}
                </Badge>
              </Table.Cell>
              <Table.Cell>
                <Flex direction="column">
                  <Text size="2" weight={isUnread ? 'bold' : 'medium'}>
                    {item.sender_name || item.sender_email}
                  </Text>
                  {item.sender_name && (
                    <Text size="1" color="gray">
                      {item.sender_email}
                    </Text>
                  )}
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Flex direction="column">
                  <Flex align="center" gap="2">
                    <Badge variant="outline" color="purple" size="1">
                      {item.form_name}
                    </Badge>
                    <Text
                      size="2"
                      style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '320px',
                      }}
                    >
                      {(item.subject || item.message || '').slice(0, 60) || '—'}
                    </Text>
                  </Flex>
                </Flex>
              </Table.Cell>
              <Table.Cell>
                <Text size="1" color="gray">
                  {new Date(item.created_at).toLocaleString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </Text>
              </Table.Cell>
              <Table.Cell onClick={(e) => e.stopPropagation()}>
                <Flex justify="end" gap="2">
                  <Tooltip content={toggleLabel}>
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="gray"
                      aria-label={toggleLabel}
                      data-testid={`submission-toggle-read-${item.id}`}
                      onClick={() => onToggleRead(item.id, item.status)}
                    >
                      {isUnread ? (
                        <EnvelopeOpenIcon width="16" height="16" />
                      ) : (
                        <EnvelopeClosedIcon width="16" height="16" />
                      )}
                    </IconButton>
                  </Tooltip>
                  <Tooltip content="Delete submission">
                    <IconButton
                      size="1"
                      variant="ghost"
                      color="red"
                      aria-label="Delete submission"
                      data-testid={`submission-delete-${item.id}`}
                      onClick={() => onDelete(item.id)}
                    >
                      <TrashIcon width="16" height="16" />
                    </IconButton>
                  </Tooltip>
                </Flex>
              </Table.Cell>
            </Table.Row>
          );
        })}
      </Table.Body>
    </Table.Root>
  );
};
