import React from 'react';
import { Box, Flex, Text, TextField, IconButton, Button } from '@radix-ui/themes';
import { CopyIcon, CheckIcon } from '@radix-ui/react-icons';
import { QRCodeDialog } from '../../../QRCodeDialog';
import type { CanonicalUrlCardProps } from '../../types';

export const CanonicalUrlCard: React.FC<CanonicalUrlCardProps> = ({
  absoluteCanonicalUrl,
  copiedLink,
  onCopy,
}) => {
  return (
    <Box p="4" style={{ background: 'var(--gray-2)', borderRadius: '8px', border: '1px solid var(--gray-4)' }}>
      <Text as="label" htmlFor="canonical-url-input" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
        Canonical URL
      </Text>
      <Flex gap="3" align="center">
        <TextField.Root id="canonical-url-input" aria-label="Canonical URL" size="2" value={absoluteCanonicalUrl} readOnly style={{ flex: 1 }}>
          <TextField.Slot>
            <IconButton
              size="1"
              variant="ghost"
              onClick={() => onCopy(absoluteCanonicalUrl)}
              aria-label="Copy canonical URL"
            >
              {copiedLink === absoluteCanonicalUrl ? <CheckIcon color="green" /> : <CopyIcon />}
            </IconButton>
          </TextField.Slot>
        </TextField.Root>
        <QRCodeDialog url={absoluteCanonicalUrl} trigger={<Button variant="outline">QR Code</Button>} />
      </Flex>
    </Box>
  );
};

export default CanonicalUrlCard;
