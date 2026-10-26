import React, { useEffect, useState } from 'react';
import { Dialog, Box, Flex, TextArea, Button } from '@radix-ui/themes';
import { CheckIcon, ClipboardCopyIcon } from '@radix-ui/react-icons';
import type { InvitedUserForEmail } from '../../types';
import { generateInviteEmailTemplate } from '../../utils';

interface UserInvitedDialogProps {
  invitedUser: InvitedUserForEmail | null;
  onClose: () => void;
}

export const UserInvitedDialog: React.FC<UserInvitedDialogProps> = ({
  invitedUser,
  onClose,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const emailTemplate = invitedUser ? generateInviteEmailTemplate(invitedUser) : '';

  useEffect(() => {
    if (!copiedEmail) return;
    const timer = setTimeout(() => {
      if (typeof window !== 'undefined') setCopiedEmail(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, [copiedEmail]);

  const handleCopyEmailTemplate = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(emailTemplate);
        setCopiedEmail(true);
      }
    } catch {
      // Fallback
    }
  };

  return (
    <Dialog.Root
      open={invitedUser !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Dialog.Content style={{ maxWidth: 520 }}>
        <Dialog.Title>User Invited</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          The user has been added. You can copy and send them the pre-written invitation email below:
        </Dialog.Description>

        <Box mb="4">
          <TextArea
            rows={9}
            readOnly
            value={emailTemplate}
            style={{
              fontFamily: 'monospace',
              fontSize: '12px',
              resize: 'none',
              width: '100%',
            }}
            aria-label="Invitation Email Template"
          />
        </Box>

        <Flex gap="3" justify="between" align="center">
          <Button
            variant="surface"
            color={copiedEmail ? 'green' : 'cyan'}
            type="button"
            onClick={handleCopyEmailTemplate}
          >
            {copiedEmail ? (
              <>
                <CheckIcon width="18" height="18" /> Copied!
              </>
            ) : (
              <>
                <ClipboardCopyIcon width="18" height="18" /> Copy Template
              </>
            )}
          </Button>

          <Dialog.Close>
            <Button
              variant="solid"
              color="gray"
              type="button"
              onClick={onClose}
            >
              Done
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};
