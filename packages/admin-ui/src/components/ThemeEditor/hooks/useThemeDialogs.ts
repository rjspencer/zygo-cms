import { useState } from 'react';
import type { CustomThemeEntry } from '../types';
import { getDefaultCustomThemeName } from '../utils';

export function useThemeDialogs(selectedThemeName: string, customThemes: CustomThemeEntry[]) {
  const [pendingThemeSwitch, setPendingThemeSwitch] = useState<string | null>(null);
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState('');
  const [switchAfterSaveAs, setSwitchAfterSaveAs] = useState(false);

  const openSaveAsDialog = (shouldSwitchLiveAfter = false) => {
    const defaultName = getDefaultCustomThemeName(selectedThemeName, customThemes);
    setSaveAsName(defaultName);
    setSwitchAfterSaveAs(shouldSwitchLiveAfter);
    setSaveAsDialogOpen(true);
  };

  return {
    pendingThemeSwitch,
    setPendingThemeSwitch,
    saveAsDialogOpen,
    setSaveAsDialogOpen,
    saveAsName,
    setSaveAsName,
    switchAfterSaveAs,
    setSwitchAfterSaveAs,
    openSaveAsDialog,
  };
}
