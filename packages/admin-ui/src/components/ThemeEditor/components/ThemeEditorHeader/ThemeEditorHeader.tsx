import React from 'react';
import { Flex, Box, Heading, Text, Button, Badge, Select } from '@radix-ui/themes';
import { ColorWheelIcon, CheckIcon, CopyIcon } from '@radix-ui/react-icons';
import { BackButton } from '../../../BackButton';
import type { CustomThemeEntry } from '../../types';
import { BUILT_IN_THEMES } from '../../constants';

export interface ThemeEditorHeaderProps {
  selectedThemeName: string;
  activeThemeName: string;
  customThemes: CustomThemeEntry[];
  isDirty: boolean;
  canSwitchToSelected: boolean;
  isSaving: boolean;
  saved: boolean;
  switchedFeedback: boolean;
  isLocked?: boolean;
  onDuplicate?: () => void;
  isDuplicating?: boolean;
  onThemePickerChange: (themeName: string) => void;
  onSwitchActiveTheme: () => void;
  onSave: () => void;
  onOpenSaveAsDialog: () => void;
}

export const ThemeEditorHeader: React.FC<ThemeEditorHeaderProps> = ({
  selectedThemeName,
  activeThemeName,
  customThemes,
  isDirty,
  canSwitchToSelected,
  isSaving,
  saved,
  switchedFeedback,
  isLocked = false,
  onDuplicate,
  isDuplicating = false,
  onThemePickerChange,
  onSwitchActiveTheme,
  onSave,
  onOpenSaveAsDialog,
}) => {
  return (
    <Flex direction="column" gap="3" mb="5">
      <Box>
        <BackButton to="/theme" label="Back to Themes" />
      </Box>

      <Flex justify="between" align="start" wrap="wrap" gap="4">
        <Box>
          <Flex align="center" gap="2">
            <ColorWheelIcon width="24" height="24" style={{ color: 'var(--cyan-9)' }} />
            <Heading size="6" weight="bold">
              Theme Settings
            </Heading>
            <Badge color="cyan" variant="soft">
              {selectedThemeName}
            </Badge>
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

        {/* Right Controls Stack: Active Theme Row on top, Theme Picker + Save / Save As below */}
        <Flex direction="column" align="end" gap="2">
          {/* Active Theme & Switch To Bar */}
          <Flex align="center" gap="3" wrap="wrap" justify="end">
            <Text size="2" weight="medium" data-testid="active-theme-indicator">
              Active theme: <strong>{activeThemeName}</strong>
            </Text>
            <Button
              size="1"
              variant={selectedThemeName !== activeThemeName ? 'solid' : 'soft'}
              color="cyan"
              disabled={!canSwitchToSelected || isSaving}
              onClick={onSwitchActiveTheme}
            >
              {switchedFeedback ? (
                <>
                  <CheckIcon width="14" height="14" /> Active!
                </>
              ) : (
                `Switch to: ${selectedThemeName}`
              )}
            </Button>
          </Flex>

          {/* Theme Picker Dropdown + Save / Save As Buttons */}
          <Flex gap="2" align="center" wrap="wrap" justify="end">
            <Select.Root value={selectedThemeName} onValueChange={onThemePickerChange}>
              <Select.Trigger aria-label="Theme Picker" style={{ minWidth: '210px' }} />
              <Select.Content>
                <Select.Group>
                  <Select.Label>Built-in Themes</Select.Label>
                  {Object.keys(BUILT_IN_THEMES).map((name) => (
                    <Select.Item key={name} value={name}>
                      {name}
                    </Select.Item>
                  ))}
                </Select.Group>
                {customThemes.length > 0 && (
                  <>
                    <Select.Separator />
                    <Select.Group>
                      <Select.Label>Custom Themes</Select.Label>
                      {customThemes.map((ct) => (
                        <Select.Item key={ct.name} value={ct.name}>
                          {ct.name}
                        </Select.Item>
                      ))}
                    </Select.Group>
                  </>
                )}
              </Select.Content>
            </Select.Root>

            {isLocked ? (
              <Button
                variant="solid"
                color="amber"
                onClick={onDuplicate}
                disabled={isDuplicating}
              >
                <CopyIcon width="16" height="16" />
                {isDuplicating ? 'Duplicating...' : 'Duplicate to Edit'}
              </Button>
            ) : (
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

            <Button
              variant="outline"
              color="cyan"
              onClick={onOpenSaveAsDialog}
              disabled={isSaving}
            >
              Save As...
            </Button>
          </Flex>
        </Flex>
      </Flex>
    </Flex>
  );
};
