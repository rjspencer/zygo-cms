import type { ThemeTokens } from '../../components/ThemeEditor/types';

export type { ThemeTokens };

export interface Theme {
  id: string;
  name: string;
  description: string | null;
  tokens: ThemeTokens;
  is_locked: boolean;
  created_at: string;
  updated_at: string;
}

export interface ThemesApiReturn {
  themes: Theme[];
  settings: Record<string, string>;
  isLoading: boolean;
  error: string | null;
  primaryThemeId: string;
  darkThemeId: string | null;
  refresh: () => Promise<void>;
  createTheme: (name: string, description?: string, basePresetId?: string) => Promise<Theme | null>;
  activateTheme: (id: string | null, role: 'primary' | 'dark') => Promise<boolean>;
  renameTheme: (id: string, name: string) => Promise<boolean>;
  duplicateTheme: (id: string) => Promise<Theme | null>;
  deleteTheme: (id: string) => Promise<boolean>;
}

export interface ThemeSwatchesProps {
  tokens?: ThemeTokens;
}

export interface ThemesHeaderProps {
  onCreateClick: () => void;
}

export interface ActiveThemesSectionProps {
  primaryTheme?: Theme;
  darkTheme?: Theme;
  onRemoveDark: () => void;
  isRemovingDark?: boolean;
}

export interface ThemesTableProps {
  themes: Theme[];
  primaryThemeId: string;
  darkThemeId: string | null;
  onActivate: (theme: Theme) => void;
  onRename: (theme: Theme) => void;
  onDuplicate: (theme: Theme) => void;
  onDelete: (theme: Theme) => void;
  onEdit: (theme: Theme) => void;
  isDuplicatingId?: string | null;
}

export interface CreateThemeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (name: string, description?: string, basePresetId?: string) => Promise<void>;
}

export interface ActivateThemeDialogProps {
  theme: Theme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onActivate: (id: string, role: 'primary' | 'dark') => Promise<void>;
}

export interface RenameThemeDialogProps {
  theme: Theme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (id: string, name: string) => Promise<void>;
}

export interface DeleteThemeDialogProps {
  theme: Theme | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmDelete: (id: string) => Promise<void>;
}
