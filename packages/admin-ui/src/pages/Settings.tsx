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
} from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../utils/api';

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
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settingsData) {
      setSiteTitle(settingsData.site_title || '');
      setCanonicalOrigin(settingsData.canonical_origin || '');
      setDescription(settingsData.description || '');
      setAnalyticsEnabled(settingsData.analytics_enabled === 'true');
    }
  }, [settingsData]);

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (!res.ok) throw new Error(`Failed to save ${key}`);
    },
  });

  const handleSave = async () => {
    try {
      await updateSettingMutation.mutateAsync({ key: 'site_title', value: siteTitle });
      await updateSettingMutation.mutateAsync({ key: 'canonical_origin', value: canonicalOrigin });
      await updateSettingMutation.mutateAsync({ key: 'description', value: description });
      await updateSettingMutation.mutateAsync({ key: 'analytics_enabled', value: analyticsEnabled ? 'true' : 'false' });
      
      queryClient.invalidateQueries({ queryKey: ['settings'] });
      
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
      console.error('Failed to save settings:', error);
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
        <Button variant="solid" color="iris" onClick={handleSave} disabled={updateSettingMutation.isPending}>
          {saved ? (
            <>
              <CheckIcon width="16" height="16" /> Saved!
            </>
          ) : updateSettingMutation.isPending ? (
            'Saving...'
          ) : (
            'Save Settings'
          )}
        </Button>
      </Flex>

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
        <Card size="2" mb="4">
          <Heading size="3" mb="2">
            Cloudflare Web Analytics
          </Heading>
          <Text size="2" color="gray" mb="3">
            Enable pageview tracking using Cloudflare's privacy-first web analytics. You must also configure CF_API_TOKEN and CF_ZONE_ID in your worker secrets.
          </Text>

          <Flex align="center" gap="2">
            <Switch 
              checked={analyticsEnabled} 
              onCheckedChange={setAnalyticsEnabled} 
            />
            <Text size="2">Enable Web Analytics</Text>
          </Flex>
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

          <Flex justify="between" align="center" mb="2">
            <Text size="2" weight="medium">
              Admin UI Deployment
            </Text>
            <Badge color="iris">Cloudflare Pages</Badge>
          </Flex>

          <Flex justify="between" align="center" mb="2">
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
        </Card>
      </Flex>
    </Box>
  );
};

export default Settings;
