import React from 'react';
import { useNavigate, useLocation, useInRouterContext } from 'react-router-dom';
import { WebMCPRegistry } from '../lib/webmcp/registry';
import { WebMCPServerHost } from '../lib/webmcp/server';
import { WebMCPToolDefinition, WebMCPToolResult } from '../lib/webmcp/types';
import { createGlobalEntryTools } from '../lib/webmcp/entryTools';
import { createGlobalTemplateTools } from '../lib/webmcp/templateTools';
import { createGlobalThemeMediaMenuTools } from '../lib/webmcp/themeAndMediaTools';

const RouterNavigationBridge: React.FC<{
  navigateRef: React.MutableRefObject<(path: string) => void>;
  locationRef: React.MutableRefObject<{ pathname: string; search: string; hash: string }>;
}> = ({ navigateRef, locationRef }) => {
  const navigate = useNavigate();
  const location = useLocation();
  navigateRef.current = (path: string) => {
    navigate(path);
  };
  locationRef.current = {
    pathname: location.pathname,
    search: location.search,
    hash: location.hash,
  };
  return null;
};

export interface StagedChangeProposal {
  id: string;
  title: string;
  description?: string;
  fieldLabel: string;
  beforeText: string;
  afterText: string;
  onAccept: () => void | Promise<void>;
  onReject?: () => void;
}

export interface WebMCPContextValue {
  registry: WebMCPRegistry;
  host: WebMCPServerHost;
  externalBridgeEnabled: boolean;
  setExternalBridgeEnabled: (enabled: boolean) => void;
  requireConfirmation: boolean;
  setRequireConfirmation: (required: boolean) => void;
  stagedChange: StagedChangeProposal | null;
  stageChangeForReview: (proposal: Omit<StagedChangeProposal, 'id'>) => void;
  resolveStagedChange: (accepted: boolean) => Promise<void>;
}

const fallbackRegistry = new WebMCPRegistry();
const fallbackHost = new WebMCPServerHost(fallbackRegistry);
const fallbackContextValue: WebMCPContextValue = {
  registry: fallbackRegistry,
  host: fallbackHost,
  externalBridgeEnabled: false,
  setExternalBridgeEnabled: () => {},
  requireConfirmation: true,
  setRequireConfirmation: () => {},
  stagedChange: null,
  stageChangeForReview: () => {},
  resolveStagedChange: async () => {},
};

export const WebMCPContext = React.createContext<WebMCPContextValue | null>(null);

export function useWebMCP(): WebMCPContextValue {
  const context = React.useContext(WebMCPContext);
  return context ?? fallbackContextValue;
}

export interface WebMCPProviderProps {
  children: React.ReactNode;
  registry?: WebMCPRegistry;
}

