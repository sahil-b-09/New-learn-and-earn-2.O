import { useQuery as useReactQuery, UseQueryOptions } from '@tanstack/react-query';

export const useOptimizedQuery = <TData = unknown, TError = unknown>(
  options: UseQueryOptions<TData, TError>
) => {
  return useReactQuery({
    ...options,
    staleTime: options.staleTime ?? 5 * 60 * 1000,
    refetchOnWindowFocus: options.refetchOnWindowFocus ?? false,
    retry: options.retry ?? 1,
  });
};
