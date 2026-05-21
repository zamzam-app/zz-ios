export type SearchableOutlet = {
  id: string;
  name: string;
  description?: string;
  address?: string;
  formId?: string;
  outletTypeName?: string;
  managerNames?: string[];
  managerIds?: string[];
  qrToken?: string;
};

export const OUTLET_SEARCH_DEBOUNCE_MS = 250;
export const OUTLET_SEARCH_PLACEHOLDER = 'Search outlets...';
export const OUTLETS_EMPTY_DEFAULT_MESSAGE = 'No outlets found';

function normalizeQueryPart(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

export function normalizeOutletSearchQuery(query: string): string {
  return normalizeQueryPart(query);
}

export function buildOutletSearchableText(outlet: SearchableOutlet): string {
  return [
    outlet.name,
    outlet.address,
    outlet.description,
    outlet.formId,
    outlet.id,
    outlet.qrToken,
    outlet.outletTypeName,
    ...(outlet.managerNames ?? []),
    ...(outlet.managerIds ?? []),
  ]
    .map(normalizeQueryPart)
    .filter(Boolean)
    .join(' ');
}

export function filterOutletsByQuery<T extends SearchableOutlet>(outlets: T[], query: string): T[] {
  const normalizedQuery = normalizeOutletSearchQuery(query);
  if (!normalizedQuery) return outlets.slice();

  return outlets.filter((outlet) => buildOutletSearchableText(outlet).includes(normalizedQuery));
}

export function getOutletsEmptyStateMessage(query: string): string {
  return normalizeOutletSearchQuery(query)
    ? 'No outlets match your search'
    : OUTLETS_EMPTY_DEFAULT_MESSAGE;
}

export function buildOutletsScreenModel<T extends SearchableOutlet>(
  outlets: T[],
  rawQuery: string,
  debouncedQuery: string,
) {
  const visibleOutlets = filterOutletsByQuery(outlets, debouncedQuery);

  return {
    searchPlaceholder: OUTLET_SEARCH_PLACEHOLDER,
    showClearSearch: rawQuery.length > 0,
    visibleOutlets,
    emptyMessage: getOutletsEmptyStateMessage(debouncedQuery),
  };
}
