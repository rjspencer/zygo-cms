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
  ChevronLeftIcon,
  ChevronRightIcon,
  SectionIcon,
  ArchiveIcon,
  BlendingModeIcon,
} from '@radix-ui/react-icons';
import { useThemeMode } from '../context/ThemeModeContext';
import { apiFetch, getPublicSiteUrl } from '../utils/api';
import { useWebMCP } from '../providers/WebMCPProvider';
import { WebMCPAssistantDrawer } from './assistant/WebMCPAssistantDrawer';
import { StagedDiffModal } from './assistant/StagedDiffModal';

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

export const Layout: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const { stagedChange, resolveStagedChange, externalBridgeEnabled } = useWebMCP();
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

  const { data: settingsData } = useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const res = await apiFetch('/api/settings');
      if (!res.ok) throw new Error('Failed to fetch settings');
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
    { to: '/analytics', icon: <BarChartIcon width="18" height="18" />, label: 'Analytics' },
    { to: '/pages', icon: <LayersIcon width="18" height="18" />, label: 'Pages' },
    { to: '/posts', icon: <FileTextIcon width="18" height="18" />, label: 'Posts' },
    ...(settingsData?.docs_mode_enabled === 'true' ? [{ to: '/docs', icon: <ArchiveIcon width="18" height="18" />, label: 'Docs' }] : []),
    { to: '/media', icon: <ImageIcon width="18" height="18" />, label: 'Media Library' },
    { to: '/navigation', icon: <HamburgerMenuIcon width="18" height="18" />, label: 'Site Navigation' },
    { to: '/templates', icon: <SectionIcon width="18" height="18" />, label: 'Page Templates' },
    { to: '/theme', icon: <BlendingModeIcon width="18" height="18" />, label: 'Theme' },
    { to: '/users', icon: <PersonIcon width="18" height="18" />, label: 'Users' },
    { to: '/settings', icon: <GearIcon width="18" height="18" />, label: 'Settings' },
  ];

  return (
    <Flex style={{ height: '100%', width: '100%' }}>
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
          variant="outline"
          color="gray"
          onClick={() => setIsCollapsed(!isCollapsed)}
          style={{
            position: 'absolute',
            right: '-12px',
            top: '116px',
            borderRadius: '50%',
            zIndex: 10,
            cursor: 'pointer',
            backgroundColor: 'var(--color-background)',
            border: '1px solid var(--gray-a4)',
            boxShadow: 'inset 0 0 1px var(--accent-a8)',
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
                  background: 'linear-gradient(135deg, var(--cmyk-cyan, #007799) 0%, var(--cmyk-magenta, #be185d) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '14px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                Z
              </Box>
              {!isCollapsed && (
                <Box>
                  <Heading size="3" weight="bold">
                    Zygo CMS
                  </Heading>
                  <Flex gap="1" align="center" mt="1" title="CMYK Process Control">
                    <Box style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--cmyk-cyan)' }} />
                    <Box style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--cmyk-magenta)' }} />
                    <Box style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--cmyk-yellow)' }} />
                    <Box style={{ width: '5px', height: '5px', borderRadius: '50%', backgroundColor: 'var(--cmyk-key)' }} />
                  </Flex>
                </Box>
              )}
            </Flex>
            {!isCollapsed && (
              <Badge color="crimson" variant="soft" size="1">
                v0.1
              </Badge>
            )}
          </Flex>

          {/* Quick Create Dropdown */}
          <Box mb="4" style={{ display: 'flex', justifyContent: 'center' }}>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger>
                <Button size={isCollapsed ? '1' : '2'} variant="solid" color="cyan" style={{ width: isCollapsed ? 'auto' : '100%', padding: isCollapsed ? '8px' : undefined }}>
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
                color="cyan"
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
      <Flex direction="column" style={{ flex: 1, minWidth: 0, height: '100%' }}>
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
            <Button
              size="1"
              variant="outline"
              color="cyan"
              aria-label="Open WebMCP Assistant"
              onClick={() => setIsAssistantOpen(true)}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
            >
              <Box
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: externalBridgeEnabled ? 'var(--green-9)' : 'var(--cyan-9)',
                }}
              />
              WebMCP
            </Button>

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
          px="6"
          pt="4"
          pb="0"
          style={{
            flex: 1,
            height: '100%',
            backgroundColor: 'var(--gray-a2)',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Box style={{ maxWidth: '2000px', margin: '0 auto', height: '100%', width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Outlet />
          </Box>
        </Box>
      </Flex>

      <WebMCPAssistantDrawer
        open={isAssistantOpen}
        onOpenChange={setIsAssistantOpen}
      />
      {stagedChange && (
        <StagedDiffModal
          open={true}
          title={stagedChange.title}
          description={stagedChange.description}
          fieldLabel={stagedChange.fieldLabel}
          beforeText={stagedChange.beforeText}
          afterText={stagedChange.afterText}
          onAccept={() => resolveStagedChange(true)}
          onReject={() => resolveStagedChange(false)}
        />
      )}
    </Flex>
  );
};

export default Layout;
