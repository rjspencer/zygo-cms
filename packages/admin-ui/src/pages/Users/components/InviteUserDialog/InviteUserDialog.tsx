import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Flex,
  Box,
  Text,
  TextField,
  Select,
  Button,
  Callout,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import type { InviteUserPayload } from '../../types';

interface InviteUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (payload: InviteUserPayload) => void;
  isPending: boolean;
  error: string | null;
}

export const InviteUserDialog: React.FC<InviteUserDialogProps> = ({
  open,
  onOpenChange,
  onSubmit,
  isPending,
  error,
}) => {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteDisplayName, setInviteDisplayName] = useState('');
  const [inviteRole, setInviteRole] = useState('author');

  useEffect(() => {
    if (open) {
      setInviteEmail('');
      setInviteDisplayName('');
      setInviteRole('author');
    }
  }, [open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    onSubmit({
      email: inviteEmail.trim(),
      display_name: inviteDisplayName.trim() || undefined,
      role: inviteRole,
    });
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="480px">
        <form onSubmit={handleSubmit}>
          <Dialog.Title>Invite User</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Invite a new member to access Zygo CMS with designated permissions.
          </Dialog.Description>

          {error && (
            <Callout.Root id="invite-user-error-alert" role="alert" color="red" size="1" mb="3">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="3" mb="4">
            <Box>
              <Text as="label" htmlFor="invite-user-email-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Email Address *
              </Text>
              <TextField.Root
                id="invite-user-email-input"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? 'invite-user-error-alert' : undefined}
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </Box>

            <Box>
              <Text as="label" htmlFor="invite-user-display-name-input" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Display Name
              </Text>
              <TextField.Root
                id="invite-user-display-name-input"
                placeholder="e.g. Jane Doe"
                value={inviteDisplayName}
                onChange={(e) => setInviteDisplayName(e.target.value)}
              />
            </Box>

            <Box>
              <Text id="invite-user-role-label" as="label" htmlFor="invite-user-role-trigger" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Role
              </Text>
              <Select.Root value={inviteRole} onValueChange={setInviteRole}>
                <Select.Trigger id="invite-user-role-trigger" style={{ width: '100%' }} aria-label="Select role" />
                <Select.Content>
                  <Select.Item value="admin">Admin</Select.Item>
                  <Select.Item value="editor">Editor</Select.Item>
                  <Select.Item value="author">Author</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>
          </Flex>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" disabled={isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              variant="solid"
              color="cyan"
              type="submit"
              disabled={isPending || !inviteEmail.trim()}
            >
              {isPending ? 'Inviting...' : 'Invite User'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
