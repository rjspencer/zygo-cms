import React from 'react';
import { Dialog, Button, Flex, Box, Text } from '@radix-ui/themes';
import { QRCodeSVG } from 'qrcode.react';
import { useQRCodeActions } from './hooks';
import type { QRCodeDialogProps } from './types';

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({ url, trigger }) => {
  const { svgRef, isCopied, handleCopy, handleDownload } = useQRCodeActions();

  return (
    <Dialog.Root>
      <Dialog.Trigger>
        {trigger || <Button variant="soft">QR Code</Button>}
      </Dialog.Trigger>
      <Dialog.Content maxWidth="400px">
        <Dialog.Title>Share via QR Code</Dialog.Title>
        <Dialog.Description size="2" mb="4">
          Scan to visit the trackable link.
        </Dialog.Description>

        <Flex direction="column" align="center" gap="4">
          <Box style={{ background: 'white', padding: '16px', borderRadius: '8px' }}>
            <QRCodeSVG
              value={url}
              size={200}
              ref={svgRef}
              includeMargin={false}
            />
          </Box>
          <Text size="1" color="gray" style={{ wordBreak: 'break-all', textAlign: 'center' }}>
            {url}
          </Text>

          <Flex gap="3" mt="2">
            <Button variant="soft" onClick={handleCopy}>
              {isCopied ? 'Copied!' : 'Copy to Clipboard'}
            </Button>
            <Button onClick={handleDownload}>
              Download Image
            </Button>
          </Flex>
        </Flex>

        <Flex gap="3" mt="5" justify="end">
          <Dialog.Close>
            <Button variant="soft" color="gray">
              Close
            </Button>
          </Dialog.Close>
        </Flex>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default QRCodeDialog;
