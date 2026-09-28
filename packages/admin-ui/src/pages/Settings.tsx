import React, { useState } from 'react';
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
} from '@radix-ui/themes';
import { CheckIcon } from '@radix-ui/react-icons';

export const Settings: React.FC = () => {
  const [siteTitle, setSiteTitle] = useState('Zygo CMS');
  const [canonicalOrigin, setCanonicalOrigin] = useState('https://zygodactyl.io');
  const [description, setDescription] = useState('Fast, modern edge CMS running on Cloudflare Workers and D1');
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

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
        <Button variant="solid" color="iris" onClick={handleSave}>
          {saved ? (
            <>
              <CheckIcon width="16" height="16" /> Saved!
            </>
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
