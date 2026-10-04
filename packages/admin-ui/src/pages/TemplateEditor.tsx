import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  Tabs,
  TextField,
  TextArea,
  Switch,
  Dialog,
  Callout,
  Tooltip,
  Badge,
} from '@radix-ui/themes';
import {
  ArrowLeftIcon,
  LockClosedIcon,
  LockOpen1Icon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';
import { apiFetch } from '../utils/api';
import { TemplateItem } from './TemplatesList';

export const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNew = !id || id === 'new';

  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formSchemaJson, setFormSchemaJson] = useState('[\n]');
  const [formTemplateHtml, setFormTemplateHtml] = useState('');
  const [formTemplateCss, setFormTemplateCss] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const [activeTab, setActiveTab] = useState('schema');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // 409 Conflict Dialog state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  // Fetch role of logged-in user
  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch user');
      return res.json();
    },
  });

  const role = meData?.role?.toLowerCase() || 'author';
  const isAdmin = role === 'admin';
  const isDesigner = role === 'designer';

  // Fetch template data if editing existing template
  const {
    data: template,
    isLoading: isLoadingTemplate,
    error: loadError,
  } = useQuery<TemplateItem>({
    queryKey: ['content-type', id],
    queryFn: async () => {
      const res = await apiFetch(`/api/content-types/${id}`);
      if (!res.ok) throw new Error(`Failed to load template "${id}"`);
      return res.json();
    },
    enabled: !isNew,
  });

  // Populate form state when template loads
  useEffect(() => {
    if (template && !isNew) {
      setFormId(template.id || '');
      setFormName(template.name || '');
      setFormDescription(template.description || '');
      setFormSchemaJson(template.schema_json || '[\n]');
      setFormTemplateHtml(template.template_html || '');
      setFormTemplateCss(template.template_css || '');
      setIsLocked(Boolean(template.is_locked));
    }
  }, [template, isNew]);

  const handleSave = async (force: boolean = false) => {
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    const targetId = (isNew ? formId : id || '').trim();
    if (!targetId) {
      setSaveError('Template Identifier (Slug) is required.');
      setIsSaving(false);
      return;
    }
    if (!formName.trim()) {
      setSaveError('Template Name is required.');
      setIsSaving(false);
      return;
    }

    const method = isNew ? 'POST' : 'PUT';
    const queryParam = force ? '?force=true' : '';
    const endpoint = `/api/content-types/${targetId}${queryParam}`;

    const payload = {
      name: formName.trim(),
      description: formDescription.trim() || null,
      schema_json: formSchemaJson,
      template_html: formTemplateHtml || null,
      template_css: formTemplateCss || null,
      is_locked: isLocked,
      ...(force ? { force: true } : {}),
    };

    try {
      const res = await apiFetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Guardrail: Intercept 409 Conflict
      if (res.status === 409) {
        const errorData = await res.json().catch(() => ({}));
        const msg =
          errorData.error ||
          errorData.message ||
          'Conflict detected: Breaking changes or selector collisions found.';
        setConflictMessage(msg);
        setConflictModalOpen(true);
        setIsSaving(false);
        return;
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `Failed to save template (${res.status})`
        );
      }

      // Success
      setConflictModalOpen(false);
      setSaveSuccess(true);
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      queryClient.invalidateQueries({ queryKey: ['content-type', targetId] });

      if (isNew) {
        navigate(`/admin/templates/${targetId}`, { replace: true });
      }
    } catch (err: any) {
      setSaveError(err.message || 'An unexpected error occurred while saving the template.');
    } finally {
      setIsSaving(false);
    }
  };

  const isLockedForDesigner = isDesigner && isLocked;
  const lockedTooltipText =
    'This core template is locked. Please reach out to an admin if you need to make a change.';

  if (isLoadingTemplate && !isNew) {
    return (
      <Box style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Text color="gray">Loading template details...</Text>
      </Box>
    );
  }

  if (loadError && !isNew) {
    return (
      <Box style={{ maxWidth: '1000px', margin: '0 auto' }}>
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {loadError instanceof Error ? loadError.message : 'Failed to load template'}
          </Callout.Text>
        </Callout.Root>
        <Button variant="soft" color="gray" onClick={() => navigate('/admin/templates')}>
          <ArrowLeftIcon /> Back to Templates
        </Button>
      </Box>
    );
  }

  return (
    <Box style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Flex align="center" gap="3">
          <Button variant="ghost" color="gray" onClick={() => navigate('/admin/templates')}>
            <ArrowLeftIcon width="16" height="16" />
            Back
          </Button>
          <Box>
            <Heading size="6" weight="bold">
              {isNew ? 'New Template' : `Edit Template: ${formName || formId}`}
            </Heading>
            <Text size="2" color="gray">
              {isNew
                ? 'Create a custom template with schema, markup, and styling'
                : `Editing content type identifier "${formId}"`}
            </Text>
          </Box>
        </Flex>

        <Flex align="center" gap="4">
          {/* Lock Template toggle: ONLY render if user has the admin role */}
          {isAdmin && (
            <Flex align="center" gap="2">
              {isLocked ? (
                <LockClosedIcon width="16" height="16" color="var(--amber-10)" />
              ) : (
                <LockOpen1Icon width="16" height="16" color="var(--gray-9)" />
              )}
              <Text as="label" htmlFor="template-lock-switch" size="2" weight="medium">
                Lock Template
              </Text>
              <Switch
                id="template-lock-switch"
                checked={isLocked}
                onCheckedChange={setIsLocked}
                aria-label="Lock Template"
              />
            </Flex>
          )}

          {/* Designer lock status badge if locked */}
          {isDesigner && isLocked && (
            <Badge color="amber" variant="soft">
              <LockClosedIcon width="12" height="12" />
              Locked Core Template
            </Badge>
          )}

          {/* Save Button */}
          {isLockedForDesigner ? (
            <Tooltip content={lockedTooltipText}>
              <span style={{ display: 'inline-flex' }}>
                <Button variant="solid" color="iris" disabled={true} aria-label="Save Template">
                  Save Template
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="solid"
              color="iris"
              disabled={isSaving || !formName || (isNew && !formId)}
              onClick={() => handleSave(false)}
              aria-label="Save Template"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          )}
        </Flex>
      </Flex>

      {/* Designer Notice if locked */}
      {isLockedForDesigner && (
        <Callout.Root color="amber" mb="4">
          <Callout.Icon>
            <LockClosedIcon />
          </Callout.Icon>
          <Callout.Text>{lockedTooltipText}</Callout.Text>
        </Callout.Root>
      )}

      {/* Success Notification */}
      {saveSuccess && (
        <Callout.Root color="green" mb="4">
          <Callout.Icon>
            <CheckCircledIcon />
          </Callout.Icon>
          <Callout.Text>Template saved successfully!</Callout.Text>
        </Callout.Root>
      )}

      {/* Error Notification */}
      {saveError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{saveError}</Callout.Text>
        </Callout.Root>
      )}

      {/* Basic Metadata Card */}
      <Card size="2" mb="4">
        <Flex direction="column" gap="3">
          <Flex gap="4">
            <Box style={{ flex: 1 }}>
              <Text as="div" size="2" mb="1" weight="bold">
                Identifier (Slug)
              </Text>
              <TextField.Root
                value={formId}
                onChange={(e) => setFormId(e.target.value)}
                placeholder="e.g. hero-banner"
                disabled={!isNew || isLockedForDesigner}
                aria-label="Identifier (Slug)"
              />
            </Box>

            <Box style={{ flex: 2 }}>
              <Text as="div" size="2" mb="1" weight="bold">
                Template Name
              </Text>
              <TextField.Root
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. Hero Banner"
                disabled={isLockedForDesigner}
                aria-label="Template Name"
              />
            </Box>
          </Flex>

          <Box>
            <Text as="div" size="2" mb="1" weight="bold">
              Description
            </Text>
            <TextField.Root
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Optional summary or usage instructions"
              disabled={isLockedForDesigner}
              aria-label="Description"
            />
          </Box>
        </Flex>
      </Card>

      {/* Multi-Tab Editor Card */}
      <Card size="2">
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List mb="4">
            <Tabs.Trigger value="schema">Schema (JSON)</Tabs.Trigger>
            <Tabs.Trigger value="html">HTML (MiniJinja)</Tabs.Trigger>
            <Tabs.Trigger value="css">CSS</Tabs.Trigger>
          </Tabs.List>

          {/* Tab 1: Schema (JSON) */}
          <Tabs.Content value="schema">
            <Box mb="2">
              <Text as="div" size="2" weight="bold" mb="1">
                Schema Definition (JSON)
              </Text>
              <Text size="1" color="gray" mb="2" as="div">
                Array of field objects defining attributes for this template.
              </Text>
              <TextArea
                value={formSchemaJson}
                onChange={(e) => setFormSchemaJson(e.target.value)}
                placeholder='[{"name": "headline", "type": "text", "label": "Headline", "required": true}]'
                rows={16}
                disabled={isLockedForDesigner}
                style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                aria-label="Schema (JSON)"
              />
            </Box>
          </Tabs.Content>

          {/* Tab 2: HTML (MiniJinja) */}
          <Tabs.Content value="html">
            <Box mb="2">
              <Text as="div" size="2" weight="bold" mb="1">
                HTML Template (MiniJinja)
              </Text>
              <Text size="1" color="gray" mb="2" as="div">
                Template markup rendered via MiniJinja with access to schema fields.
              </Text>
              <TextArea
                value={formTemplateHtml}
                onChange={(e) => setFormTemplateHtml(e.target.value)}
                placeholder='<section class="hero">
  <h1>{{ headline }}</h1>
