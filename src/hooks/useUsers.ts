import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import {
  usersApi,
  CreateManagerPayload,
  UpdateManagerPayload,
  ChangePasswordPayload,
} from '../api/endpoints/users';

export const useUsers = () =>
  useQuery({
    queryKey: ['users', 'all'],
    queryFn: () => usersApi.list(),
    staleTime: 5 * 60 * 1000,
  });

export const useManagers = () =>
  useQuery({
    queryKey: ['users', 'manager'],
    queryFn: () => usersApi.list('manager'),
    staleTime: 5 * 60 * 1000,
  });

export const useCreateManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateManagerPayload) => usersApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateManagerPayload }) =>
      usersApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useDeleteManager = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useChangePassword = () =>
  useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: ChangePasswordPayload }) =>
      usersApi.changePassword(id, payload),
  });
