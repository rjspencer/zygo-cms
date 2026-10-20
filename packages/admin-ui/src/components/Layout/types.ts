import type React from 'react';

export interface NavItemConfig {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  aliases?: string[];
  excludePrefixes?: string[];
  badge?: React.ReactNode;
}

export interface NavSectionConfig {
  title: string;
  items: NavItemConfig[];
}

export interface LayoutSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  navSections: NavSectionConfig[];
  userEmail: string;
  logoutUrl: string;
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}
