export interface MenuItem {
  title: string;
  url: string;
  target: string;
  children: MenuItem[];
}

export interface SitePageItem {
  id: number;
  title: string;
  path: string;
}

export type MenuType = 'header' | 'footer';

export interface LocalMenus {
  header: MenuItem[];
  footer: MenuItem[];
  [key: string]: MenuItem[];
}

export interface AddMenuItemFormValues {
  title: string;
  urlSearchQuery: string;
  selectedUrl: string;
  isCustom: boolean;
  customUrl: string;
}

export interface NavigationProps {}

export interface NavigationHeaderProps {
  onSave: () => void;
  isSaving: boolean;
  isSaved: boolean;
  disabled: boolean;
}

export interface NavigationTabsProps {
  activeTab: MenuType;
  onTabChange: (tab: MenuType) => void;
  items: MenuItem[];
  isLoading: boolean;
  sitePages: SitePageItem[];
  onAddItem: (item: MenuItem) => void;
  onDeleteItem: (index: number) => void;
}

export interface MenuTableProps {
  items: MenuItem[];
  isLoading: boolean;
  onDelete: (index: number) => void;
}

export interface AddMenuItemFormProps {
  sitePages: SitePageItem[];
  onAdd: (item: MenuItem) => void;
}

export interface PageSelectComboboxProps {
  sitePages: SitePageItem[];
  onSelectPage: (page: SitePageItem) => void;
  onSelectCustom: () => void;
}
