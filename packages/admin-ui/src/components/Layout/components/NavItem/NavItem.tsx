import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Flex, Box, Text } from '@radix-ui/themes';

export interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  isCollapsed?: boolean;
}

export const NavItem: React.FC<NavItemProps> = ({
  to,
  icon,
  label,
  exact = false,
  isCollapsed = false,
}) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <NavLink to={to} style={{ textDecoration: 'none', width: '100%' }} title={isCollapsed ? label : undefined}>
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'start'}
        gap="3"
        px={isCollapsed ? '0' : '3'}
        py="2"
        style={{
          borderRadius: 'var(--radius-3)',
          borderLeft: isActive ? '3px solid var(--cmyk-cyan)' : '3px solid transparent',
          backgroundColor: isActive ? 'var(--accent-a4)' : 'transparent',
          color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
          fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
        {!isCollapsed && <Text size="2">{label}</Text>}
      </Flex>
    </NavLink>
  );
};

export default NavItem;
