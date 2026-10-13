import React from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import type { ThemeTokens } from '../../../../types';

export interface EditorialPreviewProps {
  tokens: ThemeTokens;
}

export const EditorialPreview: React.FC<EditorialPreviewProps> = ({ tokens }) => {
  return (
    <Box data-testid="preview-mode-editorial">
      {/* Tag / Category Badge */}
      <Box mb="2">
        <span
          style={{
            display: 'inline-block',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            color: tokens.colorAccent,
          }}
        >
          Literature & Critique
        </span>
      </Box>

      {/* Editorial Title */}
      <h1
        style={{
          fontFamily: tokens.fontHeadline,
          fontSize: '2rem',
          lineHeight: 1.25,
          margin: '0 0 0.75rem 0',
          fontWeight: 700,
          color: tokens.colorText,
        }}
      >
        The Architecture of the Modern Digital Essay
      </h1>

      {/* Byline / Meta */}
      <Flex
        align="center"
        gap="2"
        mb="4"
        style={{
          color: tokens.colorTextMuted,
          fontSize: '0.85rem',
        }}
      >
        <span>By Clara Vance</span>
        <span>&bull;</span>
        <span>October 9, 2026</span>
        <span>&bull;</span>
        <span>6 min read</span>
      </Flex>

      {/* Pullquote */}
      <blockquote
        style={{
          borderLeft: `3px solid ${tokens.colorAccent}`,
          margin: '1.5rem 0',
          paddingLeft: '1rem',
          fontFamily: tokens.fontHeadline,
          fontSize: '1.15rem',
          fontStyle: 'italic',
          color: tokens.colorText,
        }}
      >
        &ldquo;Typography is the invisible medium that gives voice to the unspoken
        rhythm of thought.&rdquo;
      </blockquote>

      {/* Body Paragraph */}
      <p style={{ margin: '0 0 1rem 0' }}>
        In an era dominated by relentless digital feeds, editorial craftsmanship demands
        intentional typographic rhythm. When thoughtful proportions, harmonious
        typefaces, and balanced whitespace meet, reading transforms into an immersive
        sensory ritual.
      </p>

      {/* Sample Bento Card / Surface Element */}
      <Box
        p="3"
        mt="4"
        style={{
          backgroundColor: tokens.colorSurface,
          border: `1px solid ${tokens.colorBorder}`,
          borderRadius: '8px',
          boxShadow: `3px 3px 0px color-mix(in srgb, ${tokens.colorBorder} 22%, transparent)`,
        }}
      >
        <Text size="1" weight="bold" style={{ color: tokens.colorAccent }}>
          FEATURED DISPATCH
        </Text>
        <Text
          size="2"
          weight="medium"
          as="div"
          mt="1"
          style={{ color: tokens.colorText }}
        >
          Subscribe to Weekly Editorial Letters
        </Text>
        <Text size="1" style={{ color: tokens.colorTextMuted }} mt="1" as="div">
          In-depth essays and typographic studies delivered directly to your inbox.
        </Text>
      </Box>
    </Box>
  );
};
