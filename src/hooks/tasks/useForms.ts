import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { formsApi, Question } from '../../api/endpoints/forms';

export const useForms = () =>
  useQuery({
    queryKey: ['forms'],
    queryFn: formsApi.list,
  });

export const useForm = (id: string) =>
  useQuery({
    queryKey: ['form', id],
    queryFn: () => formsApi.getById(id),
    enabled: !!id,
  });

export const useCreateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
};

export const useUpdateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title, questions }: { id: string; title: string; questions: Question[] }) =>
      formsApi.update(id, { title, questions }),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['forms'] });
      qc.setQueryData(['form', updated.id], updated);
    },
  });
};

export const useDeleteForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
};
