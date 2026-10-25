import { useState, useEffect, useRef } from 'react';
import { useUnsavedChangesBlocker } from '../../../hooks/useUnsavedChangesBlocker';
import type { ThemeTokens, CustomThemeEntry, ThemeEditorProps, FontPreset } from '../types';
import { MODERN_EDITORIAL_PRESET, BUILT_IN_THEMES, FONT_PRESETS } from '../constants';
import {
  areTokensEqual,
  tokensToSettingsPayload,
  extractTokensFromSettings,
  parseCustomThemes,
  getDefaultCustomThemeName,
  generateThemeCss,
  resolveThemeTokens,
  createOrUpdateCustomTheme,
} from '../utils';
import { useThemeSettingsApi } from './useThemeSettingsApi';
import { useGoogleFontInjector } from './useGoogleFontInjector';
import { useThemeDialogs } from './useThemeDialogs';
import { useThemeById } from './useThemeById';

export function useThemeEditorState({
  themeId,
  initialTokens,
  initialThemeName = 'Modern Editorial',
  initialPreviewMode = 'editorial',
  onSaveSuccess,
}: ThemeEditorProps = {}) {
  const hasInitializedRef = useRef(false);
  const { settingsData, isLoading, isSaving, saveSettings } = useThemeSettingsApi();
  const {
    themeRecord,
    isLoadingTheme,
    isSavingTheme,
    isDuplicatingTheme,
    themeError,
    saveTheme,
    duplicateTheme,
  } = useThemeById({ themeId, onSaveSuccess });

  const basePreset = BUILT_IN_THEMES[initialThemeName] || MODERN_EDITORIAL_PRESET;

  const [activeThemeName, setActiveThemeName] = useState<string>(initialThemeName);
  const [selectedThemeName, setSelectedThemeName] = useState<string>(initialThemeName);
  const [customThemes, setCustomThemes] = useState<CustomThemeEntry[]>([]);

  const [tokens, setTokens] = useState<ThemeTokens>(() => ({
    ...basePreset,
    ...initialTokens,
  }));

  const [baselineTokens, setBaselineTokens] = useState<ThemeTokens>(() => ({
    ...basePreset,
    ...initialTokens,
  }));

  const [previewMode, setPreviewMode] = useState<'editorial' | 'docs'>(initialPreviewMode);

  // Dialog management hook
  const {
    pendingThemeSwitch,
    setPendingThemeSwitch,
    saveAsDialogOpen,
    setSaveAsDialogOpen,
    saveAsName,
    setSaveAsName,
    switchAfterSaveAs,
    setSwitchAfterSaveAs,
    openSaveAsDialog,
  } = useThemeDialogs(selectedThemeName, customThemes);

  const [saved, setSaved] = useState(false);
  const [switchedFeedback, setSwitchedFeedback] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync with fetched settings on initial load
  useEffect(() => {
    if (
      !themeId &&
      !initialTokens &&
      settingsData &&
      Object.keys(settingsData).length > 0 &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
      const loadedCustom = parseCustomThemes(settingsData.theme_custom_themes);
      setCustomThemes(loadedCustom);

      const loadedActiveName = settingsData.theme_active_name || initialThemeName;
      setActiveThemeName(loadedActiveName);
      setSelectedThemeName(loadedActiveName);

      const fallbackPreset =
        BUILT_IN_THEMES[loadedActiveName] ||
        loadedCustom.find((c) => c.name === loadedActiveName)?.tokens ||
        MODERN_EDITORIAL_PRESET;

      const loadedTokens = extractTokensFromSettings(settingsData, fallbackPreset);
      setTokens(loadedTokens);
      setBaselineTokens(loadedTokens);
    }
  }, [themeId, settingsData, initialThemeName, initialTokens]);

  // Sync with theme fetched by ID
  useEffect(() => {
    if (themeRecord) {
      setSelectedThemeName(themeRecord.name);
      setTokens(themeRecord.tokens);
      setBaselineTokens(themeRecord.tokens);
    }
  }, [themeRecord]);

  useGoogleFontInjector(tokens.fontUrl);

  const isDirty = !areTokensEqual(tokens, baselineTokens);
  const isBuiltInSelected = Boolean(BUILT_IN_THEMES[selectedThemeName]);
  const isLocked = Boolean(themeRecord?.is_locked);
  const canSwitchToSelected = selectedThemeName !== activeThemeName || isDirty;

  const { blocker } = useUnsavedChangesBlocker(isDirty);

  const applyThemeSelection = (themeName: string) => {
    const nextTokens = resolveThemeTokens(themeName, customThemes);
    setSelectedThemeName(themeName);
    setTokens(nextTokens);
    setBaselineTokens(nextTokens);
    setPendingThemeSwitch(null);
    setError(null);
  };

  const handleThemePickerChange = (nextThemeName: string) => {
    if (nextThemeName === selectedThemeName) return;
    if (isDirty) {
      setPendingThemeSwitch(nextThemeName);
    } else {
      applyThemeSelection(nextThemeName);
    }
  };

  const handleSave = async () => {
    setError(null);
    if (themeRecord) {
      if (themeRecord.is_locked) {
        openSaveAsDialog(false);
        return;
      }
      const success = await saveTheme(tokens);
      if (success) {
        setBaselineTokens({ ...tokens });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
      return;
    }

    if (isBuiltInSelected) {
      openSaveAsDialog(false);
      return;
    }

    try {
      const { updatedCustomList } = createOrUpdateCustomTheme(
        selectedThemeName,
        selectedThemeName,
        customThemes,
        tokens
      );

      const payload: Record<string, string> = {
        theme_custom_themes: JSON.stringify(updatedCustomList),
      };

      if (activeThemeName === selectedThemeName) {
        Object.assign(payload, tokensToSettingsPayload(tokens), {
          theme_active_name: selectedThemeName,
        });
      }

      await saveSettings(payload);

      setCustomThemes(updatedCustomList);
      setBaselineTokens({ ...tokens });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save theme settings');
    }
  };

  const handleConfirmSaveAs = async (e?: React.FormEvent, customName?: string) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setError(null);

    let targetName = (customName !== undefined ? customName : saveAsName).trim();
    if (!targetName) {
      targetName = getDefaultCustomThemeName(selectedThemeName, customThemes);
    }
    if (BUILT_IN_THEMES[targetName]) {
      targetName = `${targetName} Custom`;
    }

    const { updatedCustomList } = createOrUpdateCustomTheme(
      targetName,
      selectedThemeName,
      customThemes,
      tokens
    );

    try {
      const payload: Record<string, string> = {
        theme_custom_themes: JSON.stringify(updatedCustomList),
      };

      if (switchAfterSaveAs || activeThemeName === targetName) {
        Object.assign(payload, tokensToSettingsPayload(tokens), {
          theme_active_name: targetName,
        });
      }

      await saveSettings(payload);

      setCustomThemes(updatedCustomList);
      setSelectedThemeName(targetName);
      setBaselineTokens({ ...tokens });
      if (switchAfterSaveAs) {
        setActiveThemeName(targetName);
        setSwitchedFeedback(true);
        setTimeout(() => setSwitchedFeedback(false), 2000);
      }
      setSaveAsDialogOpen(false);
      setSwitchAfterSaveAs(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to save custom theme');
    }
  };

  const handleSwitchActiveTheme = async () => {
    setError(null);
    if (isDirty && isBuiltInSelected) {
      openSaveAsDialog(true);
      return;
    }

    try {
      const payload: Record<string, string> = {
        ...tokensToSettingsPayload(tokens),
        theme_active_name: selectedThemeName,
      };

      if (isDirty && !isBuiltInSelected) {
        const { updatedCustomList } = createOrUpdateCustomTheme(
          selectedThemeName,
          selectedThemeName,
          customThemes,
          tokens
        );
        payload.theme_custom_themes = JSON.stringify(updatedCustomList);
        setCustomThemes(updatedCustomList);
      }

      await saveSettings(payload);

      setActiveThemeName(selectedThemeName);
      setBaselineTokens({ ...tokens });
      setSwitchedFeedback(true);
      setTimeout(() => setSwitchedFeedback(false), 2000);
      onSaveSuccess?.();
    } catch (err: any) {
      setError(err?.message || 'Failed to switch active theme');
    }
  };

  const handleApplyFontPreset = (preset: FontPreset | string) => {
    let resolvedPreset: FontPreset | undefined;
    if (typeof preset === 'string') {
      const q = preset.toLowerCase().trim();
      resolvedPreset = FONT_PRESETS.find(
        (p) => p.name.toLowerCase() === q || p.name.toLowerCase().includes(q)
      );
    } else {
      resolvedPreset = preset;
    }
    if (resolvedPreset) {
      setTokens((prev) => ({
        ...prev,
        fontUrl: resolvedPreset!.url,
        fontHeadline: resolvedPreset!.headlineFont,
        fontBody: resolvedPreset!.bodyFont,
      }));
    }
  };

  const handleResetToModernEditorial = () => {
    setTokens({ ...MODERN_EDITORIAL_PRESET });
  };

  const generatedCss = generateThemeCss(tokens);

  const handleCopyCss = () => {
    navigator.clipboard.writeText(generatedCss);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  return {
    isLoading:
      isLoadingTheme || (isLoading && !initialTokens && Object.keys(settingsData).length === 0),
    isSaving: isSaving || isSavingTheme,
    isLocked,
    isDuplicating: isDuplicatingTheme,
    handleDuplicateToEdit: duplicateTheme,
    activeThemeName,
    selectedThemeName,
    customThemes,
    tokens,
    setTokens,
    previewMode,
    setPreviewMode,
    isDirty,
    canSwitchToSelected,
    saved,
    switchedFeedback,
    copiedCss,
    error: error || themeError,
    pendingThemeSwitch,
    setPendingThemeSwitch,
    saveAsDialogOpen,
    setSaveAsDialogOpen,
    saveAsName,
    setSaveAsName,
    blocker,
    generatedCss,
    handleThemePickerChange,
    applyThemeSelection,
    openSaveAsDialog,
    handleSave,
    handleConfirmSaveAs,
    handleSwitchActiveTheme,
    handleApplyFontPreset,
    handleResetToModernEditorial,
    handleCopyCss,
    siteLogo: (settingsData?.site_logo as string) || (settingsData?.siteLogo as string) || '',
    siteLogoDark: (settingsData?.site_logo_dark as string) || (settingsData?.siteLogoDark as string) || '',
    siteTitle: (settingsData?.site_title as string) || (settingsData?.siteTitle as string) || '',
    footerText: (settingsData?.footer_text as string) || (settingsData?.footerText as string) || '',
  };
}

export type UseThemeEditorStateReturn = ReturnType<typeof useThemeEditorState>;
