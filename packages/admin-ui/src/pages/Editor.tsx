import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  TextField,
  TextArea,
  Tabs,
  Badge,
  Grid,
} from '@radix-ui/themes';
import {
  ArrowLeftIcon,
  CheckIcon,
  EyeOpenIcon,
  FileTextIcon,
} from '@radix-ui/react-icons';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialType = searchParams.get('type') || 'post';
  const isEditing = Boolean(id);

  const [title, setTitle] = useState(isEditing ? 'Sample Article Title' : '');
  const [slug, setSlug] = useState(isEditing ? 'sample-article-title' : '');
  const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('draft');
  const [content, setContent] = useState(
    isEditing
      ? '# Sample Article\n\nThis is content fetched from the edge database.'
      : ''
  );
  const [tags, setTags] = useState('edge, workers, d1');
  const [isSaved, setIsSaved] = useState(false);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (!isEditing || !slug) {
      setSlug(
        newTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
  };

  const handleSave = (publish = false) => {
    if (publish) setStatus('published');
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2500);
  };

  return (
    <Box style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Top action header */}
      <Flex justify="between" align="center" mb="5">
        <Flex align="center" gap="3">
          <Button variant="ghost" color="gray" onClick={() => navigate(-1)}>
            <ArrowLeftIcon width="16" height="16" />
            Back
          </Button>
          <Box>
            <Heading size="6" weight="bold">
              {isEditing ? 'Edit Content' : 'Create New Content'}
            </Heading>
            <Flex align="center" gap="2" mt="1">
              <Badge color={initialType === 'post' ? 'iris' : 'blue'}>
                {initialType.toUpperCase()}
              </Badge>
              <Badge color={status === 'published' ? 'green' : 'gray'}>
                {status.toUpperCase()}
              </Badge>
              {isSaved && (
                <Text size="1" color="green" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckIcon /> Saved to Edge
                </Text>
              )}
            </Flex>
          </Box>
        </Flex>

        <Flex gap="2">
          <Button variant="soft" color="gray" onClick={() => handleSave(false)}>
            Save Draft
          </Button>
          <Button variant="solid" color="iris" onClick={() => handleSave(true)}>
            Publish
          </Button>
        </Flex>
      </Flex>

      <Grid columns={{ initial: '1', md: '3fr 1fr' }} gap="4">
        {/* Main Content Pane */}
        <Box>
          <Card size="2" mb="4">
            <Box mb="4">
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Title
              </Text>
              <TextField.Root
                size="3"
                placeholder="Enter title here..."
                value={title}
                onChange={handleTitleChange}
              />
            </Box>

            <Box mb="4">
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Slug
              </Text>
              <TextField.Root
                size="2"
                placeholder="url-friendly-slug"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              >
                <TextField.Slot>
                  <Text size="1" color="gray">
                    /{initialType === 'post' ? 'post/' : ''}
                  </Text>
                </TextField.Slot>
              </TextField.Root>
            </Box>

            {/* Tabs for Editor / Preview */}
            <Tabs.Root defaultValue="editor">
              <Tabs.List mb="3">
                <Tabs.Trigger value="editor">
                  <Flex align="center" gap="1">
                    <FileTextIcon width="14" height="14" />
                    Editor
                  </Flex>
                </Tabs.Trigger>
                <Tabs.Trigger value="preview">
                  <Flex align="center" gap="1">
                    <EyeOpenIcon width="14" height="14" />
                    Preview
                  </Flex>
                </Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="editor">
                <TextArea
                  placeholder="Write your markdown or HTML content here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  style={{ minHeight: '380px', fontFamily: 'monospace', fontSize: '14px' }}
                />
              </Tabs.Content>

              <Tabs.Content value="preview">
                <Box
                  p="4"
                  style={{
                    minHeight: '380px',
                    borderRadius: 'var(--radius-3)',
                    border: '1px solid var(--gray-a4)',
                    backgroundColor: 'var(--color-surface)',
                  }}
                >
                  {content ? (
                    <Box style={{ whiteSpace: 'pre-wrap' }}>{content}</Box>
                  ) : (
                    <Text color="gray">Nothing to preview</Text>
                  )}
                </Box>
              </Tabs.Content>
            </Tabs.Root>
          </Card>
        </Box>

        {/* Sidebar Settings Pane */}
        <Box>
          <Card size="2">
            <Heading size="3" mb="3">
              Settings &amp; Meta
            </Heading>

            <Box mb="3">
              <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>
                Status
              </Text>
              <Flex gap="2">
                <Button
                  size="1"
                  variant={status === 'draft' ? 'solid' : 'soft'}
                  color="gray"
                  onClick={() => setStatus('draft')}
                >
                  Draft
                </Button>
                <Button
                  size="1"
                  variant={status === 'published' ? 'solid' : 'soft'}
                  color="green"
                  onClick={() => setStatus('published')}
                >
                  Published
                </Button>
              </Flex>
            </Box>

            <Box mb="3">
              <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>
                Tags (comma separated)
              </Text>
              <TextField.Root
                size="1"
                placeholder="tech, news"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
            </Box>

            <Box mb="3">
              <Text as="label" size="1" weight="bold" color="gray" mb="1" style={{ display: 'block' }}>
                Canonical URL
              </Text>
              <TextField.Root
                size="1"
                placeholder="https://example.com/..."
              />
            </Box>
          </Card>
        </Box>
      </Grid>
    </Box>
  );
};

export default Editor;
