import React from 'react';
import { Box, Flex, IconButton, Badge, Text, Separator } from '@radix-ui/themes';
import { ChevronLeftIcon, ChevronRightIcon } from '@radix-ui/react-icons';
import { BrandLogo } from '../BrandLogo';
import { QuickCreateMenu } from '../QuickCreateMenu';
import { NavItem } from '../NavItem';
import { SidebarFooter } from '../SidebarFooter';
import type { LayoutSidebarProps } from '../../types';

export const LayoutSidebar: React.FC<LayoutSidebarProps> = ({
  isCollapsed,
  onToggleCollapse,
  navSections,
  userEmail,
  logoutUrl,
  mode,
  toggleTheme,
}) => {
  return (
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
        height: '100%',
      }}
    >
      <IconButton
        size="1"
        variant="outline"
        color="gray"
        onClick={onToggleCollapse}
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
      <Box style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* Brand Header */}
        <Flex align="center" justify={isCollapsed ? 'center' : 'between'} mb="5" px={isCollapsed ? '0' : '2'} style={{ flexShrink: 0 }}>
          <BrandLogo isCollapsed={isCollapsed} />
          {!isCollapsed && (
            <Badge color="crimson" variant="soft" size="1">
              v0.1
            </Badge>
          )}
        </Flex>

        {/* Quick Create Dropdown */}
        <Box style={{ flexShrink: 0 }}>
          <QuickCreateMenu isCollapsed={isCollapsed} />
        </Box>

        {/* Nav Sections */}
        <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <Flex direction="column" gap={isCollapsed ? '0' : '4'}>
            {navSections.map((section, index) => (
              <Box key={section.title}>
                {isCollapsed ? (
                  index > 0 && <Separator size="4" my="2" />
                ) : (
                  <Text
                    size="1"
                    weight="bold"
                    as="div"
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      color: 'var(--gray-9)',
                      paddingLeft: 'var(--space-3)',
                      paddingRight: 'var(--space-3)',
                      marginBottom: '2px',
                    }}
                  >
                    {section.title}
                  </Text>
                )}
                <Flex direction="column" gap="1">
                  {section.items.map((item) => (
                    <NavItem
                      key={item.to}
                      to={item.to}
                      icon={item.icon}
                      label={item.label}
                      exact={item.exact}
                      aliases={item.aliases}
                      excludePrefixes={item.excludePrefixes}
                      isCollapsed={isCollapsed}
                      badge={item.badge}
                    />
                  ))}
                </Flex>
              </Box>
            ))}
          </Flex>
        </Box>
      </Box>

      <SidebarFooter
        isCollapsed={isCollapsed}
        userEmail={userEmail}
        logoutUrl={logoutUrl}
        mode={mode}
        toggleTheme={toggleTheme}
      />
    </Box>
  );
};

export default LayoutSidebar;
