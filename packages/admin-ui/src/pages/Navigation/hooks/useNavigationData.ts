import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '../../../utils/api';
import type { MenuItem, SitePageItem, MenuType, LocalMenus } from '../types';

export function useNavigationData() {
  const queryClient = useQueryClient();

  const [localMenus, setLocalMenus] = useState<LocalMenus>({
    header: [],
    footer: [],
  });

  const { data: menus, isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const res = await apiFetch('/api/menus');
      if (!res.ok) throw new Error('Failed to fetch menus');
      return res.json();
    },
  });

  const { data: sitePages = [] } = useQuery<SitePageItem[]>({
    queryKey: ['entries', 'pages-nav'],
    queryFn: async () => {
      const res = await apiFetch('/api/entries');
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((e: any) => e.type === 'page' && !e.deleted_at)
        .map((e: any) => ({
          id: e.id,
          title: e.title || '',
          path: e.path || (e.slug ? `/${e.slug.replace(/^\/+/, '')}` : '/'),
        }));
    },
  });

  useEffect(() => {
    if (menus) {
      setLocalMenus({
        header: menus.header?.items_json ? JSON.parse(menus.header.items_json) : [],
        footer: menus.footer?.items_json ? JSON.parse(menus.footer.items_json) : [],
      });
    }
  }, [menus]);

  const updateMenuMutation = useMutation({
    mutationFn: async ({ name, items }: { name: string; items: MenuItem[] }) => {
      const res = await apiFetch(`/api/menus/${name}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items_json: JSON.stringify(items) }),
      });
      if (!res.ok) throw new Error(`Failed to update ${name} menu`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
    },
  });

  const addItem = useCallback((tab: MenuType, item: MenuItem) => {
    setLocalMenus((prev) => ({
      ...prev,
      [tab]: [...(prev[tab] || []), item],
    }));
  }, []);

  const deleteItem = useCallback((tab: MenuType, index: number) => {
    setLocalMenus((prev) => {
      const newItems = [...(prev[tab] || [])];
      newItems.splice(index, 1);
      return { ...prev, [tab]: newItems };
    });
  }, []);

  const saveMenu = useCallback(
    (tab: MenuType) => {
      updateMenuMutation.mutate({
        name: tab,
        items: localMenus[tab] || [],
      });
    },
    [localMenus, updateMenuMutation]
  );

  return {
    localMenus,
    sitePages,
    isLoading,
    isSaving: updateMenuMutation.isPending,
    isSaved: updateMenuMutation.isSuccess,
    addItem,
    deleteItem,
    saveMenu,
  };
}
