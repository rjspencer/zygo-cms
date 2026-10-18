import React from 'react';
import type { WebMCPToolDefinition, WebMCPToolResult } from './types';
import { useRegisterWebMCPTools } from '../../providers/WebMCPProvider';
import type { MenuItem, MenuType, LocalMenus, SitePageItem } from '../../pages/Navigation/types';

export interface UseNavigationEditorWebMCPOptions {
  activeTab: MenuType;
  setActiveTab: (tab: MenuType) => void;
  localMenus: LocalMenus;
  sitePages?: SitePageItem[];
  addItem: (tab: MenuType, item: MenuItem) => void;
  deleteItem: (tab: MenuType, index: number) => void;
  setItems?: (tab: MenuType, items: MenuItem[]) => void;
  saveMenu: (tab: MenuType) => Promise<any> | void;
  isSaving?: boolean;
  isSaved?: boolean;
}

/**
 * Registers active navigation editor tools in the WebMCP Registry when Navigation is mounted:
 * - navigation_get_active_state
 * - navigation_set_tab
 * - navigation_add_item
 * - navigation_delete_item
 * - navigation_set_items
 * - navigation_save
 */
export function useNavigationEditorWebMCP(options: UseNavigationEditorWebMCPOptions): void {
  const optionsRef = React.useRef(options);
  optionsRef.current = options;

  const tools = React.useMemo<WebMCPToolDefinition[]>(() => {
    return [
      {
        name: 'navigation_get_active_state',
        description: 'Get the active navigation editor state including selected tab, menu items (header and footer), and site pages',
        inputSchema: {
          type: 'object',
          properties: {},
        },
        handler: (): WebMCPToolResult => {
          const opt = optionsRef.current;
          const state = {
            activeTab: opt.activeTab,
            header: opt.localMenus.header || [],
            footer: opt.localMenus.footer || [],
            sitePages: opt.sitePages || [],
            isSaving: Boolean(opt.isSaving),
            isSaved: Boolean(opt.isSaved),
          };
          return {
            toolResult: state,
            content: [{ type: 'text', text: JSON.stringify(state, null, 2) }],
          };
        },
      },
      {
        name: 'navigation_set_tab',
        description: 'Switch the active navigation tab between "header" and "footer"',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['header', 'footer'],
              description: 'The menu tab to activate',
            },
          },
          required: ['tab'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          const opt = optionsRef.current;
          const tab: MenuType = args.tab === 'footer' ? 'footer' : 'header';
          opt.setActiveTab(tab);
          return {
            toolResult: { success: true, activeTab: tab },
            content: [{ type: 'text', text: `Switched active navigation tab to "${tab}".` }],
          };
        },
      },
      {
        name: 'navigation_add_item',
        description: 'Add a new menu item to the header or footer menu in the active editor',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['header', 'footer'],
              description: 'Target menu tab (defaults to current active tab)',
            },
            title: {
              type: 'string',
              description: 'The display label/title of the menu item',
            },
            url: {
              type: 'string',
              description: 'The destination link URL or relative path (e.g. "/about")',
            },
            target: {
              type: 'string',
              description: 'Link target attribute (defaults to "_self", or "_blank")',
            },
          },
          required: ['title', 'url'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          const opt = optionsRef.current;
          const targetTab: MenuType = args.tab === 'footer' || args.tab === 'header' ? args.tab : opt.activeTab;
          const title = String(args.title || '').trim();
          const url = String(args.url || '').trim();
          if (!title || !url) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Both title and url are required to add a menu item.' }],
            };
          }
          const item: MenuItem = {
            title,
            url,
            target: String(args.target || '_self'),
            children: Array.isArray(args.children) ? args.children : [],
          };
          opt.addItem(targetTab, item);
          return {
            toolResult: { success: true, tab: targetTab, item },
            content: [{ type: 'text', text: `Added menu item "${title}" (${url}) to "${targetTab}" menu.` }],
          };
        },
      },
      {
        name: 'navigation_delete_item',
        description: 'Delete a menu item by index from the header or footer menu in the active editor',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['header', 'footer'],
              description: 'Target menu tab (defaults to current active tab)',
            },
            index: {
              type: 'number',
              description: '0-based index of the menu item to delete',
            },
          },
          required: ['index'],
        },
        handler: (args: Record<string, any>): WebMCPToolResult => {
          const opt = optionsRef.current;
          const targetTab: MenuType = args.tab === 'footer' || args.tab === 'header' ? args.tab : opt.activeTab;
          const index = Number(args.index);
          const currentItems = opt.localMenus[targetTab] || [];
          if (isNaN(index) || index < 0 || index >= currentItems.length) {
            return {
              isError: true,
              content: [{
                type: 'text',
                text: `Invalid menu item index ${index}. Available range: 0 to ${Math.max(0, currentItems.length - 1)}.`,
              }],
            };
          }
          const deleted = currentItems[index];
          opt.deleteItem(targetTab, index);
          return {
            toolResult: { success: true, tab: targetTab, index, deletedItem: deleted },
            content: [{ type: 'text', text: `Deleted item at index ${index} ("${deleted?.title || ''}") from "${targetTab}" menu.` }],
          };
        },
      },
      {
        name: 'navigation_set_items',
        description: 'Replace all menu items for header or footer in the active editor and optionally trigger save',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['header', 'footer'],
              description: 'Target menu tab (defaults to current active tab)',
            },
            items: {
              type: 'array',
              description: 'Array of menu items ({ title, url, target?, children? })',
              items: {
                type: 'object',
                properties: {
                  title: { type: 'string' },
                  url: { type: 'string' },
                  target: { type: 'string' },
                },
                required: ['title', 'url'],
              },
            },
            save: {
              type: 'boolean',
              description: 'If true, immediately persists the updated items to backend',
            },
          },
          required: ['items'],
        },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          const targetTab: MenuType = args.tab === 'footer' || args.tab === 'header' ? args.tab : opt.activeTab;
          if (!Array.isArray(args.items)) {
            return {
              isError: true,
              content: [{ type: 'text', text: 'Argument "items" must be an array of menu item objects.' }],
            };
          }
          const sanitizedItems: MenuItem[] = args.items.map((raw: any) => ({
            title: String(raw.title || ''),
            url: String(raw.url || ''),
            target: String(raw.target || '_self'),
            children: Array.isArray(raw.children) ? raw.children : [],
          }));
          if (opt.setItems) {
            opt.setItems(targetTab, sanitizedItems);
          }
          let saved = false;
          if (args.save) {
            try {
              await opt.saveMenu(targetTab);
              saved = true;
            } catch (err: unknown) {
              const msg = err instanceof Error ? err.message : String(err);
              return {
                isError: true,
                content: [{ type: 'text', text: `Items set in editor but failed to save: ${msg}` }],
              };
            }
          }
          return {
            toolResult: { success: true, tab: targetTab, count: sanitizedItems.length, saved },
            content: [{
              type: 'text',
              text: `Updated "${targetTab}" menu with ${sanitizedItems.length} items${saved ? ' and saved to backend' : ''}.`,
            }],
          };
        },
      },
      {
        name: 'navigation_save',
        description: 'Persist the current menu items for a tab (or active tab) to the backend',
        inputSchema: {
          type: 'object',
          properties: {
            tab: {
              type: 'string',
              enum: ['header', 'footer'],
              description: 'Target menu tab to save (defaults to current active tab)',
            },
          },
        },
        handler: async (args: Record<string, any>): Promise<WebMCPToolResult> => {
          const opt = optionsRef.current;
          const targetTab: MenuType = args.tab === 'footer' || args.tab === 'header' ? args.tab : opt.activeTab;
          try {
            await opt.saveMenu(targetTab);
            return {
              toolResult: { success: true, tab: targetTab },
              content: [{ type: 'text', text: `Navigation menu "${targetTab}" successfully saved.` }],
            };
          } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            return {
              isError: true,
              content: [{ type: 'text', text: `Failed to save navigation menu: ${msg}` }],
            };
          }
        },
      },
    ];
  }, []);

  useRegisterWebMCPTools(tools);
}
