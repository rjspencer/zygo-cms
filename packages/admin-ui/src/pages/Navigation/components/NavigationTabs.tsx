import React from 'react';
import { Box, Tabs } from '@radix-ui/themes';
import { MenuTable } from './MenuTable';
import { AddMenuItemForm } from './AddMenuItemForm';
import type { NavigationTabsProps, MenuType } from '../types';

export const NavigationTabs: React.FC<NavigationTabsProps> = ({
  activeTab,
  onTabChange,
  items,
  isLoading,
  sitePages,
  onAddItem,
  onDeleteItem,
}) => {
  return (
    <Box
      style={{
        backgroundColor: 'var(--color-panel-solid)',
        borderRadius: 'var(--radius-4)',
        boxShadow: 'var(--shadow-2)',
        padding: 'var(--space-4)',
        border: '1px solid var(--gray-6)',
      }}
    >
      <Tabs.Root
        value={activeTab}
        onValueChange={(v) => onTabChange(v as MenuType)}
      >
        <Tabs.List mb="4">
          <Tabs.Trigger value="header">Header Menu</Tabs.Trigger>
          <Tabs.Trigger value="footer">Footer Menu</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value={activeTab}>
          <MenuTable
            items={items}
            isLoading={isLoading}
            onDelete={onDeleteItem}
          />
          <AddMenuItemForm sitePages={sitePages} onAdd={onAddItem} />
        </Tabs.Content>
      </Tabs.Root>
    </Box>
  );
};
