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
  Select,
  Card,
} from '@radix-ui/themes';
import {
  ArrowLeftIcon,
  CheckIcon,
  Cross2Icon,
  Pencil1Icon,
  CaretUpIcon,
  CaretDownIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import { MediaPickerModal } from '../components/MediaPickerModal';
import { RichTextEditor } from '../components/RichTextEditor';
import { SectionFieldRenderer } from '../components/SectionFieldRenderer';
import { SectionTemplate, SectionInstance, SectionTemplateField } from '../types/sectionTemplate';
import { useQuery, useMutation } from '@tanstack/react-query';
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

  const [previewToken, setPreviewToken] = useState<string | null>(null);

  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [canonicalUrl, setCanonicalUrl] = useState('');
  const [schemaJson, setSchemaJson] = useState('');
  const [sections, setSections] = useState<SectionInstance[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<number, boolean>>({});

  // Unified media picker callback
  const [mediaPickerCallback, setMediaPickerCallback] = useState<((url: string, altText?: string) => void) | null>(null);

  const handleOpenMediaPicker = (callback: (url: string, altText?: string) => void) => {
    setMediaPickerCallback(() => callback);
  };

  const handleMediaSelect = (url: string, altText: string) => {
    if (mediaPickerCallback) {
      mediaPickerCallback(url, altText);
    }
    setMediaPickerCallback(null);
  };

  const { data: sectionTemplates = [] } = useQuery<SectionTemplate[]>({
    queryKey: ['sectionTemplates'],
    queryFn: async () => {
      const res = await apiFetch('/api/section-templates');
      if (!res.ok) throw new Error('Failed to fetch section templates');
      return res.json();
    },
  });

  const { data: entryData } = useQuery({
    queryKey: ['editorEntry', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/admin/editor/${id}`);
      if (!res.ok) throw new Error('Failed to fetch entry');
      return res.json();
    },
    enabled: isEditing,
  });

  const isInitialized = React.useRef(false);

  React.useEffect(() => {
    if (entryData && !isInitialized.current) {
      isInitialized.current = true;
      if (entryData.entry) {
        setTitle(entryData.entry.title || '');
        setSlug(entryData.entry.slug || '');
        setStatus(entryData.entry.status || 'draft');
        setEntryType(entryData.entry.type || 'post');
        setContent(entryData.entry.body_html || '');
        setTags(entryData.entry.tags || '');
        setDescription(entryData.entry.description || '');
        setCategory(entryData.entry.category || '');
        setCoverImage(entryData.entry.cover_image || '');
        setCanonicalUrl(entryData.entry.canonical_url || '');
        setSchemaJson(entryData.entry.schema_json || '');
        if (entryData.entry.body_json) {
          try {
            const parsed = JSON.parse(entryData.entry.body_json);
            if (Array.isArray(parsed)) setSections(parsed);
          } catch (e) {
            console.error('Failed to parse body_json', e);
          }
        }
      }
      if (entryData.latest_revision?.preview_token) {
        setPreviewToken(entryData.latest_revision.preview_token);
      }
    }
  }, [entryData]);

  React.useEffect(() => {
    isInitialized.current = false;
  }, [id]);

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

  const saveMutation = useMutation({
    mutationFn: async ({ payload, method, url }: any) => {
      const res = await apiFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const errData = await res.text();
        throw new Error(errData || 'Save failed');
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      setStatus(variables.finalStatus);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2500);
      if (data.preview_token) {
        setPreviewToken(data.preview_token);
      }
      if (!isEditing && data.id) {
        navigate('/editor/' + data.id + '?type=' + entryType, { replace: true });
      }
    },
  });

  const handleSave = async (publish = false, isPreview = false): Promise<string | null> => {
    const finalStatus = isPreview ? status : publish ? 'published' : 'draft';

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
      body_html: entryType === 'page' ? '' : content,
      body_json: entryType === 'page' ? JSON.stringify(sections) : '{}',
      tags,
    };

    if (isEditing && isPreview) {
      payload.draft_only = true;
    }

    const url = isEditing ? `/api/entries/${id}` : `/api/entries`;
    const method = isEditing ? 'PUT' : 'POST';

    try {
      const data = await saveMutation.mutateAsync({ payload, method, url, finalStatus });
      return data.preview_token || null;
    } catch (err) {
      console.error(err);
      return null;
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

            {entryType === 'post' ? (
              <Box>
                <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                  Body Content
                </Text>
                <RichTextEditor
                  value={content}
                  onChange={setContent}
                  onOpenMediaPicker={handleOpenMediaPicker}
                  minHeight="400px"
                  aria-label="Post Body"
                />
              </Box>
            ) : (
              <Box>
                <Flex justify="between" align="center" mb="4">
                  <Text as="label" size="2" weight="bold">
                    Page Sections
                  </Text>
                  <Select.Root
                    onValueChange={(typeId) => {
                      setSections([...sections, { type_id: typeId, data: {} }]);
                      setExpandedSections({ ...expandedSections, [sections.length]: true });
                    }}
                  >
                    <Select.Trigger placeholder="Add Section..." />
                    <Select.Content>
                      {sectionTemplates.map((st) => (
                        <Select.Item key={st.id} value={st.id}>
                          {st.name}
                        </Select.Item>
                      ))}
                    </Select.Content>
                  </Select.Root>
                </Flex>

                <Flex direction="column" gap="3">
                  {sections.length === 0 && (
                    <Text size="2" color="gray">
                      No sections added yet. Click &quot;Add Section...&quot; above to add one.
                    </Text>
                  )}
                  {sections.map((section, index) => {
                    const template = sectionTemplates.find((t) => t.id === section.type_id);
                    const isMissing = !template;

                    let fields: SectionTemplateField[] = [];
                    if (template && template.schema_json) {
                      try {
                        fields =
                          typeof template.schema_json === 'string'
                            ? JSON.parse(template.schema_json)
                            : template.schema_json;
                      } catch (e) {
                        console.error('Failed to parse schema_json for template', template.id, e);
                      }
                    }

                    const isExpanded = expandedSections[index] ?? true;

                    return (
                      <Card key={index} variant="surface" style={{ padding: 0, overflow: 'hidden' }}>
                        <Flex
                          align="center"
                          justify="between"
                          p="3"
                          style={{
                            borderBottom: isExpanded ? '1px solid var(--gray-a4)' : 'none',
                            backgroundColor: 'var(--gray-a2)',
                          }}
                        >
                          <Flex align="center" gap="3">
                            <IconButton
                              size="1"
                              variant="ghost"
                              type="button"
                              aria-label={isExpanded ? 'Collapse section' : 'Expand section'}
                              onClick={() =>
                                setExpandedSections({ ...expandedSections, [index]: !isExpanded })
                              }
                            >
                              {isExpanded ? <ChevronDownIcon /> : <ChevronRightIcon />}
                            </IconButton>
                            {isMissing ? (
                              <Flex align="center" gap="2">
                                <Text weight="bold" size="2" color="red">
                                  Missing template
                                </Text>
                                <Text size="1" color="gray">
                                  ({section.type_id})
                                </Text>
                              </Flex>
                            ) : (
                              <Text weight="bold" size="2">
                                {template.name}
                              </Text>
                            )}
                          </Flex>

                          <Flex gap="2">
                            <IconButton
                              size="1"
                              variant="soft"
                              type="button"
                              disabled={index === 0}
                              aria-label="Move section up"
                              title="Move Up"
                              onClick={() => {
                                const newSections = [...sections];
                                const temp = newSections[index - 1];
                                newSections[index - 1] = newSections[index];
                                newSections[index] = temp;
                                setSections(newSections);
                              }}
                            >
                              <CaretUpIcon />
                            </IconButton>
                            <IconButton
                              size="1"
                              variant="soft"
                              type="button"
                              disabled={index === sections.length - 1}
                              aria-label="Move section down"
                              title="Move Down"
                              onClick={() => {
                                const newSections = [...sections];
                                const temp = newSections[index + 1];
                                newSections[index + 1] = newSections[index];
                                newSections[index] = temp;
                                setSections(newSections);
                              }}
                            >
                              <CaretDownIcon />
                            </IconButton>
                            <IconButton
                              size="1"
                              variant="soft"
                              color="red"
                              type="button"
                              aria-label="Delete section"
                              title="Delete Section"
                              onClick={() => {
                                setSections(sections.filter((_, i) => i !== index));
                              }}
                            >
                              <TrashIcon />
                            </IconButton>
                          </Flex>
                        </Flex>

                        {isExpanded && (
                          <Box p="4">
                            {isMissing ? (
                              <Text size="2" color="red">
                                This section uses a template ({section.type_id}) that cannot be found. You can remove it using the delete button above.
                              </Text>
                            ) : (
                              <SectionFieldRenderer
                                fields={fields}
                                data={section.data || {}}
                                onChange={(newData) => {
                                  const newSections = [...sections];
                                  newSections[index] = {
                                    ...newSections[index],
                                    data: newData,
                                  };
                                  setSections(newSections);
                                }}
                                onOpenMediaPicker={handleOpenMediaPicker}
                              />
                            )}
                          </Box>
                        )}
                      </Card>
                    );
                  })}
                </Flex>
              </Box>
            )}
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
                  onClick={() => handleOpenMediaPicker((url) => setCoverImage(url))}
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
                <Text color="gray">{saveMutation.isPending ? 'Generating preview...' : 'No preview available'}</Text>
              </Flex>
            )}
          </Box>
        </Tabs.Content>
      </Tabs.Root>

      <MediaPickerModal
        open={mediaPickerCallback !== null}
        onClose={() => setMediaPickerCallback(null)}
        onSelect={handleMediaSelect}
      />
    </Box>
  );
};

export default Editor;
