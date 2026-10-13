import React from 'react';
import { Card, Heading, Grid, Box, Text, TextField } from '@radix-ui/themes';
import type { ThemeTokens } from '../../types';

export interface LayoutDimensionsPanelProps {
  tokens: ThemeTokens;
  setTokens: React.Dispatch<React.SetStateAction<ThemeTokens>>;
}

export const LayoutDimensionsPanel: React.FC<LayoutDimensionsPanelProps> = ({
  tokens,
  setTokens,
}) => {
  return (
    <Card size="2">
      <Heading size="3" mb="2">
        Layout & Sizing Tokens
      </Heading>
      <Grid columns="3" gap="3">
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Max Width (<code>--content-max-width</code>)
          </Text>
          <TextField.Root
            value={tokens.maxWidth}
            placeholder="740px"
            onChange={(e) => setTokens((prev) => ({ ...prev, maxWidth: e.target.value }))}
          />
        </Box>
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Base Font Size (<code>--font-size-base</code>)
          </Text>
          <TextField.Root
            value={tokens.fontSizeBase}
            placeholder="18px"
            onChange={(e) => setTokens((prev) => ({ ...prev, fontSizeBase: e.target.value }))}
          />
        </Box>
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Line Height (<code>--line-height-body</code>)
          </Text>
          <TextField.Root
            value={tokens.lineHeightBody}
            placeholder="1.75"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, lineHeightBody: e.target.value }))
            }
          />
        </Box>
      </Grid>
    </Card>
  );
};
