import React from 'react';
import { Card, Flex, Box, Heading, Text, Button, Badge, Separator, TextField, Grid } from '@radix-ui/themes';
import { FontFamilyIcon, ExternalLinkIcon } from '@radix-ui/react-icons';
import type { ThemeTokens, FontPreset } from '../../types';
import { FONT_PRESETS } from '../../constants';
import { cleanGoogleFontUrl } from '../../utils';

export interface TypographyPanelProps {
  tokens: ThemeTokens;
  setTokens: React.Dispatch<React.SetStateAction<ThemeTokens>>;
  onApplyFontPreset: (preset: FontPreset) => void;
}

export const TypographyPanel: React.FC<TypographyPanelProps> = ({
  tokens,
  setTokens,
  onApplyFontPreset,
}) => {
  return (
    <Card size="2">
      <Flex align="center" gap="2" mb="2">
        <FontFamilyIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
        <Heading size="3">Pick a Font & Google Fonts</Heading>
      </Flex>
      <Text size="2" color="gray" mb="3" as="div">
        Choose an editorial or technical pairing below, or copy your Google Fonts details here.
      </Text>

      {/* Google Fonts External Link & Instructions Box */}
      <Box
        p="3"
        mb="4"
        style={{
          backgroundColor: 'var(--gray-a2)',
          borderRadius: '8px',
          border: '1px solid var(--gray-a4)',
        }}
      >
        <Flex justify="between" align="center" mb="2">
          <Text size="2" weight="bold">
            Browse Google Fonts
          </Text>
          <Button size="1" variant="surface" color="cyan" asChild>
            <a href="https://fonts.google.com" target="_blank" rel="noopener noreferrer">
              Open Google Fonts <ExternalLinkIcon width="14" height="14" />
            </a>
          </Button>
        </Flex>
        <Text size="1" color="gray" as="div" style={{ lineHeight: 1.6 }}>
          <strong>How to copy fonts back to Zygo:</strong>
          <ol style={{ paddingLeft: '1.2rem', marginTop: '0.25rem', marginBottom: 0 }}>
            <li>Search and select your font styles on Google Fonts (e.g., 400, 600, 700).</li>
            <li>Click <em>Get embed code</em> &rarr; <em>Web (&lt;link&gt;)</em>.</li>
            <li>
              Copy the stylesheet URL starting with <code>https://fonts.googleapis.com/...</code>{' '}
              and paste into the Embed URL field below.
            </li>
            <li>
              Copy the CSS font name (e.g., <code>&apos;Playfair Display&apos;, serif</code>) and
              paste it into the Headline or Body field.
            </li>
          </ol>
        </Text>
      </Box>

      {/* Curated Font Pairings */}
      <Box mb="4">
        <Text size="2" weight="bold" mb="2" as="div">
          Curated Typography Pairings
        </Text>
        <Flex direction="column" gap="2">
          {FONT_PRESETS.map((p) => {
            const isSelected =
              tokens.fontHeadline === p.headlineFont && tokens.fontBody === p.bodyFont;
            return (
              <Box
                key={p.name}
                p="2"
                onClick={() => onApplyFontPreset(p)}
                style={{
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                  backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Flex justify="between" align="center">
                  <Text size="2" weight={isSelected ? 'bold' : 'medium'}>
                    {p.name}
                  </Text>
                  {isSelected && (
                    <Badge color="cyan" size="1">
                      Active
                    </Badge>
                  )}
                </Flex>
                <Text size="1" color="gray">
                  {p.description}
                </Text>
              </Box>
            );
          })}
        </Flex>
      </Box>

      <Separator size="4" my="3" />

      {/* Font Inputs */}
      <Box mb="3">
        <Text
          as="label"
          htmlFor="typography-font-url"
          size="2"
          weight="bold"
          mb="1"
          style={{ display: 'block' }}
        >
          Google Fonts Embed URL
        </Text>
        <TextField.Root
          id="typography-font-url"
          aria-describedby="typography-font-url-desc"
          value={tokens.fontUrl}
          placeholder="https://fonts.googleapis.com/css2?family=..."
          onChange={(e) =>
            setTokens((prev) => ({
              ...prev,
              fontUrl: cleanGoogleFontUrl(e.target.value),
            }))
          }
        />
        <Text id="typography-font-url-desc" size="1" color="gray" mt="1" as="div">
          Accepts either the direct URL or a full <code>&lt;link href=&quot;...&quot;&gt;</code> tag.
        </Text>
      </Box>

      <Grid columns="2" gap="3">
        <Box>
          <Text
            as="label"
            htmlFor="typography-headline-font"
            size="2"
            weight="bold"
            mb="1"
            style={{ display: 'block' }}
          >
            Headline Font Family (<code>--font-headline</code>)
          </Text>
          <TextField.Root
            id="typography-headline-font"
            value={tokens.fontHeadline}
            placeholder="'Newsreader', Georgia, serif"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, fontHeadline: e.target.value }))
            }
          />
        </Box>
        <Box>
          <Text
            as="label"
            htmlFor="typography-body-font"
            size="2"
            weight="bold"
            mb="1"
            style={{ display: 'block' }}
          >
            Body Font Family (<code>--font-body</code>)
          </Text>
          <TextField.Root
            id="typography-body-font"
            value={tokens.fontBody}
            placeholder="'Inter', sans-serif"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, fontBody: e.target.value }))
            }
          />
        </Box>
      </Grid>
    </Card>
  );
};
