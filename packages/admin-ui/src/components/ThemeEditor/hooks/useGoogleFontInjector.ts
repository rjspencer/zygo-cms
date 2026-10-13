import { useEffect } from 'react';

export function useGoogleFontInjector(fontUrl: string) {
  useEffect(() => {
    if (!fontUrl) return;
    const existing = document.getElementById('zygo-theme-preview-font');
    if (existing) {
      existing.setAttribute('href', fontUrl);
    } else {
      const link = document.createElement('link');
      link.id = 'zygo-theme-preview-font';
      link.rel = 'stylesheet';
      link.href = fontUrl;
      document.head.appendChild(link);
    }
  }, [fontUrl]);
}
