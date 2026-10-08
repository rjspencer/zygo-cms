import React, { ReactElement } from 'react';
import { render, RenderOptions, renderHook, RenderHookOptions } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryRouter, RouterProvider, MemoryRouterProps } from 'react-router-dom';
import { Theme } from '@radix-ui/themes';
import { ThemeProvider } from '../context/ThemeModeContext';
import { createQueryClient } from '../queryClient';
import './setup';

// Ensure localStorage mock exists for HappyDOM / Node 22+
const createStorageMock = () => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = String(value);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] ?? null,
    get length() {
      return Object.keys(store).length;
    },
  };
};

const storageMock = createStorageMock();

if (typeof globalThis !== 'undefined') {
  try {
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      configurable: true,
      writable: true,
    });
  } catch {
    (globalThis as any).localStorage = storageMock;
  }
}

if (typeof window !== 'undefined') {
  try {
    Object.defineProperty(window, 'localStorage', {
      value: storageMock,
      configurable: true,
      writable: true,
    });
  } catch {
    (window as any).localStorage = storageMock;
  }

  if (!window.matchMedia) {
    window.matchMedia = (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
}

export function createTestQueryClient(): QueryClient {
  return createQueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });
}

export interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  route?: string;
  routerInitialEntries?: MemoryRouterProps['initialEntries'];
  queryClient?: QueryClient;
}

const ChildrenContext = React.createContext<React.ReactNode>(null);
const ChildrenSlot = () => <>{React.useContext(ChildrenContext)}</>;

// useBlocker requires a data router, so tests use createMemoryRouter.
function createWrapper(
  queryClient: QueryClient,
  initialEntries: MemoryRouterProps['initialEntries']
) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    const [router] = React.useState(() =>
      createMemoryRouter([{ path: '*', element: <ChildrenSlot /> }], {
        initialEntries: initialEntries as string[],
      })
    );
    return (
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <Theme>
            <ChildrenContext.Provider value={children}>
              <RouterProvider router={router} />
            </ChildrenContext.Provider>
          </Theme>
        </ThemeProvider>
      </QueryClientProvider>
    );
  };
}

export function renderWithProviders(
  ui: ReactElement,
  options: CustomRenderOptions = {}
) {
  const {
    route = '/',
    routerInitialEntries = [route],
    queryClient = createTestQueryClient(),
    ...renderOptions
  } = options;

  return {
    queryClient,
    ...render(ui, { wrapper: createWrapper(queryClient, routerInitialEntries), ...renderOptions }),
  };
}

export function renderHookWithProviders<TResult, TProps>(
  hook: (props: TProps) => TResult,
  options: CustomRenderOptions & RenderHookOptions<TProps> = {}
) {
  const {
    route = '/',
    routerInitialEntries = [route],
    queryClient = createTestQueryClient(),
    ...renderHookOptions
  } = options;

  return {
    queryClient,
    ...renderHook(hook, {
      wrapper: createWrapper(queryClient, routerInitialEntries),
      ...renderHookOptions,
    }),
  };
}

export * from '@testing-library/react';
export { renderWithProviders as render };
