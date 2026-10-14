import React from 'react';
import { Flex, Box, Text, Table, Badge, Avatar, IconButton } from '@radix-ui/themes';
import { Pencil1Icon, TrashIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import type { UserItem } from '../../types';
import { getRoleBadgeColor, getInitials } from '../../utils';

interface UserTableRowProps {
  user: UserItem;
  onEdit: (user: UserItem) => void;
  onDelete: (user: UserItem) => void;
}

export const UserTableRow: React.FC<UserTableRowProps> = ({ user, onEdit, onDelete }) => {
  const formattedDate = user.created_at ? user.created_at.split(/[ T]/)[0] || user.created_at : '—';
  const websiteHref = user.website
    ? user.website.startsWith('http')
      ? user.website
      : `https://${user.website}`
    : null;

  return (
    <Table.Row>
      {/* User Avatar + Name + Email */}
      <Table.RowHeaderCell>
        <Flex align="center" gap="3">
          <Avatar
            size="2"
            src={user.avatar_url || undefined}
            fallback={getInitials(user)}
            radius="full"
            color="cyan"
          />
          <Box>
            <Text weight="medium" style={{ display: 'block' }}>
              {user.display_name || user.email || 'Anonymous'}
            </Text>
            <Text size="1" color="gray" style={{ display: 'block' }}>
              {user.email || 'No email provided'}
            </Text>
          </Box>
        </Flex>
      </Table.RowHeaderCell>

      {/* Role */}
      <Table.Cell>
        <Badge color={getRoleBadgeColor(user.role)}>{user.role}</Badge>
      </Table.Cell>

      {/* Bio & Links */}
      <Table.Cell>
        <Box style={{ maxWidth: '240px' }}>
          {user.bio ? (
            <Text
              size="2"
              color="gray"
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={user.bio}
            >
              {user.bio}
            </Text>
          ) : null}
          {websiteHref ? (
            <a
              href={websiteHref}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                color: 'var(--cyan-11)',
                textDecoration: 'none',
                fontSize: '12px',
              }}
            >
              <ExternalLinkIcon width="12" height="12" />
              <span
                style={{
                  maxWidth: '180px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {user.website?.replace(/^https?:\/\//, '')}
              </span>
            </a>
          ) : !user.bio ? (
            <Text size="1" color="gray">
              —
            </Text>
          ) : null}
        </Box>
      </Table.Cell>

      {/* Date Added */}
      <Table.Cell>
        <Text size="2" color="gray">
          {formattedDate}
        </Text>
      </Table.Cell>

      {/* Actions */}
      <Table.Cell style={{ textAlign: 'right' }}>
        <Flex justify="end" gap="1">
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            color="gray"
            onClick={() => onEdit(user)}
            title="Edit User"
            aria-label={`Edit ${user.display_name || user.email}`}
          >
            <Pencil1Icon width="18" height="18" />
          </IconButton>
          <IconButton
            style={{ cursor: 'pointer' }}
            size="2"
            variant="ghost"
            color="red"
            onClick={() => onDelete(user)}
            title="Delete User"
            aria-label={`Delete ${user.display_name || user.email}`}
          >
            <TrashIcon width="18" height="18" />
          </IconButton>
        </Flex>
      </Table.Cell>
    </Table.Row>
  );
};
