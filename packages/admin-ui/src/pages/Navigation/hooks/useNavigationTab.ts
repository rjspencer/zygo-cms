import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { MenuType } from '../types';

export function useNavigationTab(): [MenuType, (tab: MenuType) => void] {
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const activeTab: MenuType = tabParam === 'footer' ? 'footer' : 'header';

  const setActiveTab = useCallback(
    (tab: MenuType) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (tab === 'header') {
          next.delete('tab');
        } else {
          next.set('tab', tab);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  return [activeTab, setActiveTab];
}
