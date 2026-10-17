import { useEffect, useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../utils/api';
import { ENTRY_TYPE_CONFIG } from '../constants';
import type { EntryFormValues, EntryStatus, EntryType } from '../types';
import { buildEntryPayload } from '../utils/entryForm';

interface UseSaveEntryOptions {
  id: string | undefined;
  isEditing: boolean;
  entryType: EntryType;
  allowNextNavigation: () => void;
  onValidationFailure?: () => void;
}

interface SaveVariables {
  payload: Record<string, unknown>;
  method: 'POST' | 'PUT';
  url: string;
  finalStatus: EntryStatus;
  draftOnly: boolean;
}

interface SaveResponse {
  id?: number | string;
  preview_token?: string;
}

/** Saves the form as draft / published / preview-only and handles post-save form + route updates. */
export const useSaveEntry = ({
  id,
  isEditing,
  entryType,
  allowNextNavigation,
  onValidationFailure,
}: UseSaveEntryOptions) => {
  const queryClient = useQueryClient();
  const { getValues, setValue, reset, trigger, setError } = useFormContext<EntryFormValues>();
  const navigate = useNavigate();
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    if (!isSaved) return;
    const timer = setTimeout(() => setIsSaved(false), 2500);
    return () => clearTimeout(timer);
  }, [isSaved]);

  const mutation = useMutation<SaveResponse, Error, SaveVariables>({
    mutationFn: async ({ payload, method, url }) => {
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
    onSuccess: (data, { payload, finalStatus, draftOnly }) => {
      setValue('status', finalStatus);
      // A real save becomes the new baseline, so the form is no longer dirty.
      if (!draftOnly) {
        reset(getValues(), { keepValues: true, keepErrors: false });
      }
      setIsSaved(true);
      if (!isEditing && data.id) {
        queryClient.setQueryData(['editorEntry', String(data.id)], {
          entry: {
            id: data.id,
            ...payload,
            type: entryType,
            status: finalStatus,
          },
        });
        allowNextNavigation();
        navigate(`${ENTRY_TYPE_CONFIG[entryType].editorPath}/${data.id}`, { replace: true });
      }
    },
  });

  /** Returns the preview token on success, or null on failure. */
  const save = async (publish = false, isPreview = false): Promise<string | null> => {
    const values = getValues();
    const finalStatus: EntryStatus = isPreview ? values.status : publish ? 'published' : 'draft';

    const title = values.title.trim();
    if (title !== values.title) setValue('title', title, { shouldDirty: true });

    const draftOnly = isEditing && isPreview;
    const payload = buildEntryPayload({ ...values, title }, entryType, finalStatus, draftOnly);
    if (!values.slug.trim() && payload.slug !== 'untitled') {
      setValue('slug', String(payload.slug), { shouldDirty: true });
    }

    if (!isPreview) {
      const isValid = await trigger();
      if (!isValid) {
        onValidationFailure?.();
        return null;
      }
    }

    try {
      const data = await mutation.mutateAsync({
        payload,
        method: isEditing ? 'PUT' : 'POST',
        url: isEditing ? `/api/entries/${id}` : '/api/entries',
        finalStatus,
        draftOnly,
      });
      return data.preview_token || null;
    } catch (err) {
      console.error(err);
      if (err instanceof Error && /slug/i.test(err.message)) {
        let message = err.message;
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && typeof parsed.error === 'string') {
            message = parsed.error;
          }
        } catch {
          // not json, use err.message
        }
        setError('slug', { type: 'server', message });
        onValidationFailure?.();
      }
      return null;
    }
  };

  return { save, isSaved };
};
