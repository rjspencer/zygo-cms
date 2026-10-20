import React from 'react';
import { Card, Flex, Box, Heading, Badge, Button, Text } from '@radix-ui/themes';
import type { ThemeTokens } from '../../types';
import { getHeaderBorderBottomCss } from '../../utils';
import { PreviewHeader } from './components/PreviewHeader/PreviewHeader';
import { EditorialPreview } from './components/EditorialPreview/EditorialPreview';
import { DocsPreview } from './components/DocsPreview/DocsPreview';
import { CssExportSnippet } from './components/CssExportSnippet/CssExportSnippet';

export interface ThemePreviewProps {
  tokens: ThemeTokens;
  previewMode: 'editorial' | 'docs';
  setPreviewMode: (mode: 'editorial' | 'docs') => void;
  generatedCss: string;
  copiedCss: boolean;
  onCopyCss: () => void;
  siteLogo?: string;
  siteTitle?: string;
  footerText?: string;
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  tokens,
  previewMode,
  setPreviewMode,
  generatedCss,
  copiedCss,
  onCopyCss,
  siteLogo,
  siteTitle,
  footerText,
}) => {
  const borderBottomCss = getHeaderBorderBottomCss(tokens);

  return (
    <Card size="2" style={{ position: 'sticky', top: '1rem' }}>
      <Flex justify="between" align="center" mb="3" wrap="wrap" gap="2">
        <Flex align="center" gap="2">
          <Heading size="3">Live Editorial Preview</Heading>
          <Badge color="green" variant="soft">
            Dynamic Preview
          </Badge>
        </Flex>
        <Flex gap="1" role="group" aria-label="Preview layout mode">
          <Button
            size="1"
            variant={previewMode === 'editorial' ? 'solid' : 'soft'}
            color="cyan"
            onClick={() => setPreviewMode('editorial')}
          >
            Editorial / Bento
          </Button>
          <Button
            size="1"
            variant={previewMode === 'docs' ? 'solid' : 'soft'}
            color="cyan"
            onClick={() => setPreviewMode('docs')}
          >
            Docs Layout
          </Button>
        </Flex>
      </Flex>

      {/* The Live Rendered Preview Container with WebMCP subtle dotted texture */}
      <Box
        data-testid="editorial-preview-container"
        p="5"
        style={{
          backgroundColor: tokens.colorBg,
          backgroundImage: `radial-gradient(color-mix(in srgb, ${tokens.colorText} 7%, transparent) 1px, transparent 1px)`,
          backgroundSize: '20px 20px',
          color: tokens.colorText,
          borderRadius: '8px',
          border: `1px solid ${tokens.colorBorder}`,
          fontFamily: tokens.fontBody,
          fontSize: tokens.fontSizeBase,
          lineHeight: tokens.lineHeightBody,
          transition: 'all 0.2s ease',
          overflow: 'hidden',
        }}
      >
        <PreviewHeader
          tokens={tokens}
          borderBottomCss={borderBottomCss}
          siteLogo={siteLogo}
          siteTitle={siteTitle}
        />

        {previewMode === 'editorial' ? (
          <EditorialPreview tokens={tokens} />
        ) : (
          <DocsPreview tokens={tokens} />
        )}

        {/* Preview Footer */}
        <Box
          data-testid="preview-footer-container"
          mt="5"
          pt="3"
          style={{
            borderTop: `1px solid color-mix(in srgb, ${tokens.colorBorder} 50%, transparent)`,
            display: 'flex',
            flexDirection: 'column',
            alignItems: tokens.headerLayout === 'centered' ? 'center' : 'flex-start',
            textAlign: tokens.headerLayout === 'centered' ? 'center' : 'left',
            gap: '0.4rem',
          }}
        >
          <Flex
            gap="3"
            wrap="wrap"
            justify={tokens.headerLayout === 'centered' ? 'center' : 'start'}
            style={{ fontSize: '0.8rem', color: tokens.colorTextMuted }}
          >
            <span>Home</span>
            <span>&bull;</span>
            <span>Essays</span>
            <span>&bull;</span>
            <span>Docs</span>
            <span>&bull;</span>
            <span>Privacy</span>
          </Flex>
          <Text
            data-testid="preview-footer-copyright"
            size="1"
            as="div"
            style={{
              color: tokens.colorTextMuted,
              fontFamily: tokens.fontBody,
            }}
          >
            {footerText
              ? footerText.replace(/\{\{\s*(year|current_year)\s*\}\}/gi, String(new Date().getFullYear()))
              : `© ${new Date().getFullYear()} ${siteTitle || 'The Zygo Review'}. All rights reserved.`}
          </Text>
        </Box>
      </Box>

      <CssExportSnippet
        generatedCss={generatedCss}
        copiedCss={copiedCss}
        onCopyCss={onCopyCss}
      />
    </Card>
  );
};
