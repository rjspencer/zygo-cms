import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Flex, Box, Text } from '@radix-ui/themes';

export interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  aliases?: string[];
  excludePrefixes?: string[];
  isCollapsed?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  exact = false,
  aliases = [],
  excludePrefixes = [],
  isCollapsed = false,
}) => {
  const location = useLocation();
  const matchesPath = (path: string) =>
    exact
      ? location.pathname === path
      : location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const isExcluded = excludePrefixes.some((p) => location.pathname.startsWith(p));
  const isActive = !isExcluded && (matchesPath(to) || aliases.some((alias) => matchesPath(alias)));

  return (
    <NavLink to={to} style={{ textDecoration: 'none', width: '100%' }} title={isCollapsed ? label : undefined}>
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'start'}
        gap="3"
        px={isCollapsed ? '0' : '3'}
        py="2"
        style={{
          position: 'relative',
          overflow: 'hidden',
          borderRadius: 'var(--radius-1)',
          backgroundColor: isActive ? 'var(--accent-a4)' : 'transparent',
          color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
          fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {isActive && <Box style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: 'var(--cmyk-cyan)' }}></Box>}
        <Box style={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
        {!isCollapsed && <Text size="2">{label}</Text>}
      </Flex>
    </NavLink>
  );
};

export default NavItem;
