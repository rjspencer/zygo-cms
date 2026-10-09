import React, { useState, useEffect } from 'react';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  Card,
  TextField,
  TextArea,
  Separator,
  Badge,
  Switch,
  Callout,
} from '@radix-ui/themes';
import { CheckIcon, InfoCircledIcon } from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';
import { useUnsavedChangesBlocker } from '../hooks/useUnsavedChangesBlocker';
import { UnsavedChangesDialog } from '../components/UnsavedChangesDialog';

export const Settings: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: settingsData = {}, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
      return res.json();
    },
  });

  const [siteTitle, setSiteTitle] = useState('');
  const [canonicalOrigin, setCanonicalOrigin] = useState('');
  const [description, setDescription] = useState('');
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const [docsModeEnabled, setDocsModeEnabled] = useState(false);
  const [docsPath, setDocsPath] = useState('/docs');
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (settingsData) {
      setSiteTitle(settingsData.site_title || '');
      setCanonicalOrigin(settingsData.canonical_origin || '');
      setDescription(settingsData.description || '');
      setAnalyticsEnabled(settingsData.analytics_enabled === 'true');
      setDocsModeEnabled(settingsData.docs_mode_enabled === 'true');
      setDocsPath(settingsData.docs_path || '/docs');
    }
  }, [settingsData]);

  const isDirty =
    siteTitle !== (settingsData.site_title || '') ||
    canonicalOrigin !== (settingsData.canonical_origin || '') ||
    description !== (settingsData.description || '') ||
    analyticsEnabled !== (settingsData.analytics_enabled === 'true') ||
    docsModeEnabled !== (settingsData.docs_mode_enabled === 'true') ||
    docsPath !== (settingsData.docs_path || '/docs');

  const { blocker } = useUnsavedChangesBlocker(isDirty);

  const updateSettingsMutation = useMutation({
    mutationFn: async (settings: Record<string, string>) => {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings }),
      });
      if (!res.ok) {
        let msg = 'Failed to save settings';
        try {
          const errData = await res.json();
          if (errData?.error || errData?.message) {
            msg = errData.error || errData.message;
          }
        } catch (_) {}
        throw new Error(msg);
      }
      return res.json();
    },
  });

  const handleSave = async () => {
    setError(null);
    try {
      await updateSettingsMutation.mutateAsync({
        site_title: siteTitle,
        canonical_origin: canonicalOrigin,
        description: description,
        analytics_enabled: analyticsEnabled ? 'true' : 'false',
        docs_mode_enabled: docsModeEnabled ? 'true' : 'false',
        docs_path: docsPath,
      });
      
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err?.message || 'Failed to save settings');
    }
  };

  if (isLoading) {
    return <Box style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>Loading settings...</Box>;
  }

  return (
    <Box style={{ maxWidth: '900px', margin: '0 auto' }}>
      <Flex justify="between" align="center" mb="5">
        <Box>
          <Heading size="6" weight="bold">
            Site Settings
          </Heading>
          <Text size="2" color="gray">
            Configure global website and edge deployment parameters
          </Text>
        </Box>
        <Button
          variant="solid"
          color="iris"
          onClick={handleSave}
          disabled={!isDirty || updateSettingsMutation.isPending}
        >
          {saved ? (
            <>
              <CheckIcon width="18" height="18" /> Saved!
            </>
          ) : updateSettingsMutation.isPending ? (
            'Saving...'
          ) : (
            'Save Settings'
          )}
        </Button>
      </Flex>

      {error && (
        <Callout.Root color="red" size="2" mb="4">
          <Callout.Icon>
            <InfoCircledIcon />
          </Callout.Icon>
          <Callout.Text>{error}</Callout.Text>
        </Callout.Root>
      )}

      <Flex direction="column" gap="4">
        {/* General Settings */}
        <Card size="2">
          <Heading size="3" mb="3">
            General Information
          </Heading>

          <Box mb="4">
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              Site Title
            </Text>
            <TextField.Root
              value={siteTitle}
              onChange={(e) => setSiteTitle(e.target.value)}
              placeholder="e.g. My Awesome Site"
            />
          </Box>

          <Box mb="4">
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              Canonical Origin
            </Text>
            <TextField.Root
              value={canonicalOrigin}
              onChange={(e) => setCanonicalOrigin(e.target.value)}
              placeholder="https://example.com"
            />
            <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
              Used to generate canonical URLs, Open Graph tags, and sitemap entries.
            </Text>
          </Box>

          <Box mb="2">
            <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
              Meta Description
            </Text>
            <TextArea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Default description for search engines..."
            />
          </Box>
        </Card>

        {/* Analytics Settings */}
        <Card size="2">
          <Flex justify="between" align="center" gap="4">
            <Box style={{ flex: 1 }}>
              <Heading size="3" mb="1">
                Cloudflare Web Analytics
              </Heading>
              <Text size="2" color="gray">
                Enable pageview tracking using Cloudflare's privacy-first web analytics. You must also configure CF_API_TOKEN and CF_ZONE_ID in your worker secrets.
              </Text>
            </Box>

            <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
              <Switch 
                checked={analyticsEnabled} 
                onCheckedChange={setAnalyticsEnabled} 
              />
              <Text size="2">Enable Web Analytics</Text>
            </Flex>
          </Flex>
        </Card>

        {/* Docs Settings */}
        <Card size="2">
          <Flex justify="between" align="center" gap="4" mb="4">
            <Box style={{ flex: 1 }}>
              <Heading size="3" mb="1">
                Docs Mode
              </Heading>
              <Text size="2" color="gray">
                Enable product documentation features including tree navigation and table of contents
              </Text>
            </Box>

            <Flex align="center" gap="2" style={{ flexShrink: 0 }}>
              <Switch 
                checked={docsModeEnabled} 
                onCheckedChange={setDocsModeEnabled} 
              />
              <Text size="2">Enable Docs Mode</Text>
            </Flex>
          </Flex>

          {docsModeEnabled && (
            <Box mb="2">
              <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
                Docs Base Path
              </Text>
              <TextField.Root
                value={docsPath}
                onChange={(e) => setDocsPath(e.target.value)}
                placeholder="/docs"
              />
              <Text size="1" color="gray" mt="1" style={{ display: 'block' }}>
                The path where the documentation will be served. E.g., /docs
              </Text>
            </Box>
          )}
        </Card>

        {/* Edge Infrastructure Info */}
        <Card size="2">
          <Heading size="3" mb="2">
            Edge Environment
          </Heading>
          <Text size="2" color="gray" mb="3">
            Current worker bindings and Cloudflare runtime environment
          </Text>

          <Separator size="4" mb="3" />

          <Flex direction="column" gap="2">
            <Flex justify="between" align="center">
              <Text size="2" weight="medium">
                Admin UI Deployment
              </Text>
              <Badge color="iris">Cloudflare Pages</Badge>
            </Flex>

            <Flex justify="between" align="center">
              <Text size="2" weight="medium">
                Public Site
              </Text>
              <Badge color="purple">{import.meta.env.VITE_PUBLIC_SITE_URL || 'Not configured'}</Badge>
            </Flex>

            <Flex justify="between" align="center">
              <Text size="2" weight="medium">
                Backend Worker
              </Text>
              <Badge color="blue">admin-api-worker</Badge>
            </Flex>

            <Flex justify="between" align="center">
              <Text size="2" weight="medium">
                Database
              </Text>
              <Badge color="green">Cloudflare D1 (SQLite)</Badge>
            </Flex>
          </Flex>
        </Card>
      </Flex>
      <UnsavedChangesDialog blocker={blocker} />
    </Box>
  );
};

export default Settings;
