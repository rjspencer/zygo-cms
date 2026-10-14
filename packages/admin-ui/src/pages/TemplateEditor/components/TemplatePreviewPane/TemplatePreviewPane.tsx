import React from 'react';
import { Box, Card, Flex, Text, Badge } from '@radix-ui/themes';
import type { TemplatePreviewPaneProps } from '../../types';

export const TemplatePreviewPane: React.FC<TemplatePreviewPaneProps> = ({
  formId,
  previewHtml,
  formTemplateCss,
  debouncedWasmHtml,
  formTemplateHtml,
  isStatusCompiling,
  renderCount,
}) => {
  return (
    <Box style={{ flex: 1, minWidth: 0, height: '100%' }}>
      <Card size="2" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Flex justify="between" align="center" mb="2">
          <Text as="div" size="2" weight="bold">Live Preview (Wasm)</Text>
          <Badge
            id="wasm-render-status"
            color={isStatusCompiling ? 'amber' : 'green'}
            data-status={isStatusCompiling ? 'compiling' : 'rendered'}
            data-render-count={renderCount}
          >
            {isStatusCompiling ? 'Compiling...' : 'Live'}
          </Badge>
        </Flex>
        <Box
          style={{
            flexGrow: 1,
            minHeight: 0,
            backgroundColor: '#fff',
            border: '1px solid var(--gray-5)',
            borderRadius: 'var(--radius-2)',
            overflow: 'hidden',
          }}
        >
          <iframe
            title="Wasm Preview"
            sandbox="allow-scripts"
            srcDoc={`
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1">
                  <link rel="stylesheet" href="/styles/main.css" />
                  <style>
                    /* ${debouncedWasmHtml !== formTemplateHtml ? formTemplateCss : debouncedWasmHtml} reactivity trigger */
                    .template-${formId} {
                      ${formTemplateCss}
                    }
                  </style>
                </head>
                <body>
                  <div class="template-${formId}" style="display: contents;">
                    ${previewHtml || '<div style="padding: 20px; color: #888; font-family: sans-serif;">Waiting for template render...</div>'}
                  </div>
                </body>
              </html>
            `}
            style={{ width: '100%', height: '100%', border: 'none' }}
          />
        </Box>
      </Card>
    </Box>
  );
};
