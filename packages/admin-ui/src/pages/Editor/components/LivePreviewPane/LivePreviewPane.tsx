import React from 'react';
import { Box, Card, Text } from '@radix-ui/themes';
import { getPublicSiteUrl } from '../../../../utils/api';

interface LivePreviewPaneProps {
  previewHtml: string;
  previewCss: string;
}

export const LivePreviewPane: React.FC<LivePreviewPaneProps> = ({ previewHtml, previewCss }) => {
  const publicBaseUrl = getPublicSiteUrl();
  const publicCssUrl = getPublicSiteUrl('/style.css');

  return (
    <Box style={{ flex: 1, minWidth: 0, height: '100%' }}>
      <Card size="2" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <Text as="div" size="2" weight="bold" mb="2">Live Preview</Text>
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
                      <base href="${publicBaseUrl}">
                      <link rel="stylesheet" href="${publicCssUrl}" />
                      <style>${previewCss}</style>
                    </head>
                    <body>
                      ${previewHtml || '<div style="padding: 20px; color: #888; font-family: sans-serif;">Waiting for preview render...</div>'}
                      <script>
                        document.addEventListener('click', function(e) {
                          var a = e.target.closest('a');
                          if (a) e.preventDefault();
                        });
                      </script>
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
