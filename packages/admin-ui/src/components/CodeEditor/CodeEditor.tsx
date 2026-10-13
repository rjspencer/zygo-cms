import React, { useCallback, useId } from 'react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-core';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-markup-templating';
import 'prismjs/components/prism-django';
import 'prismjs/components/prism-css';

import { useThemeContext } from '@radix-ui/themes';
import { useThemeMode } from '../../context/ThemeModeContext';
import { formatCode } from './hooks/useCodeFormatter';
import type { CodeEditorProps } from './types';
import './CodeEditor.css';

export const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language,
  disabled = false,
  minHeight = 200,
  formatOnBlur = true,
  onBlur,
  ariaLabel,
  dataTestId,
  placeholder,
  theme,
}) => {
  let radixAppearance: 'light' | 'dark' | undefined;
  try {
    const radixCtx = useThemeContext();
    if (radixCtx?.appearance === 'light' || radixCtx?.appearance === 'dark') {
      radixAppearance = radixCtx.appearance;
    }
  } catch {
    // Outside Radix Theme provider
  }

  const { mode: contextMode } = useThemeMode();
  const effectiveTheme = theme ?? radixAppearance ?? contextMode ?? 'dark';
  const defaultId = useId();

  const highlight = useCallback(
    (code: string) => {
      if (language === 'html') {
        const grammar = Prism.languages.django || Prism.languages.markup;
        return Prism.highlight(code, grammar, 'django');
      }
      if (language === 'css') {
        return Prism.highlight(code, Prism.languages.css, 'css');
      }
      return Prism.highlight(code, Prism.languages.markup, 'markup');
    },
    [language]
  );

  const handleBlur = useCallback(async () => {
    if (formatOnBlur !== false && !disabled) {
      try {
        const formatted = await formatCode(value, language);
        if (formatted !== value) {
          onChange?.(formatted);
        }
      } catch {
        // Fall back gracefully if format fails
      }
    }
    onBlur?.();
  }, [disabled, formatOnBlur, language, onBlur, onChange, value]);

  const defaultAriaLabel =
    language === 'html' ? 'HTML Template (MiniJinja)' : 'CSS Stylesheet';

  const minHeightStyle =
    typeof minHeight === 'number' ? `${minHeight}px` : minHeight;

  return (
    <div
      className={`zygo-code-editor zygo-code-editor--${effectiveTheme}${disabled ? ' zygo-code-editor--disabled' : ''}`}
      data-testid={dataTestId || `code-editor-${language}`}
      data-theme={effectiveTheme}
      data-disabled={disabled ? 'true' : undefined}
      style={{ minHeight: minHeightStyle }}
    >
      <label htmlFor={defaultId} className="zygo-code-editor__sr-only">
        {ariaLabel || defaultAriaLabel}
      </label>
        <Editor
          value={value}
          onValueChange={onChange || (() => { })}
          highlight={highlight}
          disabled={disabled}
          placeholder={placeholder}
          onBlur={handleBlur}
          textareaId={defaultId}
          textareaClassName="zygo-code-editor__textarea"
          preClassName="zygo-code-editor__pre"
          aria-label={ariaLabel || defaultAriaLabel}
          style={{
            fontFamily: 'inherit',
            fontSize: 'inherit',
            lineHeight: 'inherit',
            minHeight: minHeightStyle,
          }}
        />
    </div>
  );
};

export default CodeEditor;
