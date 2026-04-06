import { useQuery } from '@tanstack/react-query';
import { usersApi } from '../api/endpoints/users';

export const useManagers = () =>
  useQuery({
    queryKey: ['users', 'manager'],
    queryFn: () => usersApi.list('manager'),
    staleTime: 5 * 60 * 1000,
  });