export const WebMCPProvider: React.FC<WebMCPProviderProps> = ({
  children,
  registry: customRegistry,
}) => {
  const registry = React.useMemo(
    () => customRegistry ?? new WebMCPRegistry(),
    [customRegistry]
  );
  const host = React.useMemo(() => new WebMCPServerHost(registry), [registry]);

  const [externalBridgeEnabled, setExternalBridgeEnabled] = React.useState(false);
  const [requireConfirmation, setRequireConfirmation] = React.useState(true);
  const [stagedChange, setStagedChange] = React.useState<StagedChangeProposal | null>(null);

  const stagedChangeRef = React.useRef(stagedChange);
  stagedChangeRef.current = stagedChange;

  const stageChangeForReview = React.useCallback(
    (proposal: Omit<StagedChangeProposal, 'id'>) => {
      const id =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `proposal_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      setStagedChange({
        id,
        ...proposal,
      });
    },
    []
  );

  const resolveStagedChange = React.useCallback(
    async (accepted: boolean) => {
      const current = stagedChangeRef.current;
      if (!current) return;
      setStagedChange(null);
      try {
        if (accepted) {
          await current.onAccept();
        } else {
          current.onReject?.();
        }
      } catch (err) {
        console.error('Error resolving staged change proposal:', err);
      }
    },
    []
  );

  const stageChangeForReviewRef = React.useRef(stageChangeForReview);
  stageChangeForReviewRef.current = stageChangeForReview;

  const inRouter = useInRouterContext();
  const navigateRef = React.useRef<(path: string) => void>((path: string) => {
    locationRef.current = {
      pathname: path.split('?')[0].split('#')[0] || '/',
      search: path.includes('?') ? `?${path.split('?')[1].split('#')[0]}` : '',
      hash: path.includes('#') ? `#${path.split('#')[1]}` : '',
    };
  });
  const locationRef = React.useRef<{ pathname: string; search: string; hash: string }>({
    pathname: typeof window !== 'undefined' ? window.location.pathname : '/',
    search: typeof window !== 'undefined' ? window.location.search : '',
    hash: typeof window !== 'undefined' ? window.location.hash : '',
  });

  React.useEffect(() => {
    const navigateTool: WebMCPToolDefinition = {
      name: 'navigate_to',
      description: 'Navigate to a specific path in the Zygo CMS admin dashboard',
      inputSchema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'The destination path in the admin dashboard (e.g. /posts, /pages, /settings)',
          },
        },
        required: ['path'],
      },
      handler: (args: Record<string, any>) => {
        const path = String(args.path || '/');
        navigateRef.current(path);
        return {
          toolResult: { path },
          content: [{ type: 'text', text: `Navigated to ${path}` }],
        };
      },
    };

    const getCurrentViewTool: WebMCPToolDefinition = {
      name: 'get_current_view',
      description: 'Get current admin dashboard route and view location details',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: () => {
        const loc = locationRef.current;
        const view = {
          pathname: loc.pathname,
          search: loc.search,
          hash: loc.hash,
        };
        return {
          toolResult: view,
          content: [{ type: 'text', text: JSON.stringify(view, null, 2) }],
        };
      },
    };

    const getSystemInfoTool: WebMCPToolDefinition = {
      name: 'get_system_info',
      description: 'Get system information about the Zygo CMS WebMCP environment',
      inputSchema: {
        type: 'object',
        properties: {},
      },
      handler: () => {
        const loc = locationRef.current;
        const info = {
          server: 'zygo-cms-webmcp',
          version: '1.0.0',
          currentPath: loc.pathname,
          registeredToolCount: registry.getTools().length,
        };
        return {
          toolResult: info,
          content: [{ type: 'text', text: JSON.stringify(info, null, 2) }],
        };
      },
    };

    const proposeStagedChangeTool: WebMCPToolDefinition = {
      name: 'propose_staged_change',
      description: 'Propose a content or setting modification for operator review and confirmation',
      inputSchema: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Short title describing the proposed change',
          },
          description: {
            type: 'string',
            description: 'Optional additional explanation or context for the change',
          },
          field_label: {
            type: 'string',
            description: 'Label of the field, setting, or section being changed',
          },
          before_text: {
            type: 'string',
            description: 'The original or current text before the change',
          },
          after_text: {
            type: 'string',
            description: 'The proposed new text after the change',
          },
        },
        required: ['title', 'field_label', 'before_text', 'after_text'],
      },
      handler: (args: Record<string, any>) => {
        return new Promise<WebMCPToolResult>((resolve) => {
          stageChangeForReviewRef.current({
            title: String(args.title || 'Proposed Change'),
            description: args.description ? String(args.description) : undefined,
            fieldLabel: String(args.field_label || 'Value'),
            beforeText: String(args.before_text ?? ''),
            afterText: String(args.after_text ?? ''),
            onAccept: () => {
              resolve({
                toolResult: { accepted: true, status: 'accepted' },
                content: [{ type: 'text', text: `Proposed change "${args.title}" accepted by user.` }],
              });
            },
            onReject: () => {
              resolve({
                toolResult: { accepted: false, status: 'rejected' },
                content: [{ type: 'text', text: `Proposed change "${args.title}" rejected by user.` }],
              });
            },
          });
        });
      },
    };

    const globalEntryTools = createGlobalEntryTools();
    const globalTemplateTools = createGlobalTemplateTools();
    const globalThemeMediaTools = createGlobalThemeMediaMenuTools();

    const cleanup = registry.registerTools([
      navigateTool,
      getCurrentViewTool,
      getSystemInfoTool,
      proposeStagedChangeTool,
      ...globalEntryTools,
      ...globalTemplateTools,
      ...globalThemeMediaTools,
    ]);

    return cleanup;
  }, [registry]);

  const value = React.useMemo<WebMCPContextValue>(
    () => ({
      registry,
      host,
      externalBridgeEnabled,
      setExternalBridgeEnabled,
      requireConfirmation,
      setRequireConfirmation,
      stagedChange,
      stageChangeForReview,
      resolveStagedChange,
    }),
    [
      registry,
      host,
      externalBridgeEnabled,
      setExternalBridgeEnabled,
      requireConfirmation,
      setRequireConfirmation,
      stagedChange,
      stageChangeForReview,
      resolveStagedChange,
    ]
  );

  return (
    <WebMCPContext.Provider value={value}>
      {inRouter && <RouterNavigationBridge navigateRef={navigateRef} locationRef={locationRef} />}
      {children}
    </WebMCPContext.Provider>
  );
};

export function useRegisterWebMCPTools(
  tools: WebMCPToolDefinition[],
  deps?: React.DependencyList
): void {
  const { registry } = useWebMCP();

  React.useEffect(() => {
    const cleanup = registry.registerTools(tools);
    return () => {
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ? [registry, ...deps] : [registry, tools]);
}
