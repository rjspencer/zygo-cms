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
  badge?: React.ReactNode;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  exact = false,
  aliases = [],
  excludePrefixes = [],
  isCollapsed = false,
  badge,
}) => {
  const [isHovered, setIsHovered] = React.useState(false);
  const location = useLocation();
  const matchesPath = (path: string) =>
    exact
      ? location.pathname === path
      : location.pathname === path || (path !== '/' && location.pathname.startsWith(path));

  const isExcluded = excludePrefixes.some((p) => location.pathname.startsWith(p));
  const isActive = !isExcluded && (matchesPath(to) || aliases.some((alias) => matchesPath(alias)));

  return (
    <NavLink
      to={to}
      aria-label={label}
      style={{ textDecoration: 'none', width: '100%' }}
      title={isCollapsed ? label : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
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
          backgroundColor: isActive ? 'var(--accent-a4)' : isHovered ? 'var(--gray-a3)' : 'transparent',
          color: isActive ? 'var(--accent-11)' : isHovered ? 'var(--gray-12)' : 'var(--gray-11)',
          fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        {isActive && <Box style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: '4px', backgroundColor: 'var(--cmyk-cyan)' }}></Box>}
        <Box style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
          {icon}
          {isCollapsed && badge && (
            <Box
              style={{
                position: 'absolute',
                top: '-4px',
                right: '-6px',
                transform: 'scale(0.8)',
              }}
            >
              {badge}
            </Box>
          )}
        </Box>
        {!isCollapsed && (
          <Flex align="center" justify="between" style={{ flex: 1, minWidth: 0 }}>
            <Text size="2">{label}</Text>
            {badge && <Box style={{ marginLeft: 'auto' }}>{badge}</Box>}
          </Flex>
        )}
      </Flex>
    </NavLink>
  );
};

export default NavItem;
