import React, { useState, useEffect, useRef } from 'react';
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
  LockClosedIcon,
  LockOpen1Icon,
  ExclamationTriangleIcon,
  CheckCircledIcon,
} from '@radix-ui/react-icons';
import { apiFetch } from '../utils/api';
import { TemplateItem } from './TemplatesList';
import { VisualFieldBuilder } from '../components/VisualFieldBuilder';
import { SectionTemplateField } from '../types/sectionTemplate';
import { BackButton } from '../components/BackButton';
import { useUnsavedChangesBlocker } from '../hooks/useUnsavedChangesBlocker';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';
import { AiContextInstructions } from '../components/AiContextInstructions';
import { useDebounce } from '../hooks/useDebounce';
import { generateDummyDataFromSchema } from '../utils/dummyData';
import { ResetIcon } from '@radix-ui/react-icons';

export const TemplateEditor: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const isNew = !id || id === 'new';

  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<SectionTemplateField[]>([]);
  const [formSchemaJson, setFormSchemaJson] = useState('[\n]');
  const [formTemplateHtml, setFormTemplateHtml] = useState('');
  const [formTemplateCss, setFormTemplateCss] = useState('');
  const [isLocked, setIsLocked] = useState(false);

  const [activeTab, setActiveTab] = useState('schema');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Wasm Preview State
  const workerRef = useRef<Worker | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [hasDraft, setHasDraft] = useState(false);
  const [isDiscardModalOpen, setIsDiscardModalOpen] = useState(false);

  // Debounced values
  const debouncedWasmHtml = useDebounce(formTemplateHtml, 200);
  const debouncedWasmSchema = useDebounce(formSchemaJson, 200);
  
  const debouncedDraftHtml = useDebounce(formTemplateHtml, 2500);
  const debouncedDraftCss = useDebounce(formTemplateCss, 2500);
  const debouncedDraftSchema = useDebounce(formSchemaJson, 2500);

  // 409 Conflict Dialog state
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');

  // 400 Warning Dialog state
  const [warningModalOpen, setWarningModalOpen] = useState(false);
  const [warningList, setWarningList] = useState<string[]>([]);

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
      const rawSchema = template.schema_json || '[\n]';
      setFormSchemaJson(rawSchema);
      try {
        const parsed = JSON.parse(rawSchema);
        setFields(Array.isArray(parsed) ? parsed : []);
      } catch {
        setFields([]);
      }
      setFormTemplateHtml(template.template_html || '');
      setFormTemplateCss(template.template_css || '');
      setIsLocked(Boolean(template.is_locked));
      setSavedSnapshot(
        JSON.stringify({
          formId: template.id || '',
          formName: template.name || '',
          formDescription: template.description || '',
          formSchemaJson: rawSchema,
          formTemplateHtml: template.template_html || '',
          formTemplateCss: template.template_css || '',
          isLocked: Boolean(template.is_locked),
        })
      );
    }
  }, [template, isNew]);

  // 1. Initialize Web Worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/templateWasmWorker.ts', import.meta.url), { type: 'module' });
    workerRef.current.onmessage = (e) => {
      if (e.data.success) {
        setPreviewHtml(e.data.result);
      } else {
        console.error("Wasm Render Error:", e.data.error);
      }
    };
    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // 2. Fast Debounce -> Trigger Wasm Preview
  useEffect(() => {
    if (workerRef.current) {
      const dummyData = generateDummyDataFromSchema(debouncedWasmSchema);
      workerRef.current.postMessage({
        html: debouncedWasmHtml,
        dummyDataJson: dummyData,
        id: formId || 'preview'
      });
    }
  }, [debouncedWasmHtml, debouncedWasmSchema, formId]);

  // 3. Slow Debounce -> Auto-Save Draft
  useEffect(() => {
    if (isLoadingTemplate) return;
    if (!formId && !isNew) return;
    
    // Prevent saving draft if unchanged from DB
    if (template) {
      if (
        formTemplateHtml === (template.template_html || '') &&
        formTemplateCss === (template.template_css || '') &&
        formSchemaJson === (template.schema_json || '[]')
      ) {
        return;
      }
    }

    const draftKey = `zygo_template_draft_${id || 'new'}`;
    const draftData = {
      template_html: debouncedDraftHtml,
      template_css: debouncedDraftCss,
      schema_json: debouncedDraftSchema,
      updated_at: new Date().toISOString()
    };
    localStorage.setItem(draftKey, JSON.stringify(draftData));
    setHasDraft(true);
  }, [debouncedDraftHtml, debouncedDraftCss, debouncedDraftSchema, id, isLoadingTemplate, template, formTemplateHtml, formTemplateCss, formSchemaJson]);

  // 4. On Mount -> Load Draft
  useEffect(() => {
    const draftKey = `zygo_template_draft_${id || 'new'}`;
    const saved = localStorage.getItem(draftKey);
    if (saved) {
      try {
        const draft = JSON.parse(saved);
        setFormTemplateHtml(draft.template_html || '');
        setFormTemplateCss(draft.template_css || '');
        setFormSchemaJson(draft.schema_json || '[]');
        setHasDraft(true);
      } catch (e) {
        console.error("Failed to load draft", e);
      }
    }
  }, [id]);

  const discardDraft = () => {
    const draftKey = `zygo_template_draft_${id || 'new'}`;
    localStorage.removeItem(draftKey);
    setHasDraft(false);
    setIsDiscardModalOpen(false);
    
    if (template) {
      setFormTemplateHtml(template.template_html || '');
      setFormTemplateCss(template.template_css || '');
      setFormSchemaJson(template.schema_json || '[]');
    } else {
      setFormTemplateHtml('');
      setFormTemplateCss('');
      setFormSchemaJson('[]');
    }
  };

  // Unsaved-changes tracking: compare current fields against the last loaded/saved snapshot.
  const latestFields = React.useRef<Record<string, unknown>>({});
  latestFields.current = {
    formId,
    formName,
    formDescription,
    formSchemaJson,
    formTemplateHtml,
    formTemplateCss,
    isLocked,
  };
  const currentSnapshot = JSON.stringify(latestFields.current);
  const [savedSnapshot, setSavedSnapshot] = useState<string | null>(null);

  useEffect(() => {
    if (isNew) setSavedSnapshot((prev) => prev ?? currentSnapshot);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNew]);

  const isDirty = savedSnapshot !== null && currentSnapshot !== savedSnapshot;
  const { blocker, allowNextNavigation } = useUnsavedChangesBlocker(isDirty);

  const handleFieldsChange = (newFields: SectionTemplateField[]) => {
    setFields(newFields);
    setFormSchemaJson(JSON.stringify(newFields, null, 2));
  };

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

      // Intercept 400 Warnings (requires_confirmation)
      if (res.status === 400) {
        const errorData = await res.json().catch(() => ({}));
        if (
          errorData.requires_confirmation &&
          Array.isArray(errorData.warnings) &&
          errorData.warnings.length > 0
        ) {
          setWarningList(errorData.warnings);
          setWarningModalOpen(true);
          setIsSaving(false);
          return;
        }
        throw new Error(
          errorData.error || errorData.message || `Failed to save template (${res.status})`
        );
      }

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || errorData.message || `Failed to save template (${res.status})`
        );
      }

      // Success
      setConflictModalOpen(false);
      setWarningModalOpen(false);
      setSaveSuccess(true);
      setSavedSnapshot(JSON.stringify(latestFields.current));
      queryClient.invalidateQueries({ queryKey: ['content-types'] });
      queryClient.invalidateQueries({ queryKey: ['content-type', targetId] });
      
      // Clear draft on successful save
      const draftKey = `zygo_template_draft_${id || 'new'}`;
      localStorage.removeItem(draftKey);
      setHasDraft(false);

      if (isNew) {
        allowNextNavigation();
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
      <Box style={{ width: '100%' }}>
        <Text color="gray">Loading template details...</Text>
      </Box>
    );
  }

  if (loadError && !isNew) {
    return (
      <Box style={{ width: '100%' }}>
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>
            {loadError instanceof Error ? loadError.message : 'Failed to load template'}
          </Callout.Text>
        </Callout.Root>
        <BackButton to="/admin/templates" label="Back to Templates" />
      </Box>
    );
  }

  return (
    <Box style={{ width: '100%', display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Top navigation row */}
      <Flex justify="between" align="center" mb="4">
        <BackButton to="/admin/templates" />
      </Flex>

      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Flex align="center" gap="2">
            <Heading size="6" weight="bold">
              {isNew ? 'New Template' : `Edit Template: ${formName || formId}`}
            </Heading>
            <AiContextInstructions instructions={`**AI Assistant Instructions:**
You are an in-browser AI helping the user build this template component.
- **Schema**: Defines the data model. To add a field, click 'Add Field' or modify the underlying JSON.
- **HTML**: Uses MiniJinja (Rust) syntax. Use standard HTML with \`class=\` (NOT \`className\`). Inject schema variables using \`{{ field_name }}\` or \`{% for item in list_field %}\`.
- **CSS**: Standard CSS.

When the user asks for a change, simply write your updates into the respective textarea elements or schema inputs. Your changes will automatically trigger a real-time Wasm preview on the right side of the screen. Do not hit 'Save' unless explicitly asked; let the user review your changes via the live preview first.`} />
          </Flex>
          <Text size="2" color="gray">
            {isNew
              ? 'Create a custom template with schema, markup, and styling'
              : `Editing content type identifier "${formId}"`}
          </Text>
        </Box>

        <Flex align="center" gap="4">
          {/* Lock Template toggle: ONLY render if user has the admin role */}
          {isAdmin && (
            <Flex align="center" gap="2">
              {isLocked ? (
                <LockClosedIcon width="18" height="18" color="var(--amber-10)" />
              ) : (
                <LockOpen1Icon width="18" height="18" color="var(--gray-9)" />
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

          {hasDraft && (
            <Flex align="center" gap="3">
              <Badge color="orange" variant="soft">Draft Unsaved</Badge>
              <Button variant="soft" color="red" onClick={() => setIsDiscardModalOpen(true)}>
                <ResetIcon width="18" height="18" /> Discard
              </Button>
            </Flex>
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

      {/* Split-Pane Editor & Preview */}
      <Flex gap="4" direction={{ initial: 'column', md: 'row' }} align="stretch" style={{ flexGrow: 1, minHeight: 0 }}>
        
        {/* Left Pane: Metadata & Multi-Tab Editor */}
        <Flex direction="column" gap="4" style={{ flexShrink: 0, width: '100%', maxWidth: '600px', minWidth: 0 }}>
          
          {/* Basic Metadata Card */}
          <Card size="2">
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

          <Card size="2" style={{ flexGrow: 1 }}>
            <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
              <Tabs.List mb="4">
                <Tabs.Trigger value="schema">Schema</Tabs.Trigger>
                <Tabs.Trigger value="html">HTML (MiniJinja)</Tabs.Trigger>
                <Tabs.Trigger value="css">CSS</Tabs.Trigger>
              </Tabs.List>

              <Tabs.Content value="schema">
                <Box mb="2">
                  <Text as="div" size="2" weight="bold" mb="1">Schema Definition</Text>
                  <VisualFieldBuilder fields={fields} onChange={handleFieldsChange} disabled={isLockedForDesigner} />
                </Box>
              </Tabs.Content>

              <Tabs.Content value="html">
                <Box mb="2">
                  <Text as="div" size="2" weight="bold" mb="1">HTML Template (MiniJinja)</Text>
                  <TextArea
                    value={formTemplateHtml}
                    onChange={(e) => setFormTemplateHtml(e.target.value)}
                    rows={20}
                    disabled={isLockedForDesigner}
                    style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                  />
                </Box>
              </Tabs.Content>

              <Tabs.Content value="css">
                <Box mb="2">
                  <Text as="div" size="2" weight="bold" mb="1">CSS Stylesheet</Text>
                  <TextArea
                    value={formTemplateCss}
                    onChange={(e) => setFormTemplateCss(e.target.value)}
                    rows={20}
                    disabled={isLockedForDesigner}
                    style={{ fontFamily: 'monospace', fontSize: '13px', width: '100%' }}
                  />
                </Box>
              </Tabs.Content>
            </Tabs.Root>
          </Card>
        </Flex>

        {/* Right Pane: Live Wasm Preview */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Card size="2" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Text as="div" size="2" weight="bold" mb="2">Live Preview (Wasm)</Text>
            <Box style={{ flexGrow: 1, minHeight: '500px', backgroundColor: '#fff', border: '1px solid var(--gray-5)', borderRadius: 'var(--radius-2)', overflow: 'hidden' }}>
              <iframe
                title="Wasm Preview"
                sandbox="allow-scripts"
                srcDoc={`
                  <!DOCTYPE html>
                  <html>
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <link rel="stylesheet" href="/styles/main.css" />
                      <style>${debouncedWasmHtml !== formTemplateHtml ? formTemplateCss : debouncedWasmHtml /* just to trigger reactivity if needed */} ${formTemplateCss}</style>
                    </head>
                    <body>
                      ${previewHtml || '<div style="padding: 20px; color: #888; font-family: sans-serif;">Waiting for template render...</div>'}
                    </body>
                  </html>
                `}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            </Box>
          </Card>
        </Box>
      </Flex>

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

      {/* Radix UI Modal: 400 Warnings Confirmation Dialog */}
      <Dialog.Root open={warningModalOpen} onOpenChange={setWarningModalOpen}>
        <Dialog.Content maxWidth="520px">
          <Dialog.Title color="amber">Template Warnings</Dialog.Title>
          <Dialog.Description size="2" mb="3" color="gray">
            The template has validation warnings that require confirmation:
          </Dialog.Description>

          <Callout.Root color="amber" mb="4">
            <Callout.Icon>
              <ExclamationTriangleIcon />
            </Callout.Icon>
            <Callout.Text>
              <ul style={{ margin: 0, paddingLeft: '1.2rem' }}>
                {warningList.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </Callout.Text>
          </Callout.Root>

          <Flex gap="3" justify="end">
            <Dialog.Close>
              <Button
                variant="soft"
                color="gray"
                disabled={isSaving}
                onClick={() => setWarningModalOpen(false)}
              >
                Cancel
              </Button>
            </Dialog.Close>
            <Button
              color="amber"
              variant="solid"
              disabled={isSaving}
              onClick={() => handleSave(true)}
              aria-label="Save Anyway"
            >
              {isSaving ? 'Saving...' : 'Save Anyway'}
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Radix UI Modal: Discard Draft Confirmation */}
      <Dialog.Root open={isDiscardModalOpen} onOpenChange={setIsDiscardModalOpen}>
        <Dialog.Content maxWidth="450px">
          <Dialog.Title color="red">Discard Unsaved Draft?</Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            You have unsaved changes stored locally. Are you sure you want to discard them? This action cannot be undone.
          </Dialog.Description>
          <Flex gap="3" justify="end">
            <Button variant="soft" color="gray" onClick={() => setIsDiscardModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={discardDraft}>
              Discard Changes
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      <UnsavedChangesDialog blocker={blocker} />
    </Box>
  );
};

export default TemplateEditor;
