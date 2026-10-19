import React from 'react';
import { Card, Flex, Box, Heading, Text, Switch, Select, Button, Callout, Badge } from '@radix-ui/themes';
import { InfoCircledIcon, LockClosedIcon } from '@radix-ui/react-icons';
import { Controller, useFormContext } from 'react-hook-form';
import type { SettingsFormValues } from '../types';

export interface AiCrawlSettingsCardProps {
  configured?: boolean;
}

export const AiCrawlSettingsCard: React.FC<AiCrawlSettingsCardProps> = ({ configured = true }) => {
  const { control, setValue } = useFormContext<SettingsFormValues>();

  const applyPreset = (preset: 'block_all' | 'allow_search_only' | 'allow_all') => {
    if (preset === 'block_all') {
      setValue('aiBotsProtection', 'block', { shouldDirty: true });
      setValue('aiSearch', 'block', { shouldDirty: true });
      setValue('aiTraining', 'block', { shouldDirty: true });
      setValue('aiUser', 'block', { shouldDirty: true });
    } else if (preset === 'allow_search_only') {
      setValue('aiBotsProtection', 'disabled', { shouldDirty: true });
      setValue('aiSearch', 'disabled', { shouldDirty: true });
      setValue('aiTraining', 'block', { shouldDirty: true });
      setValue('aiUser', 'disabled', { shouldDirty: true });
    } else {
      setValue('aiBotsProtection', 'disabled', { shouldDirty: true });
      setValue('aiSearch', 'disabled', { shouldDirty: true });
      setValue('aiTraining', 'disabled', { shouldDirty: true });
      setValue('aiUser', 'disabled', { shouldDirty: true });
    }
  };

  return (
    <Card size="2" data-testid="ai-crawl-settings-card">
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center" wrap="wrap" gap="2">
          <Box>
            <Flex align="center" gap="2" mb="1">
              <Heading size="3">Cloudflare AI Crawl Control</Heading>
              {configured ? (
                <Badge color="green" size="1">Live Edge Sync</Badge>
              ) : (
                <Badge color="amber" size="1">Unconfigured</Badge>
              )}
            </Flex>
            <Text id="ai-crawl-card-description" size="2" color="gray">
              Manage edge blocking and indexing policies for AI scrapers, search crawlers, and LLM training bots.
            </Text>
          </Box>

          {configured && (
            <Flex gap="2" wrap="wrap">
              <Button
                type="button"
                variant="soft"
                size="1"
                onClick={() => applyPreset('block_all')}
              >
                Block All
              </Button>
              <Button
                type="button"
                variant="soft"
                size="1"
                onClick={() => applyPreset('allow_search_only')}
              >
                Allow Search Only
              </Button>
              <Button
                type="button"
                variant="soft"
                size="1"
                onClick={() => applyPreset('allow_all')}
              >
                Allow All
              </Button>
            </Flex>
          )}
        </Flex>

        {!configured && (
          <Callout.Root color="amber" size="2">
            <Callout.Icon>
              <InfoCircledIcon />
            </Callout.Icon>
            <Callout.Text>
              Cloudflare AI Crawl Control requires <code>CF_API_TOKEN</code> and <code>CF_ZONE_ID</code> to be configured in your worker secrets/environment. Current values will update locally until Cloudflare credentials are connected.
            </Callout.Text>
          </Callout.Root>
        )}

        {/* Master Toggle */}
        <Flex justify="between" align="center" gap="4" p="3" style={{ background: 'var(--gray-a2)', borderRadius: 'var(--radius-3)' }}>
          <Flex gap="3" align="center">
            <LockClosedIcon width="20" height="20" style={{ color: 'var(--accent-11)' }} />
            <Box>
              <Text as="label" htmlFor="settings-ai-bots-switch" size="2" weight="bold" style={{ display: 'block', cursor: 'pointer' }}>
                Block AI Scrapers and Crawlers
              </Text>
              <Text id="settings-ai-bots-description" size="1" color="gray">
                Master switch to block recognized AI crawlers and automated content scrapers at Cloudflare's edge.
              </Text>
            </Box>
          </Flex>

          <Controller
            control={control}
            name="aiBotsProtection"
            render={({ field }) => (
              <Switch
                id="settings-ai-bots-switch"
                aria-describedby="settings-ai-bots-description"
                checked={field.value === 'block'}
                onCheckedChange={(checked) => field.onChange(checked ? 'block' : 'disabled')}
              />
            )}
          />
        </Flex>

        {/* Granular Crawl Policies */}
        <Flex direction="column" gap="3">
          <Heading size="2" color="gray">Granular Crawler Policies</Heading>

          {/* AI Search Bots */}
          <Flex justify="between" align="center" gap="4">
            <Box style={{ flex: 1 }}>
              <Text as="label" htmlFor="settings-ai-search-select" size="2" weight="medium" style={{ display: 'block' }}>
                AI Search Bots
              </Text>
              <Text id="settings-ai-search-description" size="1" color="gray">
                Search citation crawlers like Perplexity, Bing Copilot, and Google AI Overview indexing content for citations.
              </Text>
            </Box>

            <Controller
              control={control}
              name="aiSearch"
              render={({ field }) => (
                <Select.Root
                  value={field.value || 'disabled'}
                  onValueChange={field.onChange}
                >
                  <Select.Trigger
                    id="settings-ai-search-select"
                    aria-describedby="settings-ai-search-description"
                    style={{ minWidth: '180px' }}
                  />
                  <Select.Content>
                    <Select.Item value="disabled">Allow (Index & Cite)</Select.Item>
                    <Select.Item value="block">Block Search Bots</Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            />
          </Flex>

          {/* AI Training Bots */}
          <Flex justify="between" align="center" gap="4">
            <Box style={{ flex: 1 }}>
              <Text as="label" htmlFor="settings-ai-training-select" size="2" weight="medium" style={{ display: 'block' }}>
                AI Model Training Bots
              </Text>
              <Text id="settings-ai-training-description" size="1" color="gray">
                Scrapers like GPTBot, ClaudeBot, and CCBot harvesting site content to train LLMs.
              </Text>
            </Box>

            <Controller
              control={control}
              name="aiTraining"
              render={({ field }) => (
                <Select.Root
                  value={field.value || 'disabled'}
                  onValueChange={field.onChange}
                >
                  <Select.Trigger
                    id="settings-ai-training-select"
                    aria-describedby="settings-ai-training-description"
                    style={{ minWidth: '180px' }}
                  />
                  <Select.Content>
                    <Select.Item value="block">Block at Edge</Select.Item>
                    <Select.Item value="disallow">Disallow (robots.txt)</Select.Item>
                    <Select.Item value="disabled">Allow Training Scraping</Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            />
          </Flex>

          {/* AI User Agents */}
          <Flex justify="between" align="center" gap="4">
            <Box style={{ flex: 1 }}>
              <Text as="label" htmlFor="settings-ai-user-select" size="2" weight="medium" style={{ display: 'block' }}>
                AI User Agents
              </Text>
              <Text id="settings-ai-user-description" size="1" color="gray">
                Autonomous browser agents and assistants browsing the site directly on behalf of end users.
              </Text>
            </Box>

            <Controller
              control={control}
              name="aiUser"
              render={({ field }) => (
                <Select.Root
                  value={field.value || 'disabled'}
                  onValueChange={field.onChange}
                >
                  <Select.Trigger
                    id="settings-ai-user-select"
                    aria-describedby="settings-ai-user-description"
                    style={{ minWidth: '180px' }}
                  />
                  <Select.Content>
                    <Select.Item value="disabled">Allow User Agents</Select.Item>
                    <Select.Item value="block">Block User Agents</Select.Item>
                  </Select.Content>
                </Select.Root>
              )}
            />
          </Flex>
        </Flex>
      </Flex>
    </Card>
  );
};
