import React from 'react';
import { Box, Flex, Text, IconButton, Separator, Avatar } from '@radix-ui/themes';
import { SunIcon, MoonIcon, ExitIcon } from '@radix-ui/react-icons';

export interface SidebarFooterProps {
  isCollapsed: boolean;
  userEmail: string;
  logoutUrl: string;
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}

export const SidebarFooter: React.FC<SidebarFooterProps> = ({
  isCollapsed,
  userEmail,
  logoutUrl,
  mode,
  toggleTheme,
}) => {
  return (
    <Box>
      <Separator size="4" my="3" />
      <Flex
        align="center"
        justify={isCollapsed ? 'center' : 'between'}
        px={isCollapsed ? '0' : '2'}
        direction={isCollapsed ? 'column' : 'row'}
        gap={isCollapsed ? '3' : '0'}
      >
        <Flex
          align="center"
          gap="2"
          style={{ minWidth: 0, flex: 1, marginRight: isCollapsed ? '0' : '8px' }}
          title={isCollapsed ? userEmail : undefined}
        >
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
  );
};

export default SidebarFooter;
