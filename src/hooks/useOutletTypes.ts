import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { outletTypesApi } from '../api/endpoints/outletTypes';

export const useOutletTypes = () =>
  useQuery({
    queryKey: ['outlet-types'],
    queryFn: outletTypesApi.list,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateOutletType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { name: string; description: string }) => outletTypesApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet-types'] }),
  });
};

export const useUpdateOutletType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { name?: string; description?: string };
    }) => outletTypesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet-types'] }),
  });
};

export const useDeleteOutletType = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => outletTypesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['outlet-types'] }),
  });
};
