import React, { useState, useEffect } from 'react';
import {
  Dialog,
  Flex,
  Box,
  Text,
  TextField,
  TextArea,
  Select,
  Button,
  Callout,
} from '@radix-ui/themes';
import { InfoCircledIcon } from '@radix-ui/react-icons';
import type { Redirect, CreateRedirectInput, UpdateRedirectInput } from '../types';

export interface RedirectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  redirect?: Redirect | null;
  onSubmit: (data: CreateRedirectInput | UpdateRedirectInput) => Promise<void> | void;
  isPending?: boolean;
  error?: string | null;
}

export const RedirectModal: React.FC<RedirectModalProps> = ({
  open,
  onOpenChange,
  redirect,
  onSubmit,
  isPending = false,
  error = null,
}) => {
  const [sourcePath, setSourcePath] = useState('');
  const [targetUrl, setTargetUrl] = useState('');
  const [statusCode, setStatusCode] = useState<number>(301);
  const [notes, setNotes] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (redirect) {
        setSourcePath(redirect.source_path || '');
        setTargetUrl(redirect.target_url || '');
        setStatusCode(redirect.status_code || 301);
        setNotes(redirect.notes || '');
      } else {
        setSourcePath('');
        setTargetUrl('');
        setStatusCode(301);
        setNotes('');
      }
      setValidationError(null);
    }
  }, [open, redirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const trimmedSource = sourcePath.trim();
    const trimmedTarget = targetUrl.trim();

    if (!trimmedSource) {
      setValidationError('Source path is required.');
      return;
    }

    const formattedSource = trimmedSource.startsWith('/') ? trimmedSource : `/${trimmedSource}`;

    if (!trimmedTarget) {
      setValidationError('Target destination is required.');
      return;
    }

    if (formattedSource === trimmedTarget) {
      setValidationError('Source path and target destination cannot be identical (self-redirect).');
      return;
    }

    const payload = {
      source_path: formattedSource,
      target_url: trimmedTarget,
      status_code: statusCode,
      notes: notes.trim() || undefined,
    };

    try {
      await onSubmit(payload);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setValidationError(msg);
    }
  };

  const displayError = validationError || error;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content maxWidth="520px">
        <form onSubmit={handleSubmit}>
          <Dialog.Title data-testid="redirect-modal-title">
            {redirect ? 'Edit Redirect' : 'Create Redirect'}
          </Dialog.Title>
          <Dialog.Description size="2" mb="4" color="gray">
            Configure custom 301 permanent or 302 temporary redirects for inbound traffic or vanity marketing URLs.
          </Dialog.Description>

          {displayError && (
            <Callout.Root
              id="redirect-modal-error-alert"
              role="alert"
              color="red"
              size="1"
              mb="3"
              data-testid="redirect-modal-error"
            >
              <Callout.Icon>
                <InfoCircledIcon />
              </Callout.Icon>
              <Callout.Text>{displayError}</Callout.Text>
            </Callout.Root>
          )}

          <Flex direction="column" gap="3" mb="4">
            <Box>
              <Text
                as="label"
                htmlFor="redirect-source-input"
                size="2"
                weight="bold"
                mb="1"
                style={{ display: 'block' }}
              >
                Source Path
              </Text>
              <TextField.Root
                id="redirect-source-input"
                aria-label="Source Path"
                data-testid="redirect-source-input"
                placeholder="/spring-sale"
                value={sourcePath}
                onChange={(e) => setSourcePath(e.target.value)}
                onBlur={() => {
                  if (sourcePath.trim() && !sourcePath.trim().startsWith('/')) {
                    setSourcePath(`/${sourcePath.trim()}`);
                  }
                }}
              />
              <Text size="1" color="gray" mt="1">
                The incoming request URL path to intercept (must begin with a leading slash).
              </Text>
            </Box>

            <Box>
              <Text
                as="label"
                htmlFor="redirect-target-input"
                size="2"
                weight="bold"
                mb="1"
                style={{ display: 'block' }}
              >
                Target Destination
              </Text>
              <TextField.Root
                id="redirect-target-input"
                aria-label="Target Destination"
                data-testid="redirect-target-input"
                placeholder="/pricing or https://example.com/campaign"
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <Text size="1" color="gray" mt="1">
                Internal path (e.g. <code>/contact</code>) or external URL (e.g. <code>https://example.com</code>).
              </Text>
            </Box>

            <Box>
              <Text
                as="label"
                htmlFor="redirect-status-select"
                size="2"
                weight="bold"
                mb="1"
                style={{ display: 'block' }}
              >
                Redirect Type
              </Text>
              <Select.Root
                value={String(statusCode)}
                onValueChange={(val) => setStatusCode(Number(val))}
              >
                <Select.Trigger
                  id="redirect-status-select"
                  aria-label="Redirect Type"
                  data-testid="redirect-status-select"
                  style={{ width: '100%' }}
                />
                <Select.Content>
                  <Select.Item value="301" data-testid="redirect-status-301">
                    301 - Permanent (SEO migrated routes, cached at edge)
                  </Select.Item>
                  <Select.Item value="302" data-testid="redirect-status-302">
                    302 - Temporary (Campaigns, seasonal promos, dynamic destinations)
                  </Select.Item>
                </Select.Content>
              </Select.Root>
            </Box>

            <Box>
              <Text
                as="label"
                htmlFor="redirect-notes-input"
                size="2"
                weight="bold"
                mb="1"
                style={{ display: 'block' }}
              >
                Notes (Optional)
              </Text>
              <TextArea
                id="redirect-notes-input"
                aria-label="Notes"
                data-testid="redirect-notes-input"
                placeholder="e.g. Spring 2026 print flier QR code campaign destination"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Box>
          </Flex>

          <Flex gap="3" justify="end">
            <Button
              variant="soft"
              color="gray"
              type="button"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
              data-testid="cancel-redirect-btn"
            >
              Cancel
            </Button>
            <Button
              variant="solid"
              color="cyan"
              type="submit"
              disabled={isPending}
              data-testid="save-redirect-btn"
            >
              {isPending ? 'Saving...' : redirect ? 'Save Changes' : 'Create Redirect'}
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default RedirectModal;
