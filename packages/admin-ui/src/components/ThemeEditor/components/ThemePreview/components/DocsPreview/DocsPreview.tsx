import React from 'react';
import { Grid, Box, Text, Flex } from '@radix-ui/themes';
import type { ThemeTokens } from '../../../../types';

export interface DocsPreviewProps {
  tokens: ThemeTokens;
}

export const DocsPreview: React.FC<DocsPreviewProps> = ({ tokens }) => {
  return (
    <Grid
      data-testid="preview-mode-docs"
      columns={{ initial: '1', sm: '150px 1fr 120px' }}
      gap="3"
      style={{ alignItems: 'start' }}
    >
      {/* Left Docs Sidebar */}
      <Box
        p="2"
        style={{
          backgroundColor: `color-mix(in srgb, ${tokens.colorSurface} 88%, transparent)`,
          border: `1px solid ${tokens.colorBorder}`,
          borderRadius: tokens.borderRadius,
          boxShadow: tokens.boxShadow,
          fontSize: '0.78rem',
        }}
      >
        <Box
          mb="2"
          p="1"
          style={{
            backgroundColor: tokens.colorSurface,
            border: `1px solid ${tokens.colorBorder}`,
            borderRadius: tokens.borderRadius,
            color: tokens.colorTextMuted,
            fontSize: '0.72rem',
          }}
        >
          Search docs...
        </Box>
        <Text
          size="1"
          weight="bold"
          as="div"
          mb="1"
          style={{
            color: tokens.colorText,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            fontSize: '0.7rem',
          }}
        >
          Core Concepts
        </Text>
        <Box
          style={{
            borderLeft: `1.5px solid ${tokens.colorBorder}`,
            marginLeft: '0.25rem',
            paddingLeft: '0.4rem',
          }}
        >
          <div
            style={{
              padding: '0.25rem 0.4rem',
              borderLeft: `3px solid ${tokens.colorAccent}`,
              backgroundColor: `color-mix(in srgb, ${tokens.colorAccent} 12%, ${tokens.colorSurface})`,
              color: tokens.colorAccent,
              fontWeight: 700,
              borderRadius: '0 4px 4px 0',
              marginBottom: '0.2rem',
            }}
          >
            Edge Caching
          </div>
          <div style={{ padding: '0.25rem 0.4rem', color: tokens.colorTextMuted }}>
            D1 Schema
          </div>
          <div style={{ padding: '0.25rem 0.4rem', color: tokens.colorTextMuted }}>
            WebMCP Bridge
          </div>
        </Box>
      </Box>

      {/* Center Docs Main Bento Article */}
      <Box
        p="3"
        style={{
          backgroundColor: tokens.colorSurface,
          border: `1px solid ${tokens.colorBorder}`,
          borderRadius: tokens.borderRadius,
          boxShadow: tokens.boxShadow,
        }}
      >
        <h2
          style={{
            fontFamily: tokens.fontHeadline,
            fontSize: '1.35rem',
            fontWeight: 700,
            margin: '0 0 0.5rem 0',
            color: tokens.colorText,
          }}
        >
          Edge Caching & Invalidation
        </h2>
        <p style={{ fontSize: '0.85rem', margin: '0 0 0.75rem 0' }}>
          Zygo CMS caches rendered HTML at the Cloudflare edge and purges canonical
          paths automatically on publish.
        </p>
        <pre
          style={{
            backgroundColor: '#18181b',
            color: '#f4f4f5',
            padding: '0.6rem 0.75rem',
            borderRadius: tokens.borderRadius,
            fontSize: '0.72rem',
            fontFamily: 'ui-monospace, monospace',
            margin: '0 0 0.75rem 0',
            overflowX: 'auto',
          }}
        >
          <code>cache::purge_urls(&amp;env, urls).await;</code>
        </pre>
        <Flex justify="between" gap="2" mt="3">
          <span
            style={{
              padding: '0.3rem 0.6rem',
              border: `1px solid ${tokens.colorBorder}`,
              borderRadius: tokens.borderRadius,
              fontSize: '0.72rem',
              fontWeight: 600,
              boxShadow: tokens.boxShadow,
            }}
          >
            &larr; Getting Started
          </span>
          <span
            style={{
              padding: '0.3rem 0.6rem',
              border: `1px solid ${tokens.colorBorder}`,
              borderRadius: tokens.borderRadius,
              fontSize: '0.72rem',
              fontWeight: 600,
              color: tokens.colorAccent,
              boxShadow: tokens.boxShadow,
            }}
          >
            D1 Schema &rarr;
          </span>
        </Flex>
      </Box>

      {/* Right TOC Rail */}
      <Box
        pl="2"
        style={{
          borderLeft: `1px solid ${tokens.colorBorder}`,
          fontSize: '0.72rem',
        }}
      >
        <div
          style={{
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.06em',
            color: tokens.colorTextMuted,
            marginBottom: '0.4rem',
          }}
        >
          On this page
        </div>
        <div
          style={{
            color: tokens.colorAccent,
            fontWeight: 600,
            borderLeft: `2px solid ${tokens.colorAccent}`,
            paddingLeft: '0.4rem',
            marginLeft: '-0.55rem',
            marginBottom: '0.25rem',
          }}
        >
          Cache Purge
        </div>
        <div style={{ color: tokens.colorTextMuted }}>Headers</div>
      </Box>
    </Grid>
  );
};
