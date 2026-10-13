import React from 'react';
import { Box } from '@radix-ui/themes';
import { useThemeMode } from '../../../../context/ThemeModeContext';
import logoLight from '../../../../assets/logo-light.png';
import logoDark from '../../../../assets/logo-dark.png';

export interface BrandLogoProps {
  isCollapsed?: boolean;
  themeMode?: 'light' | 'dark';
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ isCollapsed = false, themeMode }) => {
  const { mode } = useThemeMode();
  const activeMode = themeMode ?? mode;
  const logoSrc = activeMode === 'dark' ? logoDark : logoLight;

  return (
    <Box
      style={{
        width: isCollapsed ? '34px' : '142px',
        height: '36px',
        overflow: 'hidden',
        transition: 'width 0.2s ease',
        flexShrink: 0,
      }}
    >
      <img
        src={logoSrc}
        alt="Zygo CMS"
        style={{
          width: '142px',
          height: '36px',
          maxWidth: 'none',
          display: 'block',
          objectFit: 'contain',
          objectPosition: 'left center',
        }}
      />
    </Box>
  );
};

export default BrandLogo;
