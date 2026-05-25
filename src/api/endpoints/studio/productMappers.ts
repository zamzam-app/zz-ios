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

export interface RawCategory {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
}

export interface RawProduct {
  _id?: string;
  id?: string;
  name?: string;
  price?: unknown;
  pricing?: {
    quantityValue?: unknown;
    quantityUnit?: unknown;
    amount?: unknown;
    currency?: unknown;
  }[];
  description?: string;
  isActive?: boolean;
  categoryList?: string[];
  images?: string[];
}

export function mapCategory(raw: RawCategory): Category {
  return {
    id: String(raw._id ?? raw.id ?? ''),
    name: raw.name ?? '',
    description: raw.description,
  };
}

export function mapProduct(raw: RawProduct): Product {
  const rawPricing = raw.pricing;
  const pricingList: ProductPricing[] = [];

  if (!rawPricing && raw.price !== undefined && raw.price !== null) {
    const legacyPrice = Number(raw.price);
    const amount = !isNaN(legacyPrice) ? legacyPrice : 0;
    pricingList.push({
      quantityValue: 1,
      quantityUnit: 'kg',
      amount,
      currency: 'INR',
    });
  } else if (Array.isArray(rawPricing)) {
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
