import React, { useState, useEffect } from 'react';
import { Flex, Box, Heading, Text, Button, Badge, TextField, IconButton } from '@radix-ui/themes';
import { BlendingModeIcon, CheckIcon, Cross2Icon, Pencil1Icon, CopyIcon } from '@radix-ui/react-icons';
import { BackButton } from '../../../BackButton';
import type { CustomThemeEntry } from '../../types';

export interface ThemeEditorHeaderProps {
  themeName?: string;
  selectedThemeName?: string;
  isLocked?: boolean;
  isDirty?: boolean;
  isSaving?: boolean;
  saved?: boolean;
  isDuplicating?: boolean;
  isPrimary?: boolean;
  isDark?: boolean;
  isActive?: boolean;
  onDuplicate?: () => void;
  onRename?: (newName: string) => Promise<void> | void;
  onSave?: () => void;
  // Optional / backwards-compatibility props
  activeThemeName?: string;
  customThemes?: CustomThemeEntry[];
  canSwitchToSelected?: boolean;
  switchedFeedback?: boolean;
  onThemePickerChange?: (themeName: string) => void;
  onSwitchActiveTheme?: () => void;
  onOpenSaveAsDialog?: () => void;
}

export const ThemeEditorHeader: React.FC<ThemeEditorHeaderProps> = ({
  themeName,
  selectedThemeName = 'Modern Editorial',
  isLocked = false,
  isDirty = false,
  isSaving = false,
  saved = false,
  isDuplicating = false,
  isPrimary = false,
  isDark = false,
  isActive = false,
  onDuplicate,
  onRename,
  onSave,
}) => {
  const currentThemeName = themeName || selectedThemeName;
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(currentThemeName);

  useEffect(() => {
    if (!isEditing) {
      setTempName(currentThemeName);
    }
  }, [currentThemeName, isEditing]);

  const handleStartRename = () => {
    setTempName(currentThemeName);
    setIsEditing(true);
  };

  const handleCancelRename = () => {
    setTempName(currentThemeName);
    setIsEditing(false);
  };

  const handleSaveRename = async () => {
    const trimmed = tempName.trim();
    if (!trimmed) return;
    if (trimmed !== currentThemeName && onRename) {
      await onRename(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveRename();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancelRename();
    }
  };

  return (
    <Flex direction="column" gap="3" mb="5">
      <Box>
        <BackButton to="/theme" label="Back to Themes" />
      </Box>

      <Flex justify="between" align="start" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="2" wrap="wrap">
            <BlendingModeIcon width="24" height="24" style={{ color: 'var(--cyan-9)', flexShrink: 0 }} />
            {isEditing ? (
              <Flex align="center" gap="2">
                <TextField.Root
                  size="2"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  aria-label="Theme name"
                  autoFocus
                  style={{ fontWeight: 'bold' }}
                />
                <IconButton
                  size="2"
                  variant="soft"
                  color="green"
                  aria-label="Save theme name"
                  title="Save theme name"
                  style={{ cursor: 'pointer' }}
                  onClick={handleSaveRename}
                  disabled={!tempName.trim()}
                >
                  <CheckIcon width="16" height="16" />
                </IconButton>
                <IconButton
                  size="2"
                  variant="soft"
                  color="gray"
                  aria-label="Cancel"
                  title="Cancel"
                  style={{ cursor: 'pointer' }}
                  onClick={handleCancelRename}
                >
                  <Cross2Icon width="16" height="16" />
                </IconButton>
              </Flex>
            ) : (
              <Flex align="center" gap="2">
                <Heading size="6" weight="bold">
                  {currentThemeName}
                </Heading>
                {!isLocked && onRename && (
                  <IconButton
                    size="2"
                    variant="ghost"
                    color="gray"
                    aria-label="Rename theme"
                    title="Rename theme"
                    style={{ cursor: 'pointer' }}
                    onClick={handleStartRename}
                  >
                    <Pencil1Icon width="16" height="16" />
                  </IconButton>
                )}
              </Flex>
            )}

            {isPrimary && (
              <Badge color="green" variant="soft">
                Active Primary
              </Badge>
            )}
            {isDark && (
              <Badge color="green" variant="soft">
                Active Dark
              </Badge>
            )}
            {!isPrimary && !isDark && isActive && (
              <Badge color="green" variant="soft">
                Active
              </Badge>
            )}

            {isLocked ? (
              <Badge color="amber" variant="soft">
                Built-in (Read-Only)
              </Badge>
            ) : (
              <Badge color="blue" variant="soft">
                Custom
              </Badge>
            )}

            {isDirty && (
              <Badge color="amber" variant="soft">
                Unsaved Edits
              </Badge>
            )}
          </Flex>
          <Text size="2" color="gray" mt="1" as="div">
            Configure typography, Google Fonts, header styles, and design tokens via CSS variables
          </Text>
        </Box>

        {/* Right Controls: Clone Theme button (for any theme) + Save button (for custom themes) */}
        <Flex gap="2" align="center" wrap="wrap" justify="end">
          {onDuplicate && (
            <Button
              variant={isLocked ? 'solid' : 'soft'}
              color={isLocked ? 'cyan' : 'gray'}
              onClick={onDuplicate}
              disabled={isDuplicating}
            >
              <CopyIcon width="16" height="16" />
              {isDuplicating ? 'Cloning...' : 'Clone Theme'}
            </Button>
          )}

          {!isLocked && onSave && (
            <Button
              variant="solid"
              color="cyan"
              onClick={onSave}
              disabled={!isDirty || isSaving}
            >
              {saved ? (
                <>
                  <CheckIcon width="16" height="16" /> Saved!
                </>
              ) : isSaving ? (
                'Saving...'
              ) : (
                'Save'
              )}
            </Button>
          )}
        </Flex>
      </Flex>
    </Flex>
  );
};

export default ThemeEditorHeader;
