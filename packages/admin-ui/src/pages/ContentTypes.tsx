import React, { useState } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Table,
  Badge,
  IconButton,
} from '@radix-ui/themes';
import {
  PlusIcon,
  Pencil1Icon,
} from '@radix-ui/react-icons';

interface ContentTypeItem {
  id: string;
  name: string;
  slug: string;
  fieldsCount: number;
  entriesCount: number;
  isSystem: boolean;
}

export const ContentTypes: React.FC = () => {
  const [types] = useState<ContentTypeItem[]>([
    { id: 'post', name: 'Post', slug: 'posts', fieldsCount: 6, entriesCount: 18, isSystem: true },
    { id: 'page', name: 'Page', slug: 'pages', fieldsCount: 5, entriesCount: 6, isSystem: true },
    { id: 'project', name: 'Project Portfolio', slug: 'projects', fieldsCount: 8, entriesCount: 4, isSystem: false },
  ]);

  return (
    <Box style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Content Types
          </Heading>
          <Text size="2" color="gray">
            Define content structures and dynamic schemas
          </Text>
        </Box>
        <Button variant="solid" color="iris">
          <PlusIcon width="16" height="16" />
          New Content Type
        </Button>
      </Flex>

      <Card size="2">
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Identifier / Slug</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Fields</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Entries</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {types.map((type) => (
              <Table.Row key={type.id}>
                <Table.RowHeaderCell>
                  <Text weight="medium">{type.name}</Text>
                </Table.RowHeaderCell>
                <Table.Cell>
                  <Text size="2" color="gray">
                    {type.slug}
                  </Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{type.fieldsCount} fields</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="2">{type.entriesCount} items</Text>
                </Table.Cell>
                <Table.Cell>
                  <Badge color={type.isSystem ? 'gray' : 'iris'}>
                    {type.isSystem ? 'Built-in' : 'Custom'}
                  </Badge>
                </Table.Cell>
                <Table.Cell style={{ textAlign: 'right' }}>
                  <IconButton size="1" variant="ghost" color="gray" title="Edit Schema">
                    <Pencil1Icon width="16" height="16" />
                  </IconButton>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table.Root>
      </Card>
    </Box>
  );
};

export default ContentTypes;
