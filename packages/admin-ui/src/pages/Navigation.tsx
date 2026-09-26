import React, { useState } from 'react';
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

interface MenuItem {
  id: string;
  label: string;
  url: string;
}

export const Navigation: React.FC = () => {
  const [headerMenu, setHeaderMenu] = useState<MenuItem[]>([
    { id: '1', label: 'Home', url: '/' },
    { id: '2', label: 'Blog', url: '/posts' },
    { id: '3', label: 'About', url: '/about' },
    { id: '4', label: 'Contact', url: '/contact' },
  ]);

  const [footerMenu, setFooterMenu] = useState<MenuItem[]>([
    { id: '10', label: 'Privacy Policy', url: '/privacy' },
    { id: '11', label: 'Terms of Service', url: '/terms' },
    { id: '12', label: 'RSS Feed', url: '/rss.xml' },
  ]);

  const [newLabel, setNewLabel] = useState('');
  const [newUrl, setNewUrl] = useState('');
  const [activeTab, setActiveTab] = useState('header');
  const [saved, setSaved] = useState(false);

  const handleAdd = () => {
    if (!newLabel || !newUrl) return;
    const newItem: MenuItem = { id: Date.now().toString(), label: newLabel, url: newUrl };
    if (activeTab === 'header') {
      setHeaderMenu([...headerMenu, newItem]);
    } else {
      setFooterMenu([...footerMenu, newItem]);
    }
    setNewLabel('');
    setNewUrl('');
  };

  const handleDelete = (id: string) => {
    if (activeTab === 'header') {
      setHeaderMenu(headerMenu.filter((item) => item.id !== id));
    } else {
      setFooterMenu(footerMenu.filter((item) => item.id !== id));
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const currentList = activeTab === 'header' ? headerMenu : footerMenu;

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
        <Button variant="solid" color="iris" onClick={handleSave}>
          {saved ? (
            <>
              <CheckIcon width="16" height="16" /> Saved!
            </>
          ) : (
            'Save Changes'
          )}
        </Button>
      </Flex>

      <Card size="2">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
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
                {currentList.map((item) => (
                  <Table.Row key={item.id}>
                    <Table.RowHeaderCell>
                      <Text weight="medium">{item.label}</Text>
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
                        onClick={() => handleDelete(item.id)}
                        title="Remove link"
                      >
                        <TrashIcon width="16" height="16" />
                      </IconButton>
                    </Table.Cell>
                  </Table.Row>
                ))}
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
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
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
