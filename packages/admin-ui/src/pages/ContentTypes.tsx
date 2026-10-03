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
  Dialog,
  TextField,
  TextArea,
} from '@radix-ui/themes';
import {
  PlusIcon,
  Pencil1Icon,
  TrashIcon,
} from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

interface ContentTypeItem {
  id: string;
  name: string;
  description: string | null;
  schema_json: string;
}

export const ContentTypes: React.FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formSchema, setFormSchema] = useState('[]');

  const { data: types = [], isLoading } = useQuery({
    queryKey: ['content-types'],
    queryFn: async () => {
      const res = await apiFetch('/api/content-types');
      if (!res.ok) throw new Error('Failed to fetch content types');
      return res.json();
    },
  });

  const upsertMutation = useMutation({
    mutationFn: async (payload: { id: string; name: string; description: string; schema_json: string; isEdit: boolean }) => {
      const method = payload.isEdit ? 'PUT' : 'POST';
      const res = await apiFetch(`/api/content-types/${payload.id}`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: payload.name,
          description: payload.description,
          schema_json: payload.schema_json,
        }),
      });
      if (!res.ok) throw new Error('Failed to save content type');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      setIsDialogOpen(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/content-types/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete content type');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
    },
  });

  const openCreate = () => {
    setEditingId(null);
    setFormId('');
    setFormName('');
    setFormDesc('');
    setFormSchema('[]');
    setIsDialogOpen(true);
  };

  const openEdit = (type: ContentTypeItem) => {
    setEditingId(type.id);
    setFormId(type.id);
    setFormName(type.name || '');
    setFormDesc(type.description || '');
    setFormSchema(type.schema_json || '[]');
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    upsertMutation.mutate({
      id: formId,
      name: formName,
      description: formDesc,
      schema_json: formSchema,
      isEdit: !!editingId,
    });
  };

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
        <Button variant="solid" color="iris" onClick={openCreate}>
          <PlusIcon width="16" height="16" />
          New Content Type
        </Button>
      </Flex>

      <Card size="2">
        <Table.Root variant="surface">
          <Table.Header>
            <Table.Row>
              <Table.ColumnHeaderCell>Name</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Identifier</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Fields</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell>Type</Table.ColumnHeaderCell>
              <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {isLoading ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text color="gray">Loading...</Text>
                </Table.Cell>
              </Table.Row>
            ) : types.length === 0 ? (
              <Table.Row>
                <Table.Cell colSpan={5}>
                  <Text color="gray">No content types found.</Text>
                </Table.Cell>
              </Table.Row>
            ) : (
              types.map((type: ContentTypeItem) => {
                let fieldsCount = 0;
                try {
                  const schema = JSON.parse(type.schema_json);
                  fieldsCount = Array.isArray(schema) ? schema.length : 0;
                } catch (e) {
                  // ignore
                }

                const isSystem = type.id === 'post' || type.id === 'page';

                return (
                  <Table.Row key={type.id}>
                    <Table.RowHeaderCell>
                      <Text weight="medium">{type.name}</Text>
                    </Table.RowHeaderCell>
                    <Table.Cell>
                      <Text size="2" color="gray">
                        {type.id}
                      </Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="2">{fieldsCount} fields</Text>
                    </Table.Cell>
                    <Table.Cell>
                      <Badge color={isSystem ? 'gray' : 'iris'}>
                        {isSystem ? 'Built-in' : 'Custom'}
                      </Badge>
                    </Table.Cell>
                    <Table.Cell style={{ textAlign: 'right' }}>
                      <IconButton
                        size="1"
                        variant="ghost"
                        color="gray"
                        title="Edit Schema"
                        onClick={() => openEdit(type)}
                      >
                        <Pencil1Icon width="16" height="16" />
                      </IconButton>
                      {!isSystem && (
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="red"
                          title="Delete Schema"
                          style={{ marginLeft: '8px' }}
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this content type?')) {
                              deleteMutation.mutate(type.id);
                            }
                          }}
                        >
                          <TrashIcon width="16" height="16" />
                        </IconButton>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })
            )}
          </Table.Body>
        </Table.Root>
      </Card>

      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content maxWidth="500px">
          <Dialog.Title>{editingId ? 'Edit Content Type' : 'New Content Type'}</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Configure the schema fields for this content type.
          </Dialog.Description>

          <Flex direction="column" gap="3">
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Identifier (Slug)
              </Text>
              <TextField.Root
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. products"
                disabled={!!editingId}
              />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Name
              </Text>
              <TextField.Root
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Products"
              />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Description
              </Text>
              <TextField.Root
                value={formDesc}
                onChange={(e) => setFormDesc(e.target.value)}
                placeholder="Optional description"
              />
            </label>
            <label>
              <Text as="div" size="2" mb="1" weight="bold">
                Schema (JSON)
              </Text>
              <TextArea
                value={formSchema}
                onChange={(e) => setFormSchema(e.target.value)}
                placeholder='[{"name": "title", "type": "text", "label": "Title", "required": true}]'
                rows={6}
                style={{ fontFamily: 'monospace' }}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleSave} disabled={upsertMutation.isPending || !formId || !formName}>
              {upsertMutation.isPending ? 'Saving...' : 'Save'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default ContentTypes;
