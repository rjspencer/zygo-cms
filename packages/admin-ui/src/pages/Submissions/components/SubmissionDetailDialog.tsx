import React from 'react';
import { Dialog, Flex, Box, Text, Button, Badge, Separator, Card } from '@radix-ui/themes';
import { PersonIcon } from '@radix-ui/react-icons';
import type { FormSubmission, SubmissionStatus } from '../types';

export interface SubmissionDetailDialogProps {
  submission: FormSubmission | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusChange?: (id: number, status: SubmissionStatus) => void;
  onDelete?: (id: number) => void;
}

export const SubmissionDetailDialog: React.FC<SubmissionDetailDialogProps> = ({
  submission,
  open,
  onOpenChange,
  onStatusChange,
  onDelete,
}) => {
  if (!submission) return null;

  let parsedMetadata: Record<string, unknown> | null = null;
  if (submission.metadata_json) {
    try {
      const parsed = JSON.parse(submission.metadata_json);
      if (typeof parsed === 'object' && parsed !== null) {
        parsedMetadata = parsed;
      }
    } catch {
      // invalid JSON, ignore
    }
  }

  // Sanitize mailto link using encodeURIComponent
  const safeMailto = `mailto:${encodeURIComponent(submission.sender_email)}${
    submission.subject ? `?subject=${encodeURIComponent('Re: ' + submission.subject)}` : ''
  }`;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        maxWidth="650px"
        data-testid="submission-detail-modal"
        aria-label="Submission details"
      >
        <Flex justify="between" align="center" mb="3">
          <Flex align="center" gap="2">
            <Dialog.Title style={{ marginBottom: 0 }}>
              {submission.subject || `Submission #${submission.id}`}
            </Dialog.Title>
            <Badge
              color={
                submission.status === 'unread'
                  ? 'blue'
                  : submission.status === 'read'
                  ? 'gray'
                  : 'amber'
              }
              variant="soft"
            >
              {submission.status.toUpperCase()}
            </Badge>
          </Flex>
          <Badge variant="outline" color="purple">
            {submission.form_name}
          </Badge>
        </Flex>

        <Dialog.Description size="2" color="gray" mb="4">
          Received on {new Date(submission.created_at).toLocaleString()}
          {submission.page_path ? ` from ${submission.page_path}` : ''}
        </Dialog.Description>

        <Flex direction="column" gap="4">
          <Card variant="surface">
            <Flex direction="column" gap="2">
              <Flex align="center" gap="2">
                <PersonIcon width="16" height="16" />
                <Text size="2" weight="bold">
                  {submission.sender_name || 'Anonymous'}
                </Text>
              </Flex>
              <Text size="2">
                Email:{' '}
                <a
                  href={safeMailto}
                  style={{ color: 'var(--accent-11)', textDecoration: 'underline' }}
                >
                  {submission.sender_email}
                </a>
              </Text>
            </Flex>
          </Card>

          <Box>
            <Text size="2" weight="bold" color="gray" mb="1" as="div">
              Message Content
            </Text>
            {/* Safe React JSX text rendering with CSS whiteSpace: 'pre-wrap' (strictly NO dangerouslySetInnerHTML) */}
            <Box
              p="3"
              style={{
                backgroundColor: 'var(--gray-a3)',
                borderRadius: 'var(--radius-2)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontSize: '14px',
                lineHeight: '1.6',
              }}
            >
              {submission.message}
            </Box>
          </Box>

          {parsedMetadata && Object.keys(parsedMetadata).length > 0 && (
            <Box>
              <Text size="2" weight="bold" color="gray" mb="1" as="div">
                Additional Metadata
              </Text>
              <Box
                p="3"
                style={{
                  backgroundColor: 'var(--gray-a2)',
                  borderRadius: 'var(--radius-2)',
                  fontSize: '12px',
                }}
              >
                {Object.entries(parsedMetadata).map(([key, value]) => (
                  <Flex key={key} gap="2" mb="1">
                    <Text weight="bold" size="1">
                      {key}:
                    </Text>
                    <Text size="1">{String(value)}</Text>
                  </Flex>
                ))}
              </Box>
            </Box>
          )}
        </Flex>

        <Separator size="4" my="4" />

        <Flex justify="between" align="center">
          <Flex gap="2">
            {submission.status === 'unread' ? (
              <Button
                variant="outline"
                size="2"
                onClick={() => {
                  onStatusChange?.(submission.id, 'read');
                  onOpenChange(false);
                }}
              >
                Mark as Read
              </Button>
            ) : (
              <Button
                variant="outline"
                size="2"
                onClick={() => {
                  onStatusChange?.(submission.id, 'unread');
                  onOpenChange(false);
                }}
              >
                Mark as Unread
              </Button>
            )}
            {submission.status !== 'archived' && (
              <Button
                variant="soft"
                color="gray"
                size="2"
                onClick={() => {
                  onStatusChange?.(submission.id, 'archived');
                  onOpenChange(false);
                }}
              >
                Archive
              </Button>
            )}
            {onDelete && (
              <Button
                variant="soft"
                color="red"
                size="2"
                onClick={() => {
                  onDelete(submission.id);
                  onOpenChange(false);
                }}
              >
                Delete
              </Button>
            )}
          </Flex>

          <Dialog.Close>
            <Button variant="solid" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
