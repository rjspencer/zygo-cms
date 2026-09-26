import React, { useState } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Grid,
  Badge,
  TextField,
  IconButton,
} from '@radix-ui/themes';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  ImageIcon,
  TrashIcon,
  ClipboardCopyIcon,
  CheckIcon,
} from '@radix-ui/react-icons';

interface MediaItem {
  id: string;
  name: string;
  size: string;
  type: string;
  url: string;
  uploadedAt: string;
}

export const Media: React.FC = () => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [items, setItems] = useState<MediaItem[]>([
    { id: '1', name: 'hero-banner.jpg', size: '245 KB', type: 'image/jpeg', url: '/media/hero-banner.jpg', uploadedAt: '2026-09-24' },
    { id: '2', name: 'zygo-logo.png', size: '48 KB', type: 'image/png', url: '/media/zygo-logo.png', uploadedAt: '2026-09-22' },
    { id: '3', name: 'architecture-diagram.svg', size: '12 KB', type: 'image/svg+xml', url: '/media/architecture-diagram.svg', uploadedAt: '2026-09-15' },
  ]);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Media Library
          </Heading>
          <Text size="2" color="gray">
            Upload and manage assets stored in Cloudflare R2 / KV
          </Text>
        </Box>
        <Button variant="solid" color="iris">
          <PlusIcon width="16" height="16" />
          Upload Media
        </Button>
      </Flex>

      <Card size="2" mb="4">
        <TextField.Root
          placeholder="Search media by filename..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        >
          <TextField.Slot>
            <MagnifyingGlassIcon height="16" width="16" />
          </TextField.Slot>
        </TextField.Root>
      </Card>

      <Grid columns={{ initial: '1', sm: '2', md: '3' }} gap="4">
        {filteredItems.map((item) => (
          <Card key={item.id} size="2">
            <Flex
              direction="column"
              align="center"
              justify="center"
              p="4"
              mb="3"
              style={{
                borderRadius: 'var(--radius-3)',
                backgroundColor: 'var(--gray-a3)',
                height: '140px',
              }}
            >
              <ImageIcon width="36" height="36" color="var(--gray-9)" />
            </Flex>

            <Flex justify="between" align="start" mb="2">
              <Box style={{ overflow: 'hidden' }}>
                <Text weight="bold" size="2" style={{ textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap', display: 'block' }}>
                  {item.name}
                </Text>
                <Text size="1" color="gray">
                  {item.size} • {item.type}
                </Text>
              </Box>
              <Badge size="1" color="gray">
                R2
              </Badge>
            </Flex>

            <Flex justify="between" align="center" mt="3">
              <Text size="1" color="gray">
                {item.uploadedAt}
              </Text>
              <Flex gap="1">
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  onClick={() => handleCopy(item.id, item.url)}
                  title="Copy URL"
                >
                  {copiedId === item.id ? <CheckIcon color="green" /> : <ClipboardCopyIcon />}
                </IconButton>
                <IconButton
                  size="1"
                  variant="ghost"
                  color="red"
                  onClick={() => handleDelete(item.id)}
                  title="Delete"
                >
                  <TrashIcon />
                </IconButton>
              </Flex>
            </Flex>
          </Card>
        ))}
      </Grid>
    </Box>
  );
};

export default Media;
