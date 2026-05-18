import client from '../client';
import { mapListSafely } from './mapListSafely';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface ProductPricing {
  quantityValue: number;
  quantityUnit: 'kg';
  amount: number;
  currency: 'INR';
}

export interface Product {
  id: string;
  name: string;
  pricing: ProductPricing[];
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
  pricing?: Array<{
    quantityValue?: any;
    quantityUnit?: any;
    amount?: any;
    currency?: any;
  }>;
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
  const rawPricing = raw.pricing;
  const pricingList: ProductPricing[] = [];

  if (Array.isArray(rawPricing)) {
    for (const item of rawPricing) {
      if (item && typeof item === 'object') {
        const rawQVal = Number(item.quantityValue);
        const rawAmt = Number(item.amount);

        const quantityValue = !isNaN(rawQVal) ? rawQVal : 0;
        const amount = !isNaN(rawAmt) ? rawAmt : 0;

        pricingList.push({
          quantityValue,
          quantityUnit: 'kg',
          amount,
          currency: 'INR',
        });
      }
    }
  }

  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    pricing: pricingList,
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

  create: (payload: {
    name: string;
    pricing: Array<{ quantityValue: number; amount: number }>;
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
    return client.post<RawProduct>('/product', body).then((r) => mapProduct(r.data));
  },

  update: (
    id: string,
    payload: {
      name?: string;
      pricing?: Array<{ quantityValue: number; amount: number }>;
      description?: string;
      isActive?: boolean;
      categoryList?: string[];
      images?: string[];
    }
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
    return client.patch<RawProduct>(`/product/${id}`, body).then((r) => mapProduct(r.data));
  },

  delete: (id: string) => client.delete(`/product/${id}`),
};
