import React from 'react';
import { Card, Flex, Box, Heading, Badge, Button } from '@radix-ui/themes';
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
}

export const ThemePreview: React.FC<ThemePreviewProps> = ({
  tokens,
  previewMode,
  setPreviewMode,
  generatedCss,
  copiedCss,
  onCopyCss,
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
        <PreviewHeader tokens={tokens} borderBottomCss={borderBottomCss} />

        {previewMode === 'editorial' ? (
          <EditorialPreview tokens={tokens} />
        ) : (
          <DocsPreview tokens={tokens} />
        )}
      </Box>

      <CssExportSnippet
        generatedCss={generatedCss}
        copiedCss={copiedCss}
        onCopyCss={onCopyCss}
      />
    </Card>
  );
};
