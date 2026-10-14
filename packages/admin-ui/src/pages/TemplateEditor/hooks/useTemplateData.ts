import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { TemplateItem } from '../../TemplatesList';
import type { SectionTemplateField } from '../../../types/sectionTemplate';
import { formatCode } from '../../../components/CodeEditor';
import { useUnsavedChangesBlocker } from '../../../hooks/useUnsavedChangesBlocker';

export function useTemplateData(id: string | undefined, isNew: boolean) {
  const [formId, setFormId] = useState('');
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [fields, setFields] = useState<SectionTemplateField[]>([]);
  const [formSchemaJson, setFormSchemaJson] = useState('[\n]');
  const [formTemplateHtml, setFormTemplateHtml] = useState('');
  const [formTemplateCss, setFormTemplateCss] = useState('');
  const [isLocked, setIsLocked] = useState(false);

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

  // Unsaved-changes tracking: compare current fields against the last loaded/saved snapshot.
  const latestFields = useRef<Record<string, unknown>>({});
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
      const initialHtml = template.template_html || '';
      const initialCss = template.template_css || '';
      setFormTemplateHtml(initialHtml);
      setFormTemplateCss(initialCss);
      Promise.all([
        formatCode(initialHtml, 'html'),
        formatCode(initialCss, 'css'),
      ]).then(([fmtHtml, fmtCss]) => {
        if (fmtHtml !== initialHtml) setFormTemplateHtml(fmtHtml);
        if (fmtCss !== initialCss) setFormTemplateCss(fmtCss);
        if (fmtHtml !== initialHtml || fmtCss !== initialCss) {
          setSavedSnapshot(
            JSON.stringify({
              formId: template.id || '',
              formName: template.name || '',
              formDescription: template.description || '',
              formSchemaJson: rawSchema,
              formTemplateHtml: fmtHtml,
              formTemplateCss: fmtCss,
              isLocked: Boolean(template.is_locked),
            })
          );
        }
      });
      setIsLocked(Boolean(template.is_locked));
      setSavedSnapshot(
        JSON.stringify({
          formId: template.id || '',
          formName: template.name || '',
          formDescription: template.description || '',
          formSchemaJson: rawSchema,
          formTemplateHtml: initialHtml,
          formTemplateCss: initialCss,
          isLocked: Boolean(template.is_locked),
        })
      );
    }
  }, [template, isNew]);

  return {
    formId,
    setFormId,
    formName,
    setFormName,
    formDescription,
    setFormDescription,
    fields,
    setFields,
    formSchemaJson,
    setFormSchemaJson,
    formTemplateHtml,
    setFormTemplateHtml,
    formTemplateCss,
    setFormTemplateCss,
    isLocked,
    setIsLocked,
    isAdmin,
    isDesigner,
    template,
    isLoadingTemplate,
    loadError,
    savedSnapshot,
    setSavedSnapshot,
    latestFields,
    blocker,
    allowNextNavigation,
  };
}
