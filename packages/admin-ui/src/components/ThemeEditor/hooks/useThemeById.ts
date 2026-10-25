import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../../../utils/api';
import type { ThemeTokens } from '../types';

export interface ThemeRecord {
  id: string;
  name: string;
  description: string | null;
  tokens: ThemeTokens;
  is_locked: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UseThemeByIdOptions {
  themeId?: string;
  onSaveSuccess?: () => void;
}

export function useThemeById({ themeId, onSaveSuccess }: UseThemeByIdOptions) {
  const navigate = useNavigate();
  const [themeRecord, setThemeRecord] = useState<ThemeRecord | null>(null);
  const [isLoadingTheme, setIsLoadingTheme] = useState(Boolean(themeId));
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [isDuplicatingTheme, setIsDuplicatingTheme] = useState(false);
  const [themeError, setThemeError] = useState<string | null>(null);

  const fetchTheme = useCallback(async (id: string) => {
    setIsLoadingTheme(true);
    setThemeError(null);
    try {
      const res = await apiFetch(`/api/themes/${id}`);
      if (!res.ok) {
        throw new Error(`Theme not found: ${res.statusText}`);
      }
      const data: ThemeRecord = await res.json();
      setThemeRecord(data);
      return data;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to fetch theme';
      setThemeError(msg);
      return null;
    } finally {
      setIsLoadingTheme(false);
    }
  }, []);

  useEffect(() => {
    if (themeId) {
      fetchTheme(themeId);
    } else {
      setThemeRecord(null);
      setIsLoadingTheme(false);
    }
  }, [themeId, fetchTheme]);

  const saveTheme = async (tokens: ThemeTokens): Promise<boolean> => {
    if (!themeRecord) return false;
    if (themeRecord.is_locked) {
      setThemeError('Built-in themes cannot be modified. Duplicate this theme to edit.');
      return false;
    }

    setIsSavingTheme(true);
    setThemeError(null);
    try {
      const res = await apiFetch(`/api/themes/${themeRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tokens }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to save theme');
      }

      const updated: ThemeRecord = await res.json();
      setThemeRecord(updated);
      onSaveSuccess?.();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save theme';
      setThemeError(msg);
      return false;
    } finally {
      setIsSavingTheme(false);
    }
  };

  const duplicateTheme = async (): Promise<ThemeRecord | null> => {
    if (!themeRecord) return null;
    setIsDuplicatingTheme(true);
    setThemeError(null);
    try {
      const res = await apiFetch(`/api/themes/${themeRecord.id}/duplicate`, {
        method: 'POST',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to duplicate theme');
      }
      const duplicated: ThemeRecord = await res.json();
      navigate(`/theme/editor/${duplicated.id}`);
      return duplicated;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate theme';
      setThemeError(msg);
      return null;
    } finally {
      setIsDuplicatingTheme(false);
    }
  };

  const renameTheme = async (newName: string): Promise<boolean> => {
    if (!themeRecord) return false;
    if (themeRecord.is_locked) {
      setThemeError('Built-in themes cannot be renamed.');
      return false;
    }
    const trimmed = newName.trim();
    if (!trimmed) {
      setThemeError('Theme name cannot be empty');
      return false;
    }
    setIsSavingTheme(true);
    setThemeError(null);
    try {
      const res = await apiFetch(`/api/themes/${themeRecord.id}/rename`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Failed to rename theme');
      }
      const updated: ThemeRecord = await res.json();
      setThemeRecord(updated);
      onSaveSuccess?.();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to rename theme';
      setThemeError(msg);
      return false;
    } finally {
      setIsSavingTheme(false);
    }
  };

  return {
    themeRecord,
    isLoadingTheme,
    isSavingTheme,
    isDuplicatingTheme,
    themeError,
    setThemeError,
    saveTheme,
    duplicateTheme,
    renameTheme,
    refetchTheme: fetchTheme,
  };
}
