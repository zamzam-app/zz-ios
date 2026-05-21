"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OUTLETS_EMPTY_DEFAULT_MESSAGE = exports.OUTLET_SEARCH_PLACEHOLDER = exports.OUTLET_SEARCH_DEBOUNCE_MS = void 0;
exports.normalizeOutletSearchQuery = normalizeOutletSearchQuery;
exports.buildOutletSearchableText = buildOutletSearchableText;
exports.filterOutletsByQuery = filterOutletsByQuery;
exports.getOutletsEmptyStateMessage = getOutletsEmptyStateMessage;
exports.buildOutletsScreenModel = buildOutletsScreenModel;
exports.OUTLET_SEARCH_DEBOUNCE_MS = 250;
exports.OUTLET_SEARCH_PLACEHOLDER = 'Search outlets...';
exports.OUTLETS_EMPTY_DEFAULT_MESSAGE = 'No outlets found';
function normalizeQueryPart(value) {
    return value?.trim().toLowerCase() ?? '';
}
function normalizeOutletSearchQuery(query) {
    return normalizeQueryPart(query);
}
function buildOutletSearchableText(outlet) {
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
function filterOutletsByQuery(outlets, query) {
    const normalizedQuery = normalizeOutletSearchQuery(query);
    if (!normalizedQuery)
        return outlets.slice();
    return outlets.filter((outlet) => buildOutletSearchableText(outlet).includes(normalizedQuery));
}
function getOutletsEmptyStateMessage(query) {
    return normalizeOutletSearchQuery(query)
        ? 'No outlets match your search'
        : exports.OUTLETS_EMPTY_DEFAULT_MESSAGE;
}
function buildOutletsScreenModel(outlets, rawQuery, debouncedQuery) {
    const visibleOutlets = filterOutletsByQuery(outlets, debouncedQuery);
    return {
        searchPlaceholder: exports.OUTLET_SEARCH_PLACEHOLDER,
        showClearSearch: rawQuery.length > 0,
        visibleOutlets,
        emptyMessage: getOutletsEmptyStateMessage(debouncedQuery),
    };
}
