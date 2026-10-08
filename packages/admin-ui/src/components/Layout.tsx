import React, { useState } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
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
  PlusIcon,
  ExternalLinkIcon,
  SunIcon,
  MoonIcon,
  ExitIcon,
  PersonIcon,
  LayoutIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@radix-ui/react-icons';
import { useThemeMode } from '../context/ThemeModeContext';
import { apiFetch, getPublicSiteUrl } from '../utils/api';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  isCollapsed?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ to, icon, label, exact = false, isCollapsed = false }) => {
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

export const Layout: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const { data: dashData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const res = await apiFetch('/api/admin/dashboard');
      if (!res.ok) throw new Error('Failed to fetch dashboard');
      return res.json();
    },
    retry: false,
  });

  const { data: meData } = useQuery({
    queryKey: ['me'],
    queryFn: async () => {
      const res = await apiFetch('/api/me');
      if (!res.ok) throw new Error('Failed to fetch me');
      return res.json();
    },
    retry: false,
  });

  const logoutUrl = dashData?.auth_url || '/cdn-cgi/access/logout';
  let userEmail = 'Admin User';
  if (meData?.email) {
    userEmail = meData.email;
  } else if (meData?.display_name) {
    userEmail = meData.display_name;
  } else if (dashData?.email) {
    userEmail = dashData.email;
  }

  const navItems = [
    { to: '/', icon: <DashboardIcon width="18" height="18" />, label: 'Dashboard', exact: true },
    { to: '/posts', icon: <FileTextIcon width="18" height="18" />, label: 'Posts' },
    { to: '/pages', icon: <LayersIcon width="18" height="18" />, label: 'Pages' },
    { to: '/admin/templates', icon: <LayoutIcon width="18" height="18" />, label: 'Templates' },
    { to: '/media', icon: <ImageIcon width="18" height="18" />, label: 'Media Library' },
    { to: '/users', icon: <PersonIcon width="18" height="18" />, label: 'Users' },
    { to: '/navigation', icon: <HamburgerMenuIcon width="18" height="18" />, label: 'Navigation' },
    { to: '/analytics', icon: <BarChartIcon width="18" height="18" />, label: 'Analytics' },
    { to: '/settings', icon: <GearIcon width="18" height="18" />, label: 'Settings' },
  ];

  return (
    <Flex style={{ minHeight: '100vh', width: '100%' }}>
      {/* Sidebar */}
      <Box
        style={{
          width: isCollapsed ? '64px' : '260px',
          minWidth: isCollapsed ? '64px' : '260px',
          transition: 'width 0.2s ease, min-width 0.2s ease',
          borderRight: '1px solid var(--gray-a4)',
          backgroundColor: 'var(--color-background)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: isCollapsed ? '16px 8px' : '16px',
          position: 'relative',
        }}
      >
        <IconButton
          size="1"
          variant="soft"
          color="gray"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '200px',
            borderRadius: '50%',
            zIndex: 10,
            cursor: 'pointer',
          }}
          title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
        <Box>
          {/* Brand Header */}
          <Flex align="center" justify={isCollapsed ? 'center' : 'between'} mb="5" px={isCollapsed ? '0' : '2'}>
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
              {!isCollapsed && (
                <Heading size="3" weight="bold">
                  Zygo CMS
                </Heading>
              )}
            </Flex>
            {!isCollapsed && (
              <Badge color="iris" variant="soft" size="1">
                v0.1
              </Badge>
            )}
          </Flex>

          {/* Quick Create Dropdown */}
          <Box mb="4" style={{ display: 'flex', justifyContent: 'center' }}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button size={isCollapsed ? '1' : '2'} variant="solid" color="iris" style={{ width: isCollapsed ? 'auto' : '100%', padding: isCollapsed ? '8px' : undefined }}>
                  <PlusIcon width="16" height="16" />
                  {!isCollapsed && 'New Content'}
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item onClick={() => navigate('/posts/editor/new')}>
                  <FileTextIcon width="16" height="16" />
                  New Post
                </DropdownMenu.Item>
                <DropdownMenu.Item onClick={() => navigate('/pages/editor/new')}>
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
                isCollapsed={isCollapsed}
              />
            ))}
          </Flex>
        </Box>

        {/* Sidebar Footer */}
        <Box>
          <Separator size="4" my="3" />
          <Flex align="center" justify={isCollapsed ? 'center' : 'between'} px={isCollapsed ? '0' : '2'} direction={isCollapsed ? 'column' : 'row'} gap={isCollapsed ? '3' : '0'}>
            <Flex align="center" gap="2" style={{ minWidth: 0, flex: 1, marginRight: isCollapsed ? '0' : '8px' }} title={isCollapsed ? userEmail : undefined}>
              <Avatar
                size="1"
                fallback={userEmail && userEmail !== 'Admin User' ? userEmail.slice(0, 2).toUpperCase() : 'AD'}
                radius="full"
                color="iris"
              />
              {!isCollapsed && (
                <Box style={{ minWidth: 0, overflow: 'hidden' }}>
                  <Text
                    size="1"
                    weight="medium"
                    title={userEmail}
                    style={{
                      display: 'block',
                      lineHeight: 1.2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {userEmail}
                  </Text>
                  <Text size="1" color="gray" style={{ display: 'block', fontSize: '11px' }}>
                    Cloudflare Access
                  </Text>
                </Box>
              )}
            </Flex>
            <Flex align="center" gap="1" direction={isCollapsed ? 'column' : 'row'}>
              <IconButton
                size="1"
                variant="ghost"
                color="gray"
                onClick={toggleTheme}
                title="Toggle Dark / Light Mode"
                aria-label="Toggle Dark / Light Mode"
              >
                {mode === 'dark' ? <SunIcon width="16" height="16" /> : <MoonIcon width="16" height="16" />}
              </IconButton>
              <a
                href={logoutUrl}
                data-testid="logout-link"
                style={{ textDecoration: 'none', display: 'inline-flex' }}
                onClick={() => {
                  if (logoutUrl) {
                    window.location.href = logoutUrl;
                  }
                }}
              >
                <IconButton
                  size="1"
                  variant="ghost"
                  color="gray"
                  type="button"
                  title="Logout"
                  aria-label="Logout"
                >
                  <ExitIcon width="16" height="16" />
                </IconButton>
              </a>
            </Flex>
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
              href={getPublicSiteUrl()}
              data-testid="view-live-site-link"
              target="_blank"
              rel="noopener noreferrer"
              style={{ textDecoration: 'none', display: 'flex', alignItems: 'center' }}
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
          <Box style={{ maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
            <Outlet />
          </Box>
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout;
