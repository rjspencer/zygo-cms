import React, { useState, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { Flex, Box, Badge } from '@radix-ui/themes';
import {
  DashboardIcon,
  FileTextIcon,
  LayersIcon,
  ImageIcon,
  HamburgerMenuIcon,
  GearIcon,
  BarChartIcon,
  PersonIcon,
  SectionIcon,
  ArchiveIcon,
  BlendingModeIcon,
  ReaderIcon,
  LayoutIcon,
  ResetIcon,
  EnvelopeClosedIcon,
} from '@radix-ui/react-icons';
import { useThemeMode } from '../../context/ThemeModeContext';
import { useWebMCP } from '../../providers/WebMCPProvider';
import { WebMCPAssistantDrawer } from '../assistant/WebMCPAssistantDrawer';
import { StagedDiffModal } from '../assistant/StagedDiffModal';
import { LayoutSidebar } from './components/LayoutSidebar';
import { TopHeader } from './components/TopHeader';
import { useLayoutData } from './hooks/useLayoutData';
import type { NavSectionConfig } from './types';

export const Layout: React.FC = () => {
  const { mode, toggleTheme } = useThemeMode();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const { stagedChange, resolveStagedChange, externalBridgeEnabled } = useWebMCP();
  const { logoutUrl, userEmail, docsModeEnabled, unreadSubmissionsCount } = useLayoutData();

  const navSections = useMemo<NavSectionConfig[]>(
    () => [
      {
        title: 'Overview',
        items: [
          { to: '/', icon: <DashboardIcon width="18" height="18" />, label: 'Dashboard', exact: true },
          { to: '/analytics', icon: <BarChartIcon width="18" height="18" />, label: 'Analytics' },
        ],
      },
      {
        title: 'Content',
        items: [
          { to: '/pages', icon: <LayersIcon width="18" height="18" />, label: 'Pages' },
          { to: '/posts', icon: <FileTextIcon width="18" height="18" />, label: 'Posts' },
          ...(docsModeEnabled ? [{ to: '/docs', icon: <ArchiveIcon width="18" height="18" />, label: 'Docs' }] : []),
          { to: '/media', icon: <ImageIcon width="18" height="18" />, label: 'Media Library' },
          { to: '/navigation', icon: <HamburgerMenuIcon width="18" height="18" />, label: 'Site Navigation' },
          { to: '/redirects', icon: <ResetIcon width="18" height="18" />, label: 'Redirects' },
        ],
      },
      {
        title: 'Design',
        items: [
          {
            to: '/templates',
            icon: <SectionIcon width="18" height="18" />,
            label: 'Page Templates',
            excludePrefixes: ['/templates/posts', '/templates/post', '/templates/docs', '/templates/doc'],
          },
          {
            to: '/templates/posts',
            icon: <ReaderIcon width="18" height="18" />,
            label: 'Posts Template',
            aliases: ['/templates/post'],
          },
          {
            to: '/templates/docs',
            icon: <LayoutIcon width="18" height="18" />,
            label: 'Docs Template',
            aliases: ['/templates/doc'],
          },
          { to: '/theme', icon: <BlendingModeIcon width="18" height="18" />, label: 'Theme' },
        ],
      },
      {
        title: 'Admin',
        items: [
          {
            to: '/submissions',
            icon: <EnvelopeClosedIcon width="18" height="18" />,
            label: 'Submissions',
            badge:
              unreadSubmissionsCount > 0 ? (
                <Badge color="red" variant="solid" size="1" radius="full">
                  {unreadSubmissionsCount}
                </Badge>
              ) : undefined,
          },
          { to: '/users', icon: <PersonIcon width="18" height="18" />, label: 'Users' },
          { to: '/settings', icon: <GearIcon width="18" height="18" />, label: 'Settings' },
        ],
      },
    ],
    [docsModeEnabled, unreadSubmissionsCount]
  );

  return (
    <Flex style={{ height: '100%', width: '100%' }}>
      <LayoutSidebar
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
        navSections={navSections}
        userEmail={userEmail}
        logoutUrl={logoutUrl}
        mode={mode}
        toggleTheme={toggleTheme}
      />

      <Flex direction="column" style={{ flex: 1, minWidth: 0, height: '100%' }}>
        <TopHeader
          externalBridgeEnabled={externalBridgeEnabled}
          onOpenAssistant={() => setIsAssistantOpen(true)}
        />

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
          <Box
            style={{
              maxWidth: '2000px',
              margin: '0 auto',
              height: '100%',
              width: '100%',
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
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
