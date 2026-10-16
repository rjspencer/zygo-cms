import type React from 'react';

export interface NavItemConfig {
  to: string;
  icon: React.ReactNode;
  label: string;
  exact?: boolean;
  aliases?: string[];
  excludePrefixes?: string[];
}

export interface LayoutSidebarProps {
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  navItems: NavItemConfig[];
  userEmail: string;
  logoutUrl: string;
  mode: 'light' | 'dark';
  toggleTheme: () => void;
}
