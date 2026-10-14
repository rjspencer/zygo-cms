import React from 'react';
import { Flex, Box, Heading, Text, Button, Switch, Tooltip, Badge } from '@radix-ui/themes';
import { LockClosedIcon, LockOpen1Icon, ResetIcon } from '@radix-ui/react-icons';
import { BackButton } from '../../../../components/BackButton';
import type { TemplateEditorHeaderProps } from '../../types';

export const TemplateEditorHeader: React.FC<TemplateEditorHeaderProps> = ({
  isNew,
  formId,
  formName,
  isAdmin,
  isDesigner,
  isLocked,
  onLockedChange,
  hasDraft,
  onDiscardClick,
  isSaving,
  onSave,
}) => {
  const isLockedForDesigner = isDesigner && isLocked;
  const lockedTooltipText =
    'This core template is locked. Please reach out to an admin if you need to make a change.';

  return (
    <>
      {/* Top navigation row */}
      <Flex justify="between" align="center" mb="4">
        <BackButton to="/templates" />
      </Flex>

      {/* Header */}
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Flex align="center" gap="2">
            <Heading size="6" weight="bold">
              {isNew ? 'New Template' : `Edit Template: ${formName || formId}`}
            </Heading>
          </Flex>
          <Text size="2" color="gray">
            {isNew
              ? 'Create a custom template with schema, markup, and styling'
              : 'Edit your template with schema, markup, and styling'
            }
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
                onCheckedChange={onLockedChange}
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
              <Button variant="soft" color="red" onClick={onDiscardClick}>
                <ResetIcon width="18" height="18" /> Discard
              </Button>
            </Flex>
          )}

          {/* Save Button */}
          {isLockedForDesigner ? (
            <Tooltip content={lockedTooltipText}>
              <span style={{ display: 'inline-flex' }}>
                <Button variant="solid" color="cyan" disabled={true} aria-label="Save Template">
                  Save Template
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="solid"
              color="cyan"
              disabled={isSaving || !formName || (isNew && !formId)}
              onClick={onSave}
              aria-label="Save Template"
            >
              {isSaving ? 'Saving...' : 'Save Template'}
            </Button>
          )}
        </Flex>
      </Flex>
    </>
  );
};
