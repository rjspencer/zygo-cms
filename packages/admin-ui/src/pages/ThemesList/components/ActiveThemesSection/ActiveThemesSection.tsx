import React from 'react';
import { Grid, Card, Flex, Box, Text, Heading, Badge, Button } from '@radix-ui/themes';
import { SunIcon, MoonIcon, Cross2Icon } from '@radix-ui/react-icons';
import type { ActiveThemesSectionProps } from '../../types';
import { ThemeSwatches } from '../ThemeSwatches/ThemeSwatches';

export const ActiveThemesSection: React.FC<ActiveThemesSectionProps> = ({
  primaryTheme,
  darkTheme,
  onRemoveDark,
  isRemovingDark = false,
}) => {
  return (
    <Box mb="6">
      <Heading size="3" mb="3" color="gray">
        Active Pair
      </Heading>
      <Grid columns={{ initial: '1', sm: '2' }} gap="4">
        {/* Primary Theme Card */}
        <Card size="2" style={{ borderLeft: '4px solid var(--cyan-9)' }}>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <SunIcon width="18" height="18" style={{ color: 'var(--amber-10)' }} />
                <Text size="2" weight="bold" color="cyan">
                  Primary Theme (Default / Light)
                </Text>
              </Flex>
              {primaryTheme && (
                <Badge color={primaryTheme.is_locked ? 'gray' : 'blue'} variant="soft">
                  {primaryTheme.is_locked ? 'Built-in' : 'Custom'}
                </Badge>
              )}
            </Flex>

            <Box>
              <Text size="4" weight="bold" as="div">
                {primaryTheme?.name || 'Modern Editorial'}
              </Text>
              <Text size="2" color="gray" mt="1" as="div">
                {primaryTheme?.description || 'Active primary site theme used for all visitors.'}
              </Text>
            </Box>

            <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-4)' }}>
              <Text size="1" color="gray">
                Palette Preview
              </Text>
              <ThemeSwatches tokens={primaryTheme?.tokens} />
            </Flex>
          </Flex>
        </Card>

        {/* Dark Mode Variant Card */}
        <Card size="2" style={{ borderLeft: '4px solid var(--indigo-9)' }}>
          <Flex direction="column" gap="3">
            <Flex justify="between" align="center">
              <Flex align="center" gap="2">
                <MoonIcon width="18" height="18" style={{ color: 'var(--indigo-10)' }} />
                <Text size="2" weight="bold" color="indigo">
                  Dark Mode Variant
                </Text>
              </Flex>
              {darkTheme && (
                <Badge color={darkTheme.is_locked ? 'gray' : 'blue'} variant="soft">
                  {darkTheme.is_locked ? 'Built-in' : 'Custom'}
                </Badge>
              )}
            </Flex>

            {darkTheme ? (
              <>
                <Box>
                  <Text size="4" weight="bold" as="div">
                    {darkTheme.name}
                  </Text>
                  <Text size="2" color="gray" mt="1" as="div">
                    {darkTheme.description || 'Used automatically when user device prefers dark mode.'}
                  </Text>
                </Box>

                <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-4)' }}>
                  <Flex align="center" gap="2">
                    <Text size="1" color="gray">
                      Palette Preview
                    </Text>
                    <ThemeSwatches tokens={darkTheme.tokens} />
                  </Flex>
                  <Button
                    size="1"
                    variant="soft"
                    color="red"
                    disabled={isRemovingDark}
                    onClick={onRemoveDark}
                    aria-label="Remove dark mode variant"
                  >
                    <Cross2Icon width="12" height="12" />
                    Remove
                  </Button>
                </Flex>
              </>
            ) : (
              <>
                <Box>
                  <Text size="3" weight="bold" color="gray" as="div">
                    None (Locked to Primary)
                  </Text>
                  <Text size="2" color="gray" mt="1" as="div">
                    Dark mode preferences fall back directly to primary theme styles.
                  </Text>
                </Box>
                <Flex justify="between" align="center" pt="2" style={{ borderTop: '1px solid var(--gray-4)' }}>
                  <Text size="1" color="gray">
                    Fallback Palette
                  </Text>
                  <ThemeSwatches tokens={primaryTheme?.tokens} />
                </Flex>
              </>
            )}
          </Flex>
        </Card>
      </Grid>
    </Box>
  );
};

export default ActiveThemesSection;