</section>'
                rows={16}
                disabled={isLockedForDesigner}
                style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                aria-label="HTML (MiniJinja)"
              />
            </Box>
          </Tabs.Content>

          {/* Tab 3: CSS */}
          <Tabs.Content value="css">
            <Box mb="2">
              <Text as="div" size="2" weight="bold" mb="1">
                CSS Stylesheet
              </Text>
              <Text size="1" color="gray" mb="2" as="div">
                Scoped CSS styles. Class selectors will be extracted automatically to prevent collisions.
              </Text>
              <TextArea
                value={formTemplateCss}
                onChange={(e) => setFormTemplateCss(e.target.value)}
                placeholder='.hero {
  padding: 3rem 1rem;
  text-align: center;
}'
                rows={16}
                disabled={isLockedForDesigner}
                style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                aria-label="CSS"
              />
            </Box>
          </Tabs.Content>
        </Tabs.Root>
      </Card>

      {/* Radix UI Modal: 409 Conflict Guardrail */}
      <Dialog.Root open={conflictModalOpen} onOpenChange={setConflictModalOpen}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title color="red">Conflict Detected</Dialog.Title>
          <Dialog.Description size="2" mb="3" color="gray">
            The server encountered a conflict while saving this template:
          </Dialog.Description>

          <Box
            p="3"
            mb="4"
            style={{
              backgroundColor: 'var(--red-a2)',
              border: '1px solid var(--red-a6)',
              borderRadius: 'var(--radius-2)',
            }}
          >
            <Text size="2" color="red" style={{ whiteSpace: 'pre-wrap', fontFamily: 'sans-serif' }}>
              {conflictMessage}
            </Text>
          </Box>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray" disabled={isSaving}>
                Cancel
              </Button>
            </Dialog.Close>
            {/* Destructively styled (red) Force Save button */}
            <Button
              color="red"
              variant="solid"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              aria-label="Force Save"
            >
              {isSaving ? 'Force Saving...' : 'Force Save'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </Box>
  );
};

export default TemplateEditor;
