import client from '../client';
import { mapListSafely } from './mapListSafely';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  description: string;
  isActive: boolean;
  categoryList?: string[];
  images: string[];
}

interface RawCategory {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

interface RawProduct {
  _id?: string;
  id?: string;
  name?: string;
  price?: number;
  description?: string;
  isActive?: boolean;
  categoryList?: string[];
  images?: string[];
}

function mapCategory(raw: RawCategory): Category {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    description: raw.description,
  };
}

function mapProduct(raw: RawProduct): Product {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    price: raw.price ?? 0,
    description: raw.description ?? '',
    isActive: raw.isActive ?? true,
    categoryList: raw.categoryList,
    images: raw.images ?? [],
  };
}

export const categoriesApi = {
  list: () =>
    client
      .get<{ data: RawCategory[] } | RawCategory[]>('/category', { params: { limit: 100 } })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawCategory[] }).data ?? [];
        return mapListSafely(raw, 'categories', mapCategory);
      }),

  create: (payload: { name: string; description?: string }) =>
    client.post<RawCategory>('/category', payload).then((r) => mapCategory(r.data)),

  update: (id: string, payload: { name?: string; description?: string }) =>
    client.patch<RawCategory>(`/category/${id}`, payload).then((r) => mapCategory(r.data)),

  delete: (id: string) => client.delete(`/category/${id}`),
};

export const productsApi = {
  list: (categoryId?: string) =>
    client
      .get<{ data: RawProduct[] } | RawProduct[]>('/product', {
        params: { limit: 100, ...(categoryId && { categoryId }) },
      })
      .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : (r.data as { data: RawProduct[] }).data ?? [];
        return mapListSafely(raw, 'products', mapProduct);
      }),

  create: (payload: { name: string; price: number; description: string; categoryList?: string[]; images?: string[] }) =>
    client.post<RawProduct>('/product', { images: [], ...payload }).then((r) => mapProduct(r.data)),

  update: (id: string, payload: { name?: string; price?: number; description?: string; isActive?: boolean; categoryList?: string[]; images?: string[] }) =>
    client.patch<RawProduct>(`/product/${id}`, payload).then((r) => mapProduct(r.data)),

  delete: (id: string) => client.delete(`/product/${id}`),
};
