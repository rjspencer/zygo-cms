import React, { useState, useEffect } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Tabs,
  TextField,
  IconButton,
  Table,
} from '@radix-ui/themes';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
} from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

interface MenuItem {
  title: string;
  url: string;
  target: string;
  children: MenuItem[];
}

export const Navigation: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  const [newTitle, setNewTitle] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [localMenus, setLocalMenus] = useState<{ [key: string]: MenuItem[] }>({
    header: [],
    footer: [],
  });

  const { data: menus, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await apiFetch('/api/menus');
      if (!res.ok) throw new Error('Failed to fetch menus');
      return res.json();
    },
  });

  useEffect(() => {
    if (menus) {
      setLocalMenus({
        header: menus.header?.items_json ? JSON.parse(menus.header.items_json) : [],
        footer: menus.footer?.items_json ? JSON.parse(menus.footer.items_json) : [],
      });
    }
  }, [menus]);

  const updateMenuMutation = useMutation({
    mutationFn: async ({ name, items }: { name: string; items: MenuItem[] }) => {
      const res = await apiFetch(`/api/menus/${name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items_json: JSON.stringify(items) }),
      });
      if (!res.ok) throw new Error(`Failed to update ${name} menu`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  const handleAdd = () => {
    if (!newTitle || !newUrl) return;
    const newItem: MenuItem = { title: newTitle, url: newUrl, target: '_self', children: [] };
    setLocalMenus((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newItem],
    }));
    setNewTitle('');
    setNewUrl('');
  };

  const handleDelete = (index: number) => {
    setLocalMenus((prev) => {
      const newItems = [...prev[activeTab]];
      newItems.splice(index, 1);
      return { ...prev, [activeTab]: newItems };
    });
  };

  const handleSave = () => {
    updateMenuMutation.mutate({
      name: activeTab,
      items: localMenus[activeTab],
    });
  };

  const currentList = localMenus[activeTab] || [];

  return (
    <Box style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Navigation Menus
          </Heading>
          <Text size="2" color="gray">
            Configure site header and footer menu structures
          </Text>
        </Box>
        <Button variant="solid" color="iris" onClick={handleSave} disabled={updateMenuMutation.isPending || isLoading}>
          {updateMenuMutation.isSuccess ? (
            <>
              <CheckIcon width="16" height="16" /> Saved!
            </>
          ) : updateMenuMutation.isPending ? (
            'Saving...'
          ) : (
            'Save Changes'
          )}
        </Button>
      </Flex>

      <Card size="2">
        <Tabs.Root value={activeTab} onValueChange={(v) => setActiveTab(v as 'header' | 'footer')}>
          <Tabs.List mb="4">
            <Tabs.Trigger value="header">Header Menu</Tabs.Trigger>
            <Tabs.Trigger value="footer">Footer Menu</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value={activeTab}>
            <Table.Root variant="surface" mb="4">
              <Table.Header>
                <Table.Row>
                  <Table.ColumnHeaderCell>Label</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell>Target URL</Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell style={{ textAlign: 'right' }}>Actions</Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {isLoading ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <Text color="gray">Loading...</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : currentList.length === 0 ? (
                  <Table.Row>
                    <Table.Cell colSpan={3}>
                      <Text color="gray">No items in this menu.</Text>
                    </Table.Cell>
                  </Table.Row>
                ) : (
                  currentList.map((item, idx) => (
                    <Table.Row key={`${item.title}-${idx}`}>
                      <Table.RowHeaderCell>
                        <Text weight="medium">{item.title}</Text>
                      </Table.RowHeaderCell>
                      <Table.Cell>
                        <Text size="2" color="gray">
                          {item.url}
                        </Text>
                      </Table.Cell>
                      <Table.Cell style={{ textAlign: 'right' }}>
                        <IconButton
                          size="1"
                          variant="ghost"
                          color="red"
                          onClick={() => handleDelete(idx)}
                          title="Remove link"
                        >
                          <TrashIcon width="16" height="16" />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>

            {/* Add Item Row */}
            <Card variant="classic" size="1">
              <Heading size="2" mb="2">
                Add Menu Item
              </Heading>
              <Flex gap="3" align="end">
                <Box style={{ flex: 1 }}>
                  <Text size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
                    Label
                  </Text>
                  <TextField.Root
                    size="2"
                    placeholder="e.g. Documentation"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                  />
                </Box>
                <Box style={{ flex: 1 }}>
                  <Text size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
                    URL
                  </Text>
                  <TextField.Root
                    size="2"
                    placeholder="e.g. /docs or https://..."
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                  />
                </Box>
                <Button size="2" variant="soft" color="iris" onClick={handleAdd}>
                  <PlusIcon width="16" height="16" />
                  Add Link
                </Button>
              </Flex>
            </Card>
          </Tabs.Content>
        </Tabs.Root>
      </Card>
    </Box>
  );
};

export default Navigation;
