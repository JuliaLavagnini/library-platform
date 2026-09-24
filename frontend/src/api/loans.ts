import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { unwrap, usersApi } from './client.ts';

// Loan data and actions shared by several pages. After a borrow or a return, the cached
// books and loans are refreshed so every page shows the new copy counts.

export function useMemberLoans(userId: string | undefined) {
  return useQuery({
    queryKey: ['loans', 'member', userId],
    queryFn: () =>
      unwrap(usersApi.GET('/api/users/{id}/loans', { params: { path: { id: userId! } } })),
    enabled: Boolean(userId),
  });
}

export function useBorrowBook() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, bookId }: { userId: string; bookId: string }) =>
      unwrap(
        usersApi.POST('/api/users/{id}/loans', {
          params: { path: { id: userId } },
          body: { bookId },
        }),
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}

export function useReturnLoan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, loanId }: { userId: string; loanId: string }) =>
      unwrap(
        usersApi.POST('/api/users/{id}/loans/{loanId}/return', {
          params: { path: { id: userId, loanId } },
        }),
      ),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['books'] });
      void queryClient.invalidateQueries({ queryKey: ['loans'] });
    },
  });
}
