export type CodeEditorLanguage = 'html' | 'css';

export interface CodeEditorProps {
  value: string;
  onChange?: (value: string) => void;
  language: CodeEditorLanguage;
  disabled?: boolean;
  minHeight?: string | number;
  formatOnBlur?: boolean;
  onBlur?: () => void;
  ariaLabel?: string;
  dataTestId?: string;
  placeholder?: string;
  theme?: 'light' | 'dark';
}
