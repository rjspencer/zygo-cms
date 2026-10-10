import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { within, userEvent, expect } from '@storybook/test';
import { Theme, Box, Button, Flex, Heading, Text, Badge, Card, Code } from '@radix-ui/themes';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { Editor as TipTapEditor } from '@tiptap/react';
import { RichTextEditor } from '../components/RichTextEditor';
import { WebMCPProvider, useWebMCP } from '../providers/WebMCPProvider';
import { useTipTapWebMCP } from '../lib/webmcp/entryTools';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

const EditorWebMCPDemoComponent: React.FC = () => {
  const [content, setContent] = useState('<p>Welcome to the <strong>Zygo CMS</strong> WebMCP Editor!</p>');
  const [editor, setEditor] = useState<TipTapEditor | null>(null);
  const [title, setTitle] = useState('Introducing WebMCP Tools');
  const [slug, setSlug] = useState('introducing-webmcp-tools');
  const [status, setStatus] = useState<'draft' | 'published' | 'scheduled'>('draft');
  const [lastLog, setLastLog] = useState<string>('');

  const { registry } = useWebMCP();

  useTipTapWebMCP({
    editor,
    content,
    setContent,
    title,
    setTitle,
    slug,
    setSlug,
    status,
    setStatus,
    entryType: 'post',
    description: 'An interactive demo showing browser-side WebMCP agent tooling for Zygo CMS.',
    tags: 'webmcp, ai, cms',
    onSaveDraft: () => ({ success: true, timestamp: Date.now() }),
    onPublish: () => ({ success: true, published_at: new Date().toISOString() }),
  });

  const handleInsertContent = async () => {
    const res = await registry.callTool('editor_insert_content', {
      content: '<p>🤖 <strong>WebMCP Agent:</strong> Added a new automated paragraph!</p>',
      position: 'end',
    });
    setLastLog(JSON.stringify(res, null, 2));
  };

  const handleUpdateMetadata = async () => {
    const res = await registry.callTool('editor_set_metadata', {
      title: 'Agent Updated Title',
      status: 'published',
    });
    setLastLog(JSON.stringify(res, null, 2));
  };

  const handleGetContent = async () => {
    const res = await registry.callTool('editor_get_content', { format: 'html' });
    setLastLog(JSON.stringify(res, null, 2));
  };

  const registeredTools = registry.getTools().map((t) => t.name);

  return (
    <Box p="4" style={{ maxWidth: 850, margin: '0 auto', fontFamily: 'sans-serif' }}>
      <Flex direction="column" gap="4">
        <Flex justify="between" align="center">
          <Box>
            <Heading size="6">{title}</Heading>
            <Text size="2" color="gray">
              Slug: /{slug}
            </Text>
          </Box>
          <Badge color={status === 'published' ? 'green' : 'amber'} size="2">
            {status.toUpperCase()}
          </Badge>
        </Flex>

        <Card size="2">
          <Text size="2" weight="bold" mb="2" as="div">
            WebMCP Agent Controls Simulation
          </Text>
          <Flex gap="2" wrap="wrap">
            <Button
              size="2"
              variant="solid"
              color="cyan"
              data-testid="agent-insert-btn"
              onClick={handleInsertContent}
            >
              Insert Content via Tool
            </Button>
            <Button
              size="2"
              variant="soft"
              color="blue"
              data-testid="agent-metadata-btn"
              onClick={handleUpdateMetadata}
            >
              Set Metadata via Tool
            </Button>
            <Button
              size="2"
              variant="soft"
              color="gray"
              data-testid="agent-inspect-btn"
              onClick={handleGetContent}
            >
              Inspect Content via Tool
            </Button>
          </Flex>

          <Box mt="3">
            <Text size="1" color="gray" as="div" mb="1">
              Active Registered WebMCP Tools ({registeredTools.length}):
            </Text>
            <Flex gap="1" wrap="wrap">
              {registeredTools.map((t) => (
                <Code key={t} size="1" color="indigo">
                  {t}
                </Code>
              ))}
            </Flex>
          </Box>
        </Card>

        <Box>
          <Text size="2" weight="bold" mb="1" as="div">
            Rich Text Editor (TipTap)
          </Text>
          <RichTextEditor
            value={content}
            onChange={setContent}
            onEditorReady={setEditor}
            minHeight="220px"
            aria-label="Storybook RichTextEditor"
          />
        </Box>

        {lastLog && (
          <Card size="1" style={{ backgroundColor: 'var(--gray-a2)' }}>
            <Text size="1" weight="bold" color="gray" mb="1" as="div">
              Last Agent Tool Call Output:
            </Text>
            <pre
              data-testid="agent-log-output"
              style={{
                margin: 0,
                fontSize: '11px',
                lineHeight: 1.4,
                overflowX: 'auto',
                padding: '6px',
                background: 'var(--gray-a3)',
                borderRadius: '4px',
              }}
            >
              {lastLog}
            </pre>
          </Card>
        )}
      </Flex>
    </Box>
  );
};

const meta = {
  title: 'WebMCP/EditorTools',
  component: EditorWebMCPDemoComponent,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <WebMCPProvider>
            <Theme appearance="light" accentColor="cyan" radius="medium">
              <Story />
            </Theme>
          </WebMCPProvider>
        </MemoryRouter>
      </QueryClientProvider>
    ),
  ],
} satisfies Meta<typeof EditorWebMCPDemoComponent>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const TriggerAgentInsert: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const insertBtn = canvas.getByTestId('agent-insert-btn');
    await userEvent.click(insertBtn);

    const logOutput = await canvas.findByTestId('agent-log-output');
    await expect(logOutput).toBeInTheDocument();
    await expect(logOutput.textContent).toContain('Inserted content at end.');
  },
};
