import React from 'react';
import { Card, Flex, Box, Heading, Text, Grid, TextField, Button } from '@radix-ui/themes';
import {
  HeadingIcon,
  TextAlignCenterIcon,
  TextAlignLeftIcon,
  BorderBottomIcon,
} from '@radix-ui/react-icons';
import type { ThemeTokens } from '../../types';

export interface HeaderStylingPanelProps {
  tokens: ThemeTokens;
  setTokens: React.Dispatch<React.SetStateAction<ThemeTokens>>;
}

const LAYOUT_OPTIONS = [
  {
    id: 'centered' as const,
    label: 'Centered Masthead',
    desc: 'Classic editorial journal',
    icon: <TextAlignCenterIcon />,
  },
  {
    id: 'split' as const,
    label: 'Split Bar',
    desc: 'Brand left, nav right',
    icon: <TextAlignLeftIcon />,
  },
  {
    id: 'stacked' as const,
    label: 'Stacked Minimal',
    desc: 'Brand top, nav below',
    icon: <BorderBottomIcon />,
  },
];

const BORDER_STYLE_OPTIONS = [
  {
    id: 'double' as const,
    label: 'Double Border',
    desc: 'Classic editorial signature (3px double)',
  },
  {
    id: 'solid' as const,
    label: 'Single Solid',
    desc: 'Clean structural border',
  },
  {
    id: 'none' as const,
    label: 'None',
    desc: 'Seamless borderless',
  },
];

export const HeaderStylingPanel: React.FC<HeaderStylingPanelProps> = ({
  tokens,
  setTokens,
}) => {
  return (
    <Card size="2">
      <Flex align="center" gap="2" mb="2">
        <HeadingIcon width="18" height="18" style={{ color: 'var(--cyan-9)' }} />
        <Heading size="3">Header & Masthead Styling</Heading>
      </Flex>
      <Text size="2" color="gray" mb="3" as="div">
        Customize publication header layout, borders, and navigation styling.
      </Text>

      {/* Header Layout Selector */}
      <Box mb="4">
        <Text as="label" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
          Header Layout
        </Text>
        <Grid columns="3" gap="2">
          {LAYOUT_OPTIONS.map((item) => {
            const isSelected = tokens.headerLayout === item.id;
            return (
              <Box
                key={item.id}
                p="2"
                onClick={() =>
                  setTokens((prev) => ({
                    ...prev,
                    headerLayout: item.id,
                  }))
                }
                style={{
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                  backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Flex align="center" gap="1" mb="1">
                  {item.icon}
                  <Text size="2" weight={isSelected ? 'bold' : 'medium'}>
                    {item.label}
                  </Text>
                </Flex>
                <Text size="1" color="gray">
                  {item.desc}
                </Text>
              </Box>
            );
          })}
        </Grid>
      </Box>

      {/* Header Border Style */}
      <Box mb="4">
        <Text as="label" size="2" weight="bold" mb="2" style={{ display: 'block' }}>
          Header Border Style
        </Text>
        <Grid columns="3" gap="2">
          {BORDER_STYLE_OPTIONS.map((border) => {
            const isSelected = tokens.headerBorderStyle === border.id;
            return (
              <Box
                key={border.id}
                p="2"
                onClick={() =>
                  setTokens((prev) => ({
                    ...prev,
                    headerBorderStyle: border.id,
                  }))
                }
                style={{
                  borderRadius: '6px',
                  border: isSelected ? '1px solid var(--cyan-8)' : '1px solid var(--gray-a4)',
                  backgroundColor: isSelected ? 'var(--cyan-a3)' : 'var(--color-surface)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                <Text size="2" weight={isSelected ? 'bold' : 'medium'} as="div">
                  {border.label}
                </Text>
                <Text size="1" color="gray">
                  {border.desc}
                </Text>
              </Box>
            );
          })}
        </Grid>
      </Box>

      <Grid columns="2" gap="3" mb="3">
        {/* Brand Title Size */}
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Masthead Title Size (<code>--header-title-size</code>)
          </Text>
          <TextField.Root
            value={tokens.headerTitleSize}
            placeholder="2rem"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, headerTitleSize: e.target.value }))
            }
          />
        </Box>

        {/* Nav Text Transform */}
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Navigation Lettering (<code>--header-nav-transform</code>)
          </Text>
          <Flex gap="2" mt="1">
            <Button
              size="2"
              variant={tokens.headerNavTransform === 'uppercase' ? 'solid' : 'outline'}
              color="cyan"
              style={{ flex: 1 }}
              onClick={() =>
                setTokens((prev) => ({ ...prev, headerNavTransform: 'uppercase' }))
              }
            >
              UPPERCASE
            </Button>
            <Button
              size="2"
              variant={tokens.headerNavTransform === 'none' ? 'solid' : 'outline'}
              color="cyan"
              style={{ flex: 1 }}
              onClick={() =>
                setTokens((prev) => ({ ...prev, headerNavTransform: 'none' }))
              }
            >
              Normal Case
            </Button>
          </Flex>
        </Box>
      </Grid>

      <Grid columns="2" gap="3">
        {/* Header Tagline / Subtitle */}
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Editorial Tagline
          </Text>
          <TextField.Root
            value={tokens.headerTagline}
            placeholder="An Editorial Review & Journal"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, headerTagline: e.target.value }))
            }
          />
        </Box>

        {/* Header Padding */}
        <Box>
          <Text as="label" size="2" weight="bold" mb="1" style={{ display: 'block' }}>
            Header Padding (<code>--header-padding</code>)
          </Text>
          <TextField.Root
            value={tokens.headerPadding}
            placeholder="1.75rem 0 1.25rem 0"
            onChange={(e) =>
              setTokens((prev) => ({ ...prev, headerPadding: e.target.value }))
            }
          />
        </Box>
      </Grid>
    </Card>
  );
};
