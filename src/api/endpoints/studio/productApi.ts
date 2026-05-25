import client from '../../client';
import { mapListSafely } from '../mapListSafely';

import { mapProduct } from './productMappers';
import type { RawProduct } from './productMappers';

export const productsApi = {
  list: (categoryId?: string) =>
    client
      .get<{ data: RawProduct[] } | RawProduct[]>('/product', {
        params: { limit: 100, ...(categoryId && { categoryId }) },
      })
      .then((r) => {
        const raw = Array.isArray(r.data)
          ? r.data
          : ((r.data as { data: RawProduct[] }).data ?? []);
        return mapListSafely(raw, 'products', mapProduct);
      }),

  create: async (payload: {
    name: string;
    pricing: { quantityValue: number; amount: number }[];
    description: string;
    categoryList?: string[];
    images?: string[];
  }) => {
    const { pricing, ...rest } = payload;
    const body = {
      images: [],
      ...rest,
      pricing: pricing.map((item) => ({
        quantityValue: item.quantityValue,
        amount: item.amount,
      })),
    };
    const r = await client.post<RawProduct>('/product', body);
    return mapProduct(r.data);
  },

  update: async (
    id: string,
    payload: {
      name?: string;
      pricing?: { quantityValue: number; amount: number }[];
      description?: string;
      isActive?: boolean;
      categoryList?: string[];
      images?: string[];
    },
  ) => {
    const { pricing, ...rest } = payload;
    const body = {
      ...rest,
      ...(pricing !== undefined && {
        pricing: pricing.map((item) => ({
          quantityValue: item.quantityValue,
          amount: item.amount,
        })),
      }),
    };
    const r = await client.patch<RawProduct>(`/product/${id}`, body);
    return mapProduct(r.data);
  },

  delete: async (id: string) => {
    await client.delete(`/product/${id}`);
  },
};
