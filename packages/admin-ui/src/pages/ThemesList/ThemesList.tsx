import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Card, Callout, Spinner, Flex } from '@radix-ui/themes';
import { ExclamationTriangleIcon } from '@radix-ui/react-icons';
import { useThemesApi } from './hooks/useThemesApi';
import type { Theme } from './types';
import {
  ThemesHeader,
  ActiveThemesSection,
  ThemesTable,
  CreateThemeDialog,
  ActivateThemeDialog,
  RenameThemeDialog,
  DeleteThemeDialog,
} from './components';

export const ThemesList: React.FC = () => {
  const navigate = useNavigate();
  const {
    themes,
    isLoading,
    error,
    primaryThemeId,
    darkThemeId,
    createTheme,
    activateTheme,
    renameTheme,
    duplicateTheme,
    deleteTheme,
  } = useThemesApi();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [themeToActivate, setThemeToActivate] = useState<Theme | null>(null);
  const [themeToRename, setThemeToRename] = useState<Theme | null>(null);
  const [themeToDelete, setThemeToDelete] = useState<Theme | null>(null);
  const [isDuplicatingId, setIsDuplicatingId] = useState<string | null>(null);
  const [isRemovingDark, setIsRemovingDark] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const primaryTheme = themes.find((t) => t.id === primaryThemeId);
  const darkTheme = themes.find((t) => t.id === darkThemeId);

  const handleCreate = async (name: string, description?: string, basePresetId?: string) => {
    setActionError(null);
    try {
      const created = await createTheme(name, description, basePresetId);
      if (created) {
        navigate(`/theme/editor/${created.id}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to create theme');
    }
  };

  const handleActivate = async (id: string, role: 'primary' | 'dark') => {
    setActionError(null);
    try {
      await activateTheme(id, role);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to activate theme');
    }
  };

  const handleRemoveDark = async () => {
    setActionError(null);
    setIsRemovingDark(true);
    try {
      await activateTheme(null, 'dark');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to remove dark mode variant');
    } finally {
      setIsRemovingDark(false);
    }
  };

  const handleRename = async (id: string, name: string) => {
    setActionError(null);
    try {
      await renameTheme(id, name);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to rename theme');
    }
  };

  const handleDuplicate = async (theme: Theme) => {
    setActionError(null);
    setIsDuplicatingId(theme.id);
    try {
      const duplicated = await duplicateTheme(theme.id);
      if (duplicated) {
        navigate(`/theme/editor/${duplicated.id}`);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to duplicate theme');
    } finally {
      setIsDuplicatingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setActionError(null);
    try {
      await deleteTheme(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to delete theme');
    }
  };

  const handleEdit = (theme: Theme) => {
    navigate(`/theme/editor/${theme.id}`);
  };

  return (
    <Box style={{ maxWidth: '1600px', margin: '0 auto' }}>
      <ThemesHeader onCreateClick={() => setCreateDialogOpen(true)} />

      {error && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      {actionError && (
        <Callout.Root color="red" mb="4">
          <Callout.Icon>
            <ExclamationTriangleIcon />
          </Callout.Icon>
          <Callout.Text>{actionError}</Callout.Text>
        </Callout.Root>
      )}

      {isLoading ? (
        <Flex justify="center" align="center" py="9">
          <Spinner size="3" />
        </Flex>
      ) : (
        <>
          <ActiveThemesSection
            primaryTheme={primaryTheme}
            darkTheme={darkTheme}
            onRemoveDark={handleRemoveDark}
            isRemovingDark={isRemovingDark}
          />

          <Card size="2">
            <ThemesTable
              themes={themes}
              primaryThemeId={primaryThemeId}
              darkThemeId={darkThemeId}
              onActivate={(theme) => setThemeToActivate(theme)}
              onRename={(theme) => setThemeToRename(theme)}
              onDuplicate={handleDuplicate}
              onDelete={(theme) => setThemeToDelete(theme)}
              onEdit={handleEdit}
              isDuplicatingId={isDuplicatingId}
            />
          </Card>
        </>
      )}

      <CreateThemeDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={handleCreate}
      />

      <ActivateThemeDialog
        theme={themeToActivate}
        open={Boolean(themeToActivate)}
        onOpenChange={(open) => !open && setThemeToActivate(null)}
        onActivate={handleActivate}
      />

      <RenameThemeDialog
        theme={themeToRename}
        open={Boolean(themeToRename)}
        onOpenChange={(open) => !open && setThemeToRename(null)}
        onRename={handleRename}
      />

      <DeleteThemeDialog
        theme={themeToDelete}
        open={Boolean(themeToDelete)}
        onOpenChange={(open) => !open && setThemeToDelete(null)}
        onConfirmDelete={handleDelete}
      />
    </Box>
  );
};

export default ThemesList;
