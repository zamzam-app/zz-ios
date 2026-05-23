import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { outletsApi, CreateOutletPayload, UpdateOutletPayload } from '../../api/endpoints/outlets';

export const useOutlets = () =>
  useQuery({
    queryKey: ['outlets'],
    queryFn: outletsApi.list,
    staleTime: 5 * 60 * 1000,
  });

export const useOutlet = (id: string) =>
  useQuery({
    queryKey: ['outlet', id],
    queryFn: () => outletsApi.getById(id),
    enabled: !!id,
  });

export const useCreateOutlet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateOutletPayload) => outletsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlets'] }),
  });
};

export const useUpdateOutlet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateOutletPayload }) =>
      outletsApi.update(id, payload),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['outlets'] });
      qc.setQueryData(['outlet', updated.id], updated);
    },
  });
};

export const useDeleteOutlet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => outletsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlets'] }),
  });
};
