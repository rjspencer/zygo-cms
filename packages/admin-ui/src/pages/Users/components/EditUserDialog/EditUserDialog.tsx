import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Flex,
  Box,
  Text,
  TextField,
  TextArea,
  Select,
  Button,
  Callout,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import type { UserItem, EditUserPayload } from '../../types';

interface EditUserDialogProps {
  user: UserItem | null;
  onClose: () => void;
  onSubmit: (id: number, payload: EditUserPayload) => void;
  isPending: boolean;
  error: string | null;
}

export const EditUserDialog: React.FC<EditUserDialogProps> = ({
  user,
  onClose,
  onSubmit,
  isPending,
  error,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [role, setRole] = useState('author');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [website, setWebsite] = useState('');
  const [bio, setBio] = useState('');

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setRole(user.role || 'author');
      setAvatarUrl(user.avatar_url || '');
      setWebsite(user.website || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    onSubmit(user.id, {
      role,
      display_name: displayName.trim() || null,
      bio: bio.trim() || null,
      website: website.trim() || null,
      avatar_url: avatarUrl.trim() || null,
    });
  };

  return (
    <Dialog.Root open={user !== null} onOpenChange={(open) => !open && onClose()}>
      <Dialog.Content maxWidth="520px">
        <form onSubmit={handleSubmit}>
          <Dialog.Title>Edit User</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Update user details and permissions for {user?.email}.
          </Dialog.Description>

          {error && (
            <Callout.Root color="red" size="1" mb="3">
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{error}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="3" mb="4">
            <Box>
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Display Name
              </Text>
              <TextField.Root
                placeholder="e.g. Jane Doe"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
            </Box>

            <Box>
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Role
              </Text>
              <Select.Root value={role} onValueChange={setRole}>
                <Select.Trigger style={{ width: '100%' }} aria-label="Select role" />
                <Select.Content>
                  <Select.Item value="admin">Admin</Select.Item>
                  <Select.Item value="editor">Editor</Select.Item>
                  <Select.Item value="author">Author</Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>

            <Box>
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Avatar URL
              </Text>
              <TextField.Root
                placeholder="https://example.com/avatar.png"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
              />
            </Box>

            <Box>
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Website
              </Text>
              <TextField.Root
                placeholder="https://example.com"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </Box>

            <Box>
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Bio
              </Text>
              <TextArea
                placeholder="Short bio about the user..."
                value={bio}
                onChange={(e) => setBio(e.target.value)}
              />
            </Box>
          </Flex>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" type="button" disabled={isPending}>
                Cancel
              </Button>
            </Dialog.Close>
            <Button variant="solid" color="cyan" type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};
