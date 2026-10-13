import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import {
  Flex,
  Box,
  Button,
  IconButton,
  Badge,
  DropdownMenu,
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
  PersonIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  SectionIcon,
  ArchiveIcon,
  BlendingModeIcon,
} from '@radix-ui/react-icons';
import { useThemeMode } from '../../context/ThemeModeContext';
import { useWebMCP } from '../../providers/WebMCPProvider';
import { WebMCPAssistantDrawer } from '../assistant/WebMCPAssistantDrawer';
import { StagedDiffModal } from '../assistant/StagedDiffModal';
import { BrandLogo } from './components/BrandLogo';
import { NavItem } from './components/NavItem';
import { SidebarFooter } from './components/SidebarFooter';
import { TopHeader } from './components/TopHeader';
import { useLayoutData } from './hooks/useLayoutData';

export const Layout: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const { stagedChange, resolveStagedChange, externalBridgeEnabled } = useWebMCP();
  const navigate = useNavigate();
  const { logoutUrl, userEmail, docsModeEnabled } = useLayoutData();

  const navItems = [
    { to: '/', icon: <DashboardIcon width="18" height="18" />, label: 'Dashboard', exact: true },
    { to: '/analytics', icon: <BarChartIcon width="18" height="18" />, label: 'Analytics' },
    { to: '/pages', icon: <LayersIcon width="18" height="18" />, label: 'Pages' },
    { to: '/posts', icon: <FileTextIcon width="18" height="18" />, label: 'Posts' },
    ...(docsModeEnabled ? [{ to: '/docs', icon: <ArchiveIcon width="18" height="18" />, label: 'Docs' }] : []),
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
          aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
        </IconButton>
        <Box>
          {/* Brand Header */}
          <Flex align="center" justify={isCollapsed ? 'center' : 'between'} mb="5" px={isCollapsed ? '0' : '2'}>
            <BrandLogo isCollapsed={isCollapsed} />
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

        <SidebarFooter
          isCollapsed={isCollapsed}
          userEmail={userEmail}
          logoutUrl={logoutUrl}
          mode={mode}
          toggleTheme={toggleTheme}
        />
      </Box>

      {/* Main Content Area */}
      <Flex direction="column" style={{ flex: 1, minWidth: 0, height: '100%' }}>
        <TopHeader
          externalBridgeEnabled={externalBridgeEnabled}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />

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
