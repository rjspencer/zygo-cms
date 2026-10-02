import { QueryClient, QueryClientConfig } from '@tanstack/react-query';

export function createQueryClient(config?: QueryClientConfig): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Stale-while-revalidate:
        // Serve immediately from cache while fetching fresh data in the background
        staleTime: 1000 * 60, // 1 minute
        gcTime: 1000 * 60 * 5, // 5 minutes
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        retry: (failureCount, error) => {
          // Do not retry on client errors (4xx)
          if (error instanceof Error && error.message.includes('40')) {
            return false;
          }
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
      ...config?.defaultOptions,
    },
    ...config,
  });
}

export const queryClient = createQueryClient();
