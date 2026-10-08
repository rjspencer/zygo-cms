import React, { useRef } from 'react';
import { Dialog, Button, Flex, Box, Text } from '@radix-ui/themes';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeDialogProps {
  url: string;
  trigger?: React.ReactNode;
}

export const QRCodeDialog: React.FC<QRCodeDialogProps> = ({ url, trigger }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [isCopied, setIsCopied] = React.useState(false);

  const handleCopy = async () => {
    if (!svgRef.current) return;
    try {
      const svg = svgRef.current;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Extract SVG source
      const svgData = new XMLSerializer().serializeToString(svg);
      const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
      const DOMURL = window.URL || window.webkitURL || window;
      const svgUrl = DOMURL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        DOMURL.revokeObjectURL(svgUrl);

        canvas.toBlob(async (blob) => {
          if (blob) {
            await navigator.clipboard.write([
              new ClipboardItem({ 'image/png': blob })
            ]);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          }
        }, 'image/png');
      };
      img.src = svgUrl;
    } catch (err) {
      console.error('Failed to copy QR code', err);
    }
  };

  const handleDownload = () => {
    if (!svgRef.current) return;
    const svg = svgRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const DOMURL = window.URL || window.webkitURL || window;
    const svgUrl = DOMURL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      DOMURL.revokeObjectURL(svgUrl);

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = 'qrcode.png';
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };
    img.src = svgUrl;
  };

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
