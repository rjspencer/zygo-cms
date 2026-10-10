import React, { useState, useEffect, useRef } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Tabs,
  TextField,
  IconButton,
  Table,
} from '@radix-ui/themes';
import {
  PlusIcon,
  TrashIcon,
  CheckIcon,
  ChevronDownIcon,
} from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

export interface MenuItem {
  title: string;
  url: string;
  target: string;
  children: MenuItem[];
}

interface SitePageItem {
  id: number;
  title: string;
  path: string;
}

export const Navigation: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'header' | 'footer'>('header');
  const [newTitle, setNewTitle] = useState('');
  const [selectedUrl, setSelectedUrl] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [customUrl, setCustomUrl] = useState('');
  const [urlSearchQuery, setUrlSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const { data: sitePages = [] } = useQuery<SitePageItem[]>({
    queryKey: ['entries', 'pages-nav'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((e: any) => e.type === 'page' && !e.deleted_at)
        .map((e: any) => ({
          id: e.id,
          title: e.title || '',
          path: e.path || (e.slug ? `/${e.slug.replace(/^\/+/, '')}` : '/'),
        }));
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

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const isAbsoluteUrl = (url: string) => {
    if (!url.trim()) return true;
    return /^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url.trim());
  };

  const handleSelectPage = (page: SitePageItem) => {
    setIsCustom(false);
    setSelectedUrl(page.path);
    setUrlSearchQuery(`${page.title} (${page.path})`);
    setIsDropdownOpen(false);
    if (!newTitle.trim()) {
      setNewTitle(page.title);
    }
  };

  const handleSelectCustom = () => {
    setIsCustom(true);
    setSelectedUrl('');
    setUrlSearchQuery('Custom URL');
    setIsDropdownOpen(false);
  };

  const handleAdd = () => {
    const finalUrl = isCustom ? customUrl.trim() : (selectedUrl.trim() || urlSearchQuery.trim());
    if (!newTitle.trim() || !finalUrl) return;

    const newItem: MenuItem = {
      title: newTitle.trim(),
      url: finalUrl,
      target: '_self',
      children: [],
    };

    setLocalMenus((prev) => ({
      ...prev,
      [activeTab]: [...prev[activeTab], newItem],
    }));

    setNewTitle('');
    setSelectedUrl('');
    setCustomUrl('');
    setIsCustom(false);
    setUrlSearchQuery('');
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

  const filteredPages = sitePages.filter((p) => {
    const q = urlSearchQuery.toLowerCase();
    return p.title.toLowerCase().includes(q) || p.path.toLowerCase().includes(q);
  });

  return (
    <Box>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Navigation Menus
          </Heading>
          <Text size="2" color="gray">
            Configure site header and footer menu structures
          </Text>
        </Box>
        <Button variant="solid" color="cyan" onClick={handleSave} disabled={updateMenuMutation.isPending || isLoading}>
          {updateMenuMutation.isSuccess ? (
            <>
              <CheckIcon width="18" height="18" /> Saved!
            </>
          ) : updateMenuMutation.isPending ? (
            'Saving...'
          ) : (
            'Save Changes'
          )}
        </Button>
      </Flex>

      <Box style={{ backgroundColor: 'var(--color-panel-solid)', borderRadius: 'var(--radius-4)', boxShadow: 'var(--shadow-2)', padding: 'var(--space-4)', border: '1px solid var(--gray-6)' }}>
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
                        <IconButton style={{ cursor: 'pointer' }} size="2"
                          variant="ghost"
                          color="red"
                          onClick={() => handleDelete(idx)}
                          title="Remove link"
                        >
                          <TrashIcon width="18" height="18" />
                        </IconButton>
                      </Table.Cell>
                    </Table.Row>
                  ))
                )}
              </Table.Body>
            </Table.Root>

            {/* Add Item Row */}
            <Box style={{ backgroundColor: 'var(--color-panel-solid)', border: '1px solid var(--gray-5)', borderRadius: 'var(--radius-3)', padding: 'var(--space-4)', position: 'relative', zIndex: 10 }}>
              <Heading size="2" mb="3">
                Add Menu Item
              </Heading>
              <Flex gap="3" align="start" wrap="wrap">
                {/* 1. URL Field (FIRST) */}
                <Box style={{ flex: 1, minWidth: '240px', position: 'relative' }} ref={dropdownRef}>
                  <Text size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
                    URL
                  </Text>
                  <TextField.Root
                    size="2"
                    placeholder="Select or search a page..."
                    value={urlSearchQuery}
                    onChange={(e) => {
                      setUrlSearchQuery(e.target.value);
                      setIsDropdownOpen(true);
                      if (!isCustom) {
                        setSelectedUrl(e.target.value);
                      }
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    role="combobox"
                    aria-label="URL"
                    aria-expanded={isDropdownOpen}
                    aria-autocomplete="list"
                  >
                    <TextField.Slot side="right">
                      <IconButton style={{ cursor: 'pointer' }} size="2"
                        variant="ghost"
                        color="gray"
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsDropdownOpen((prev) => !prev);
                        }}
                        aria-label="Toggle pages dropdown"
                      >
                        <ChevronDownIcon width="16" height="16" />
                      </IconButton>
                    </TextField.Slot>
                  </TextField.Root>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <Box
                      role="listbox"
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        zIndex: 100,
                        marginTop: '4px',
                        background: 'var(--color-panel-solid, #fff)',
                        border: '1px solid var(--gray-6, #ccc)',
                        borderRadius: 'var(--radius-2, 6px)',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                        maxHeight: '220px',
                        overflowY: 'auto',
                      }}
                    >
                      {/* Existing Site Pages */}
                      {filteredPages.length > 0 ? (
                        filteredPages.map((page) => (
                          <Box
                            key={page.id}
                            role="option"
                            onClick={() => handleSelectPage(page)}
                            style={{
                              padding: '8px 12px',
                              cursor: 'pointer',
                              borderBottom: '1px solid var(--gray-3, #f0f0f0)',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'var(--gray-3, #f5f5f5)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            <Text size="2" weight="medium" style={{ display: 'block' }}>
                              {page.title}
                            </Text>
                            <Text size="1" color="gray" style={{ display: 'block', fontFamily: 'monospace' }}>
                              {page.path}
                            </Text>
                          </Box>
                        ))
                      ) : (
                        <Box style={{ padding: '8px 12px' }}>
                          <Text size="2" color="gray">
                            No matching pages
                          </Text>
                        </Box>
                      )}

                      {/* Custom Option */}
                      <Box
                        role="option"
                        onClick={handleSelectCustom}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: 'var(--gray-2, #fafafa)',
                          borderTop: '1px solid var(--gray-4, #e5e5e5)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--gray-4, #eee)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--gray-2, #fafafa)';
                        }}
                      >
                        <Text size="2" weight="bold" color="cyan">
                          Custom (External URL)...
                        </Text>
                      </Box>
                    </Box>
                  )}
                </Box>

                {/* 2. Custom URL Field (revealed when custom option is selected) */}
                {isCustom && (
                  <Box style={{ flex: 1, minWidth: '240px' }}>
                    <Text size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
                       External URL
                    </Text>
                    <TextField.Root
                      size="2"
                      placeholder="https://example.com"
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      aria-label="External URL"
                    />
                    {!isAbsoluteUrl(customUrl) && customUrl.trim() !== '' && (
                      <Text
                        size="1"
                        color="amber"
                        weight="medium"
                        style={{ display: 'block', marginTop: '4px' }}
                      >
                        Warning: External URLs should be absolute (e.g. https://example.com)
                      </Text>
                    )}
                  </Box>
                )}

                {/* 3. Label Field (SECOND) */}
                <Box style={{ flex: 1, minWidth: '200px' }}>
                  <Text size="1" color="gray" weight="bold" mb="1" style={{ display: 'block' }}>
                    Label
                  </Text>
                  <TextField.Root
                    size="2"
                    placeholder="e.g. Documentation"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    aria-label="Label"
                  />
                </Box>

                {/* 4. Add Link Button */}
                <Box style={{ alignSelf: 'flex-start', marginTop: '22px' }}>
                  <Button size="2" variant="soft" color="cyan" onClick={handleAdd}>
                    <PlusIcon width="18" height="18" />
                    Add Link
                  </Button>
                </Box>
              </Flex>
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Box>
    </Box>
  );
};

export default Navigation;
