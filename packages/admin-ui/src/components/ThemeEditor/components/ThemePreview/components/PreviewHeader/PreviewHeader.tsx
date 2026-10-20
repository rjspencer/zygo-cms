import React from 'react';
import { Box, Flex, Text } from '@radix-ui/themes';
import { getPublicSiteUrl } from '../../../../../../utils/api';
import type { ThemeTokens } from '../../../../types';

export interface PreviewHeaderProps {
  tokens: ThemeTokens;
  borderBottomCss: string;
  siteLogo?: string;
  siteTitle?: string;
}

export const PreviewHeader: React.FC<PreviewHeaderProps> = ({
  tokens,
  borderBottomCss,
  siteLogo,
  siteTitle,
}) => {
  const resolvedLogo = siteLogo ? getPublicSiteUrl(siteLogo) : '';
  const displayTitle = siteTitle || 'The Zygo Review';

  const brandElement = resolvedLogo ? (
    <img
      src={resolvedLogo}
      alt={displayTitle}
      data-testid="preview-site-logo"
      style={{
        maxHeight: '44px',
        maxWidth: '180px',
        objectFit: 'contain',
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
      onError={(e) => {
        (e.target as HTMLElement).style.display = 'none';
      }}
    />
  ) : (
    <Text
      weight="bold"
      as="div"
      style={{
        fontFamily: tokens.fontHeadline,
        fontSize: tokens.headerTitleSize,
        color: tokens.colorText,
        letterSpacing: '-0.02em',
        lineHeight: 1.15,
      }}
    >
      {displayTitle}
    </Text>
  );

  const navItemStyle: React.CSSProperties = {
    color: tokens.colorText,
    backgroundColor: tokens.colorSurface,
    border: `1px solid ${tokens.colorBorder}`,
    boxShadow: tokens.boxShadow,
    borderRadius: tokens.borderRadius,
    padding: '0.25rem 0.6rem',
    fontWeight: 700,
    textTransform: tokens.headerNavTransform,
    letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
    fontSize: '0.78rem',
  };

  const navItemMutedStyle: React.CSSProperties = {
    color: tokens.colorTextMuted,
    padding: '0.25rem 0.6rem',
    fontWeight: 600,
    textTransform: tokens.headerNavTransform,
    letterSpacing: tokens.headerNavTransform === 'uppercase' ? '0.08em' : 'normal',
    fontSize: '0.78rem',
  };

  if (tokens.headerLayout === 'centered') {
    return (
      <Box
        data-testid="preview-header-centered"
        pb="3"
        mb="4"
        style={{
          borderBottom: borderBottomCss,
          padding: tokens.headerPadding,
          textAlign: 'center',
        }}
      >
        {brandElement}
        {tokens.headerTagline && (
          <Text
            size="1"
            as="div"
            style={{
              color: tokens.colorTextMuted,
              fontStyle: 'italic',
              fontFamily: tokens.fontHeadline,
              marginTop: '0.25rem',
            }}
          >
            {tokens.headerTagline}
          </Text>
        )}
        <Flex gap="2" mt="3" justify="center" wrap="wrap">
          <span style={navItemStyle}>Essays</span>
          <span style={navItemMutedStyle}>Docs</span>
          <span style={navItemMutedStyle}>About</span>
        </Flex>
      </Box>
    );
  }

  if (tokens.headerLayout === 'split') {
    return (
      <Flex
        data-testid="preview-header-split"
        justify="between"
        align="center"
        pb="3"
        mb="4"
        wrap="wrap"
        gap="2"
        style={{
          borderBottom: borderBottomCss,
          padding: tokens.headerPadding,
        }}
      >
        <Box>
          {brandElement}
          {tokens.headerTagline && (
            <Text
              size="1"
              as="div"
              style={{
                color: tokens.colorTextMuted,
                fontStyle: 'italic',
                fontFamily: tokens.fontHeadline,
                marginTop: '0.15rem',
              }}
            >
              {tokens.headerTagline}
            </Text>
          )}
        </Box>
        <Flex gap="2" align="center">
          <span style={navItemStyle}>Essays</span>
          <span style={navItemMutedStyle}>Docs</span>
          <span style={navItemMutedStyle}>About</span>
        </Flex>
      </Flex>
    );
  }

  return (
    <Box
      data-testid="preview-header-stacked"
      pb="3"
      mb="4"
      style={{
        borderBottom: borderBottomCss,
        padding: tokens.headerPadding,
      }}
    >
      {brandElement}
      {tokens.headerTagline && (
        <Text
          size="1"
          as="div"
          style={{
            color: tokens.colorTextMuted,
            fontStyle: 'italic',
            fontFamily: tokens.fontHeadline,
            marginTop: '0.15rem',
          }}
        >
          {tokens.headerTagline}
        </Text>
      )}
      <Flex gap="2" mt="3">
        <span style={navItemStyle}>Essays</span>
        <span style={navItemMutedStyle}>Docs</span>
        <span style={navItemMutedStyle}>About</span>
      </Flex>
    </Box>
  );
};
