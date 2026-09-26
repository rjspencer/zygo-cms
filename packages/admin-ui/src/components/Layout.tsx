import React from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  Flex,
  Box,
  Heading,
  Text,
  Button,
  IconButton,
  Badge,
  DropdownMenu,
  Separator,
  Avatar,
} from '@radix-ui/themes';
import {
  DashboardIcon,
  FileTextIcon,
  LayersIcon,
  ImageIcon,
  HamburgerMenuIcon,
  GearIcon,
  BarChartIcon,
  Component1Icon,
  PlusIcon,
  ExternalLinkIcon,
  SunIcon,
  MoonIcon,
} from '@radix-ui/react-icons';
import { useThemeMode } from '../context/ThemeModeContext';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, exact = false }) => {
  const location = useLocation();
  const isActive = exact
    ? location.pathname === to
    : location.pathname === to || (to !== '/' && location.pathname.startsWith(to));

  return (
    <NavLink to={to} style={{ textDecoration: 'none', width: '100%' }}>
      <Flex
        align="center"
        gap="3"
        px="3"
        py="2"
        style={{
          borderRadius: 'var(--radius-3)',
          backgroundColor: isActive ? 'var(--accent-a4)' : 'transparent',
          color: isActive ? 'var(--accent-11)' : 'var(--gray-11)',
          fontWeight: isActive ? 600 : 400,
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <Box style={{ display: 'flex', alignItems: 'center' }}>{icon}</Box>
        <Text size="2">{label}</Text>
      </Flex>
    </NavLink>
  );
};

export const Layout: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();

  const navItems = [
    { to: '/', icon: <DashboardIcon width="18" height="18" />, label: 'Dashboard', exact: true },
    { to: '/posts', icon: <FileTextIcon width="18" height="18" />, label: 'Posts' },
    { to: '/pages', icon: <LayersIcon width="18" height="18" />, label: 'Pages' },
    { to: '/media', icon: <ImageIcon width="18" height="18" />, label: 'Media Library' },
    { to: '/navigation', icon: <HamburgerMenuIcon width="18" height="18" />, label: 'Navigation' },
    { to: '/content-types', icon: <Component1Icon width="18" height="18" />, label: 'Content Types' },
    { to: '/analytics', icon: <BarChartIcon width="18" height="18" />, label: 'Analytics' },
    { to: '/settings', icon: <GearIcon width="18" height="18" />, label: 'Settings' },
  ];

  return (
    <Flex style={{ minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <Box
        style={{
          width: '260px',
          minWidth: '260px',
          borderRight: '1px solid var(--gray-a4)',
          backgroundColor: 'var(--color-background)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '16px',
        }}
      >
        <Box>
          {/* Brand Header */}
          <Flex align="center" justify="between" mb="5" px="2">
            <Flex align="center" gap="2">
              <Box
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  background: 'linear-gradient(135deg, var(--iris-9), var(--violet-10))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                }}
              >
                Z
              </Box>
              <Heading size="3" weight="bold">
                Zygo CMS
              </Heading>
            </Flex>
            <Badge color="iris" variant="soft" size="1">
              v0.1
            </Badge>
          </Flex>

          {/* Quick Create Dropdown */}
          <Box mb="4">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button size="2" variant="solid" color="iris" style={{ width: '100%' }}>
                  <PlusIcon width="16" height="16" />
                  New Content
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => navigate('/editor?type=post')}>
                  <FileTextIcon width="16" height="16" />
                  New Post
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigate('/editor?type=page')}>
                  <LayersIcon width="16" height="16" />
                  New Page
                </DropdownMenu.Item>
                <DropdownMenu.Separator />
                <DropdownMenu.Item onClick={() => navigate('/media')}>
                  <ImageIcon width="16" height="16" />
                  Upload Media
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </Box>

          {/* Nav Items */}
          <Flex direction="column" gap="1">
            {navItems.map((item) => (
              <NavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                label={item.label}
                exact={item.exact}
              />
            ))}
          </Flex>
        </Box>

        {/* Sidebar Footer */}
        <Box>
          <Separator size="4" my="3" />
          <Flex align="center" justify="between" px="2">
            <Flex align="center" gap="2">
              <Avatar size="1" fallback="AD" radius="full" color="iris" />
              <Box>
                <Text size="1" weight="medium" style={{ display: 'block', lineHeight: 1.2 }}>
                  Admin User
                </Text>
                <Text size="1" color="gray" style={{ display: 'block', fontSize: '11px' }}>
                  Cloudflare Access
                </Text>
              </Box>
            </Flex>
            <IconButton
              size="1"
              variant="ghost"
              color="gray"
              onClick={toggleTheme}
              title="Toggle Dark / Light Mode"
            >
              {mode === 'dark' ? <SunIcon width="16" height="16" /> : <MoonIcon width="16" height="16" />}
            </IconButton>
          </Flex>
        </Box>
      </Box>

      {/* Main Content Area */}
      <Flex direction="column" style={{ flex: 1, minWidth: 0, minHeight: '100vh' }}>
        {/* Top Header */}
        <Flex
          align="center"
          justify="between"
          px="5"
          py="3"
          style={{
            borderBottom: '1px solid var(--gray-a4)',
            backgroundColor: 'var(--color-background)',
          }}
        >
          <Flex align="center" gap="3">
            <Text size="2" color="gray">
              Zygo CMS &gt; Admin Console
            </Text>
          </Flex>

          <Flex align="center" gap="3">
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none' }}
            >
              <Button size="1" variant="ghost" color="gray">
                <ExternalLinkIcon width="14" height="14" />
                View Live Site
              </Button>
            </a>
          </Flex>
        </Flex>

        {/* Page Content */}
        <Box
          p="6"
          style={{
            flex: 1,
            backgroundColor: 'var(--gray-a2)',
            overflowY: 'auto',
          }}
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout;
