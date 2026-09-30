import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      // Retry only transient server/network failures; 4xx answers are final.
      retry: (count, error) => {
        const status = error?.response?.status;
        return count < 2 && (status == null || status >= 500);
      },
      refetchOnWindowFocus: false,
    },
    mutations: { retry: false },
  },
});
