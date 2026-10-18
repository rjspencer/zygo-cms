import React from 'react';
import { Box } from '@radix-ui/themes';
import { NavigationHeader } from './components/NavigationHeader';
import { NavigationTabs } from './components/NavigationTabs';
import { useNavigationData } from './hooks/useNavigationData';
import { useNavigationTab } from './hooks/useNavigationTab';
import { useNavigationEditorWebMCP } from '../../lib/webmcp/navigationTools';
import type { NavigationProps } from './types';

export const Navigation: React.FC<NavigationProps> = () => {
  const [activeTab, setActiveTab] = useNavigationTab();
  const {
    localMenus,
    sitePages,
    isLoading,
    isSaving,
    isSaved,
    addItem,
    deleteItem,
    setItems,
    saveMenu,
  } = useNavigationData();

  useNavigationEditorWebMCP({
    activeTab,
    setActiveTab,
    localMenus,
    sitePages,
    addItem,
    deleteItem,
    setItems,
    saveMenu,
    isSaving,
    isSaved,
  });

  return (
    <Box>
      <NavigationHeader
        onSave={() => saveMenu(activeTab)}
        isSaving={isSaving}
        isSaved={isSaved}
        disabled={isLoading}
      />
      <NavigationTabs
        activeTab={activeTab}
        onTabChange={setActiveTab}
        items={localMenus[activeTab] || []}
        isLoading={isLoading}
        sitePages={sitePages}
        onAddItem={(item) => addItem(activeTab, item)}
        onDeleteItem={(index) => deleteItem(activeTab, index)}
      />
    </Box>
  );
};

export default Navigation;
