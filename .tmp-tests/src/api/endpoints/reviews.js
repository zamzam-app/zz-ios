"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewsApi = void 0;
const client_1 = __importDefault(require("../client"));
const mapListSafely_1 = require("./mapListSafely");
const reviewCritical_1 = require("../../utils/reviewCritical");
function isRawReviewEnvelope(value) {
    return Boolean(value
        && typeof value === 'object'
        && 'data' in value);
}
function unwrapRawReview(value) {
    if (isRawReviewEnvelope(value) && value.data && typeof value.data === 'object') {
        return value.data;
    }
    return value;
}
function mapReview(raw) {
    const id = String(raw._id ?? raw.id ?? '');
    const formId = typeof raw.formId === 'string'
        ? raw.formId
        : raw.formId?._id
            ? String(raw.formId._id)
            : raw.formId?.id
                ? String(raw.formId.id)
                : undefined;
    let customerName = 'Customer';
    let customerPhone;
    if (typeof raw.userId === 'object' && raw.userId) {
        if (raw.userId.name)
            customerName = raw.userId.name;
        if (raw.userId.phoneNumber)
            customerPhone = raw.userId.phoneNumber;
    }
    let outletId = '';
    let outletName = 'Unknown Outlet';
    if (typeof raw.outletId === 'object' && raw.outletId) {
        outletId = String(raw.outletId._id ?? '');
        outletName = raw.outletId.name ?? outletName;
    }
    else if (typeof raw.outletId === 'string') {
        outletId = raw.outletId;
    }
    const resolvedBy = typeof raw.resolvedBy === 'string'
        ? raw.resolvedBy
        : raw.resolvedBy?._id
            ? String(raw.resolvedBy._id)
            : raw.resolvedBy?.id
                ? String(raw.resolvedBy.id)
                : undefined;
    const resolvedByName = typeof raw.resolvedBy === 'object' && raw.resolvedBy?.name
        ? raw.resolvedBy.name
        : undefined;
    return {
        id,
        customerName,
        customerPhone,
        outletId,
        outletName,
        formId,
        overallRating: raw.overallRating ?? 0,
        userResponses: raw.userResponses ?? [],
        isComplaint: raw.isComplaint ?? false,
        complaintStatus: raw.complaintStatus,
        complaintReason: raw.complaintReason,
        resolvedAt: raw.resolvedAt,
        resolvedBy,
        resolvedByName,
        resolutionNotes: raw.resolutionNotes,
        resolutionAttachments: raw.resolutionAttachments,
        createdAt: raw.createdAt ?? new Date().toISOString(),
    };
}
exports.reviewsApi = {
    getBadgeStatus: (userId) => client_1.default
        .get(`/review/badge-status/${userId}`)
        .then((r) => r.data),
    markAsRead: (reviewId, userId) => client_1.default
        .post(`/review/${reviewId}/mark-read`, { userId })
        .then((r) => r.data),
    list: (query) => client_1.default
        .get('/review', { params: query })
        .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : r.data.data ?? [];
        return (0, mapListSafely_1.mapListSafely)(raw, 'reviews', mapReview);
    }),
    listCriticalOpen: (query) => exports.reviewsApi.list((0, reviewCritical_1.buildCriticalReviewsQuery)(query)).then((reviews) => {
        const filtered = (0, reviewCritical_1.filterOpenCriticalReviews)(reviews);
        if (filtered.length !== reviews.length) {
            console.warn('[reviewsApi.listCriticalOpen] Backend returned resolved or non-critical reviews; filtering client-side safeguard applied.');
        }
        return filtered;
    }),
    getById: (id) => client_1.default
        .get(`/review/${id}`)
        .then((r) => mapReview(unwrapRawReview(r.data))),
    resolveComplaint: (reviewId, payload) => client_1.default
        .post(`/review/resolve-complaint/${reviewId}`, payload)
        .then((r) => mapReview(unwrapRawReview(r.data))),
};
