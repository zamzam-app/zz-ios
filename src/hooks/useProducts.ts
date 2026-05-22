import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { productsApi, categoriesApi } from '../api/endpoints/products';
import { cakeApi } from '../api/endpoints/upload';

export const useCustomCakes = () =>
  useQuery({
    queryKey: ['custom-cakes'],
    queryFn: cakeApi.listCustomCakes,
    staleTime: 5 * 60 * 1000,
  });

export const useUploadedCakes = () =>
  useQuery({
    queryKey: ['uploaded-cakes'],
    queryFn: cakeApi.listUploadedCakes,
    staleTime: 5 * 60 * 1000,
  });

export const useProducts = (categoryId?: string) =>
  useQuery({
    queryKey: ['products', categoryId],
    queryFn: () => productsApi.list(categoryId),
  });

export const useCategories = () =>
  useQuery({
    queryKey: ['categories'],
    queryFn: categoriesApi.list,
    staleTime: 5 * 60 * 1000,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof productsApi.update>[1];
    }) => productsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: productsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['products'] }),
  });
};

export const useCreateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useUpdateCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof categoriesApi.update>[1];
    }) => categoriesApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};

export const useDeleteCategory = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: categoriesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
};
