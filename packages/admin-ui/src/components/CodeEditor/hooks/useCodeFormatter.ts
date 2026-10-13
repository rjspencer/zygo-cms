import { useCallback } from 'react';
import type { CodeEditorLanguage } from '../types';

export async function formatCode(code: string, language: CodeEditorLanguage): Promise<string> {
  if (!code || !code.trim()) {
    return code;
  }

  try {
    const prettierModule = await import('prettier/standalone');
    const prettier: any = (prettierModule as any).default?.format
      ? (prettierModule as any).default
      : prettierModule;

    if (language === 'html') {
      const htmlPluginModule = await import('prettier/plugins/html');
      const htmlPlugin = (htmlPluginModule as any).default ?? htmlPluginModule;

      return await prettier.format(code, {
        parser: 'html',
        plugins: [htmlPlugin],
      });
    }

    if (language === 'css') {
      const postcssPluginModule = await import('prettier/plugins/postcss');
      const postcssPlugin = (postcssPluginModule as any).default ?? postcssPluginModule;

      return await prettier.format(code, {
        parser: 'css',
        plugins: [postcssPlugin],
      });
    }

    return code;
  } catch (error) {
    // If formatting fails (e.g. invalid syntax during active editing), return original code gracefully
    return code;
  }
}

export function useCodeFormatter() {
  const format = useCallback(
    (code: string, language: CodeEditorLanguage) => formatCode(code, language),
    []
  );

  return { formatCode: format };
}
