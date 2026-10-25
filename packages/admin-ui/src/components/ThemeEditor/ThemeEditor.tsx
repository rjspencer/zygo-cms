import React from 'react';
import { Box, Flex, Grid, Callout } from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import { UnsavedChangesDialog } from '../UnsavedChangesDialog';
import { useThemeEditorWebMCP } from '../../lib/webmcp/themeAndMediaTools';
import type { ThemeEditorProps } from './types';
import { useThemeEditorState } from './hooks/useThemeEditorState';
import { ThemeEditorHeader } from './components/ThemeEditorHeader/ThemeEditorHeader';
import { HeaderStylingPanel } from './components/HeaderStylingPanel/HeaderStylingPanel';
import { TypographyPanel } from './components/TypographyPanel/TypographyPanel';
import { ColorTokensPanel } from './components/ColorTokensPanel/ColorTokensPanel';
import { LayoutDimensionsPanel } from './components/LayoutDimensionsPanel/LayoutDimensionsPanel';
import { ThemePreview } from './components/ThemePreview/ThemePreview';
import { DiscardChangesDialog } from './components/DiscardChangesDialog/DiscardChangesDialog';
import { SaveAsDialog } from './components/SaveAsDialog/SaveAsDialog';

export const ThemeEditor: React.FC<ThemeEditorProps> = (props) => {
  const {
    isLoading,
    isSaving,
    isLocked,
    isPrimary,
    isDark,
    isActive,
    isDuplicating,
    handleDuplicateToEdit,
    handleRename,
    activeThemeName,
    selectedThemeName,
    tokens,
    setTokens,
    previewMode,
    setPreviewMode,
    isDirty,
    saved,
    copiedCss,
    error,
    pendingThemeSwitch,
    setPendingThemeSwitch,
    saveAsDialogOpen,
    setSaveAsDialogOpen,
    saveAsName,
    setSaveAsName,
    blocker,
    generatedCss,
    applyThemeSelection,
    openSaveAsDialog,
    handleSave,
    handleConfirmSaveAs,
    handleApplyFontPreset,
    handleResetToModernEditorial,
    handleCopyCss,
    siteLogo,
    siteLogoDark,
    siteTitle,
    footerText,
  } = useThemeEditorState(props);

  useThemeEditorWebMCP({
    tokens,
    setTokens,
    onReset: handleResetToModernEditorial,
    onSave: handleSave,
    onSaveAsCustom: handleConfirmSaveAs,
    onSelectPreset: applyThemeSelection,
    onApplyFontPreset: handleApplyFontPreset,
    selectedThemeName,
    activeThemeName,
  });

  if (isLoading) {
    return <Box p="4">Loading theme settings...</Box>;
  }

  return (
    <Box style={{ maxWidth: '2000px', margin: '0 auto', paddingBottom: '3rem' }}>
      <ThemeEditorHeader
        themeName={selectedThemeName}
        selectedThemeName={selectedThemeName}
        isLocked={isLocked}
        isPrimary={isPrimary}
        isDark={isDark}
        isActive={isActive}
        isDirty={isDirty}
        isSaving={isSaving}
        saved={saved}
        onDuplicate={handleDuplicateToEdit}
        isDuplicating={isDuplicating}
        onRename={handleRename}
        onSave={handleSave}
      />

      {isLocked && (
        <Callout.Root color="amber" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>
            This is a built-in theme and is read-only. Duplicate this theme to customize its tokens and save changes.
          </Callout.Text>
        </Callout.Root>
      )}

      {error && (
        <Callout.Root color="red" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {/* Main Grid: Form Controls Left, Live Editorial Preview Right */}
      <Grid columns={{ initial: '1', md: '1fr 1fr', lg: '540px 1fr' }} gap="5">
        <Flex direction="column" gap="4">
          <HeaderStylingPanel tokens={tokens} setTokens={setTokens} />
          <TypographyPanel
            tokens={tokens}
            setTokens={setTokens}
            onApplyFontPreset={handleApplyFontPreset}
          />
          <ColorTokensPanel tokens={tokens} setTokens={setTokens} />
          <LayoutDimensionsPanel tokens={tokens} setTokens={setTokens} />
        </Flex>

        <Flex direction="column" gap="4">
          <ThemePreview
            tokens={tokens}
            previewMode={previewMode}
            setPreviewMode={setPreviewMode}
            generatedCss={generatedCss}
            copiedCss={copiedCss}
            onCopyCss={handleCopyCss}
            siteLogo={siteLogo}
            siteLogoDark={siteLogoDark}
            siteTitle={siteTitle}
            footerText={footerText}
          />
        </Flex>
      </Grid>

      <DiscardChangesDialog
        pendingThemeSwitch={pendingThemeSwitch}
        selectedThemeName={selectedThemeName}
        onCancel={() => setPendingThemeSwitch(null)}
        onSaveAsCustom={() => {
          setPendingThemeSwitch(null);
          openSaveAsDialog(false);
        }}
        onConfirmDiscard={(themeName) => applyThemeSelection(themeName)}
      />

      <SaveAsDialog
        open={saveAsDialogOpen}
        onOpenChange={setSaveAsDialogOpen}
        saveAsName={saveAsName}
        onSaveAsNameChange={setSaveAsName}
        isSaving={isSaving}
        onConfirmSaveAs={handleConfirmSaveAs}
      />

      <UnsavedChangesDialog blocker={blocker} />
    </Box>
  );
};

export default ThemeEditor;
