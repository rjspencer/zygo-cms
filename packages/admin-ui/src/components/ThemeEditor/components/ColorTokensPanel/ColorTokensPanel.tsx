import React from 'react';
import { Card, Flex, Box, Heading, Text, Button, Grid, TextField } from '@radix-ui/themes';
import { ColorWheelIcon } from '@radix-ui/react-icons';
import type { ThemeTokens } from '../../types';
import { CMYK_INK_SWATCHES } from '../../constants';

export interface ColorTokensPanelProps {
  tokens: ThemeTokens;
  setTokens: React.Dispatch<React.SetStateAction<ThemeTokens>>;
}

interface ColorFieldConfig {
  label: string;
  cssVar: string;
  key: keyof Pick<
    ThemeTokens,
    | 'colorBg'
    | 'colorText'
    | 'colorAccent'
    | 'colorTextMuted'
    | 'colorSurface'
    | 'colorBorder'
  >;
  ariaLabel: string;
}

const COLOR_FIELDS: ColorFieldConfig[] = [
  {
    label: 'Background',
    cssVar: '--color-bg',
    key: 'colorBg',
    ariaLabel: 'Color picker for Page Background',
  },
  {
    label: 'Text',
    cssVar: '--color-text',
    key: 'colorText',
    ariaLabel: 'Color picker for Text',
  },
  {
    label: 'Accent',
    cssVar: '--color-accent',
    key: 'colorAccent',
    ariaLabel: 'Color picker for Accent Color',
  },
  {
    label: 'Muted Text',
    cssVar: '--color-text-muted',
    key: 'colorTextMuted',
    ariaLabel: 'Color picker for Muted Text',
  },
  {
    label: 'Surface / Card',
    cssVar: '--color-surface',
    key: 'colorSurface',
    ariaLabel: 'Color picker for Surface Color',
  },
  {
    label: 'Border',
    cssVar: '--color-border',
    key: 'colorBorder',
    ariaLabel: 'Color picker for Border Color',
  },
];

export const ColorTokensPanel: React.FC<ColorTokensPanelProps> = ({
  tokens,
  setTokens,
}) => {
  return (
    <Card size="2">
      <Flex align="center" gap="2" mb="2">
        <ColorWheelIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
        <Heading size="3">Color Design Tokens (CSS Variables)</Heading>
      </Flex>
      <Text size="2" color="gray" mb="3" as="div">
        Adjust color variables or apply rich CMYK print-shop ink accents.
      </Text>

      {/* Quick CMYK Print-Shop Accent Swatches */}
      <Box mb="3">
        <Text size="1" weight="bold" color="gray" mb="1" as="div">
          CMYK Print-Shop Accent Inks (Click to set Accent)
        </Text>
        <Flex gap="2" wrap="wrap">
          {CMYK_INK_SWATCHES.map((swatch) => (
            <Button
              key={swatch.hex}
              size="1"
              variant="outline"
              color="gray"
              onClick={() => setTokens((prev) => ({ ...prev, colorAccent: swatch.hex }))}
            >
              <span
                style={{
                  display: 'inline-block',
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  backgroundColor: swatch.hex,
                }}
              />
              {swatch.name}
            </Button>
          ))}
        </Flex>
      </Box>

      <Grid columns="2" gap="3">
        {COLOR_FIELDS.map(({ label, cssVar, key, ariaLabel }) => (
          <Box key={key}>
            <Text
              as="label"
              htmlFor={`color-input-${key}`}
              size="2"
              weight="bold"
              mb="1"
              style={{ display: 'block' }}
            >
              {label} (<code>{cssVar}</code>)
            </Text>
            <Flex gap="2" align="center">
              <input
                type="color"
                value={tokens[key]}
                aria-label={ariaLabel}
                onChange={(e) =>
                  setTokens((prev) => ({ ...prev, [key]: e.target.value }))
                }
                style={{
                  width: '36px',
                  height: '36px',
                  padding: 0,
                  border: '1px solid var(--gray-a5)',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              />
              <TextField.Root
                id={`color-input-${key}`}
                aria-label={`${label} hex code`}
                style={{ flex: 1 }}
                value={tokens[key]}
                onChange={(e) =>
                  setTokens((prev) => ({ ...prev, [key]: e.target.value }))
                }
              />
            </Flex>
          </Box>
        ))}
      </Grid>
    </Card>
  );
};
