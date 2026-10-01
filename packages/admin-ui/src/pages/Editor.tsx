import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  IconButton,
  TextField,
  TextArea,
  Tabs,
  Badge,
  Grid,
} from '@radix-ui/themes';
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  Pencil1Icon,
} from '@radix-ui/react-icons';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { apiFetch } from '../utils/api';

export const Editor: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const isEditing = Boolean(id);
  const [title, setTitle] = useState('');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'published' | 'draft' | 'scheduled'>('draft');
  const [entryType, setEntryType] = useState(searchParams.get('type') || 'post');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [previewToken, setPreviewToken] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [schemaJson, setSchemaJson] = useState('');
  const [pickerTarget, setPickerTarget] = useState<'cover' | 'content' | null>(null);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  const handleMediaSelect = (url: string, altText: string) => {
    if (pickerTarget === 'cover') {
      setCoverImage(url);
    } else if (pickerTarget === 'content') {
      const markdownImage = `![${altText}](${url})`;
      setContent((prev) => {
        if (cursorPos !== null && cursorPos >= 0 && cursorPos <= prev.length) {
          return prev.slice(0, cursorPos) + markdownImage + prev.slice(cursorPos);
        }
        return prev + markdownImage;
      });
    }
    setPickerTarget(null);
  };

  React.useEffect(() => {
    if (!isEditing) return;
    const loadEntry = async () => {
      try {
        const res = await apiFetch(`/api/admin/editor/${id}`);
        if (!res || !res.ok) return;
        const data = await res.json();
        if (data?.entry) {
          setTitle(data.entry.title || '');
          setSlug(data.entry.slug || '');
          setStatus(data.entry.status || 'draft');
          setEntryType(data.entry.type || 'post');
          setContent(data.entry.body_html || '');
          setTags(data.entry.tags || '');
          setDescription(data.entry.description || '');
          setCategory(data.entry.category || '');
          setCoverImage(data.entry.cover_image || '');
          setCanonicalUrl(data.entry.canonical_url || '');
          setSchemaJson(data.entry.schema_json || '');
        }
        if (data?.latest_revision?.preview_token) {
          setPreviewToken(data.latest_revision.preview_token);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadEntry();
  }, [id, isEditing]);

  const handleStartEditTitle = () => {
    setTempTitle(title);
    setIsEditingTitle(true);
  };

  const handleCancelEditTitle = () => {
    setTempTitle(title);
    setIsEditingTitle(false);
  };

  const handleSaveTitle = () => {
    setTitle(tempTitle);
    if (!isEditing || !slug) {
      setSlug(
        tempTitle
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, '')
      );
    }
    setIsEditingTitle(false);
  };

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveTitle();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelEditTitle();
    }
  };

  const handleSave = async (publish = false, isPreview = false): Promise<string | null> => {
    if (isSaving) return null;
    setIsSaving(true);
    const finalStatus = isPreview ? status : (publish ? 'published' : 'draft');

    const effectiveTitle = title.trim() || 'Untitled';
    const effectiveSlug =
      slug.trim() ||
      effectiveTitle
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') ||
      'untitled';
    
    const payload: Record<string, any> = {
      title: effectiveTitle,
      slug: effectiveSlug,
      type: entryType,
      status: finalStatus,
      description,
      category,
      cover_image: coverImage,
      canonical_url: canonicalUrl,
      schema_json: schemaJson,
      body_html: content,
      body_json: "{}",
      tags
    };

    if (isEditing && isPreview) {
      payload.draft_only = true;
    }

    try {
      const url = isEditing ? `/api/entries/${id}` : `/api/entries`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setStatus(finalStatus);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2500);
        const data = await res.json();
        if (data.preview_token) {
          setPreviewToken(data.preview_token);
        }
        if (!isEditing && data.id) {
          navigate('/editor/' + data.id + '?type=' + entryType, { replace: true });
        }
        return data.preview_token || null;
      } else {
        const errData = await res.text();
        console.error('Save failed:', errData);
        return null;
      }
    } catch (err) {
      console.error(err);
      return null;
    } finally {
      setIsSaving(false);
    }
  };

  const handleTabChange = async (value: string) => {
    if (value === 'preview') {
      await handleSave(false, true);
    }
  };

  return (
    <Box style={{ maxWidth: '900px', margin: '0 auto' }}>
      {/* Top navigation row */}
      <Flex justify="between" align="center" mb="4">
        <Button variant="ghost" color="gray" onClick={() => navigate(-1)}>
          <ArrowLeftIcon width="16" height="16" />
          Back
        </Button>
        <Flex gap="2">
          <Button variant="soft" color="gray" onClick={() => handleSave(false)}>
            Save Draft
          </Button>
          <Button variant="solid" color="iris" onClick={() => handleSave(true)}>
            Publish
          </Button>
        </Flex>
      </Flex>

      {/* Header with inline-editable title */}
      <Box mb="5">
        {isEditingTitle ? (
          <Flex align="center" gap="2" style={{ minHeight: '40px' }}>
            <Box style={{ flex: 1 }}>
              <TextField.Root
                size="3"
                placeholder="Enter title here..."
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={handleTitleKeyDown}
                aria-label="Title"
                autoFocus
                style={{
                  fontSize: '1.5rem',
                  fontWeight: 'bold',
                }}
              />
            </Box>
            <IconButton
              size="2"
              variant="soft"
              color="green"
              aria-label="Save title"
              title="Save title"
              onClick={handleSaveTitle}
            >
              <CheckIcon width="16" height="16" />
            </IconButton>
            <IconButton
              size="2"
              variant="soft"
              color="gray"
              aria-label="Cancel"
              title="Cancel"
              onClick={handleCancelEditTitle}
            >
              <Cross2Icon width="16" height="16" />
            </IconButton>
          </Flex>
        ) : (
          <Flex align="center" gap="2" style={{ minHeight: '40px' }}>
            <Heading
              size="6"
              style={{
                fontSize: '1.5rem',
                fontWeight: 'bold',
                lineHeight: '30px',
                padding: '5px 0',
                boxSizing: 'border-box',
                margin: 0,
                color: title ? undefined : 'var(--gray-9)',
              }}
            >
              {title || 'Untitled'}
            </Heading>
            <IconButton
              size="2"
              variant="ghost"
              color="gray"
              aria-label="Edit title"
              title="Edit title"
              onClick={handleStartEditTitle}
            >
              <Pencil1Icon width="16" height="16" />
            </IconButton>
          </Flex>
        )}

        <Flex align="center" gap="2" mt="2">
          <Badge color={entryType === 'post' ? 'iris' : 'blue'}>
            {entryType.toUpperCase()}
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

      <Tabs.Root defaultValue="content" onValueChange={handleTabChange}>
          <Tabs.List mb="4">
            <Tabs.Trigger value="content">Content</Tabs.Trigger>
            <Tabs.Trigger value="metadata">Metadata</Tabs.Trigger>
            <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="content">
            <Flex direction="column" gap="4">

              <Box>
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
                      /{entryType === 'post' ? 'post/' : ''}
                    </Text>
                  </TextField.Slot>
                </TextField.Root>
              </Box>

              <Box>
                <Flex justify="between" align="center" mb="1">
                  <Text as="label" size="2" weight="bold">
                    Body Content (Markdown/HTML)
                  </Text>
                  <Button
                    type="button"
                    size="1"
                    variant="soft"
                    color="iris"
                    onClick={() => setPickerTarget('content')}
                  >
                    Insert Image
                  </Button>
                </Flex>
                <TextArea
                  placeholder="Write your markdown or HTML content here..."
                  value={content}
                  onChange={(e) => {
                    setContent(e.target.value);
                    setCursorPos(e.target.selectionStart);
                  }}
                  onSelect={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  onClick={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  onKeyUp={(e) => setCursorPos(e.currentTarget.selectionStart)}
                  style={{ minHeight: '400px', fontFamily: 'monospace', fontSize: '14px' }}
                />
              </Box>
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="metadata">
            <Grid columns={{ initial: '1', sm: '2' }} gap="4">
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
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

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Tags (comma separated)
                </Text>
                <TextField.Root
                  size="2"
                  placeholder="tech, news"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Category
                </Text>
                <TextField.Root
                  size="2"
                  placeholder="Category..."
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Cover Image URL
                </Text>
                <Flex align="center" gap="2" wrap="wrap">
                  <Button
                    type="button"
                    variant="soft"
                    color="iris"
                    onClick={() => setPickerTarget('cover')}
                  >
                    Select Image
                  </Button>
                  {coverImage && (
                    <Flex align="center" gap="2">
                      <Text size="2" color="gray" style={{ wordBreak: 'break-all' }}>
                        {coverImage}
                      </Text>
                      <Button
                        type="button"
                        variant="ghost"
                        color="red"
                        size="1"
                        onClick={() => setCoverImage('')}
                      >
                        Remove
                      </Button>
                    </Flex>
                  )}
                </Flex>
              </Box>
              
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Meta Description
                </Text>
                <TextArea
                  size="2"
                  placeholder="Brief description for SEO..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Box>

              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Canonical URL
                </Text>
                <TextField.Root
                  size="2"
                  placeholder="https://example.com/..."
                  value={canonicalUrl}
                  onChange={(e) => setCanonicalUrl(e.target.value)}
                />
              </Box>

              <Box style={{ gridColumn: '1 / -1' }}>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Schema JSON
                </Text>
                <TextArea
                  size="2"
                  placeholder='{"@context": "https://schema.org", ...}'
                  value={schemaJson}
                  onChange={(e) => setSchemaJson(e.target.value)}
                  style={{ fontFamily: 'monospace' }}
                />
              </Box>
            </Grid>
          </Tabs.Content>

          <Tabs.Content value="preview">
            <Box
              style={{
                width: '100%',
                minHeight: '600px',
                height: '75vh',
                borderRadius: 'var(--radius-3)',
                overflow: 'hidden',
                border: '1px solid var(--gray-a4)',
                backgroundColor: 'var(--color-surface)',
                position: 'relative',
              }}
            >
              {previewToken ? (
                <iframe
                  title="Preview"
                  src={`/preview/${previewToken}`}
                  style={{
                    width: '100%',
                    height: '100%',
                    border: 'none',
                    display: 'block',
                  }}
                />
              ) : (
                <Flex align="center" justify="center" style={{ height: '100%', minHeight: '400px' }}>
                  <Text color="gray">{isSaving ? 'Generating preview...' : 'No preview available'}</Text>
                </Flex>
              )}
            </Box>
          </Tabs.Content>
      </Tabs.Root>

      <MediaPickerModal
        open={pickerTarget !== null}
        onClose={() => setPickerTarget(null)}
        onSelect={handleMediaSelect}
      />
    </Box>
  );
};

export default Editor;
