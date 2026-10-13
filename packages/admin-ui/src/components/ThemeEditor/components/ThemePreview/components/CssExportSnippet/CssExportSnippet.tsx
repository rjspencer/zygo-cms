import React from 'react';
import { Box, Flex, Text, Button, Separator } from '@radix-ui/themes';
import { CopyIcon } from '@radix-ui/react-icons';

export interface CssExportSnippetProps {
  generatedCss: string;
  copiedCss: boolean;
  onCopyCss: () => void;
}

export const CssExportSnippet: React.FC<CssExportSnippetProps> = ({
  generatedCss,
  copiedCss,
  onCopyCss,
}) => {
  return (
    <>
      <Separator size="4" my="3" />
      <Box>
        <Flex justify="between" align="center" mb="2">
          <Text size="2" weight="bold">
            Generated CSS Variables
          </Text>
          <Button size="1" variant="ghost" color="gray" onClick={onCopyCss}>
            <CopyIcon width="14" height="14" /> {copiedCss ? 'Copied!' : 'Copy CSS'}
          </Button>
        </Flex>
        <pre
          style={{
            backgroundColor: 'var(--gray-a3)',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.75rem',
            lineHeight: 1.5,
            overflowX: 'auto',
            fontFamily: 'ui-monospace, monospace',
            margin: 0,
          }}
        >
          {generatedCss}
        </pre>
      </Box>
    </>
  );
};
