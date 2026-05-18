"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.outletsApi = void 0;
const client_1 = __importDefault(require("../client"));
const mapListSafely_1 = require("./mapListSafely");
function mapOutlet(raw) {
    const id = String(raw._id ?? raw.id ?? '');
    let outletTypeId;
    let outletTypeName;
    if (typeof raw.outletType === 'object' && raw.outletType) {
        outletTypeId = String(raw.outletType._id ?? '');
        outletTypeName = raw.outletType.name;
    }
    else if (typeof raw.outletType === 'string') {
        outletTypeId = raw.outletType;
        outletTypeName = raw.outletTypeName;
    }
    else if (typeof raw.outletTypeId === 'object' && raw.outletTypeId) {
        outletTypeId = String(raw.outletTypeId._id ?? '');
        outletTypeName = raw.outletTypeId.name;
    }
    else if (typeof raw.outletTypeId === 'string') {
        outletTypeId = raw.outletTypeId;
        outletTypeName = raw.outletTypeName;
    }
    const managerRefs = raw.managerIds ?? [];
    let managerIds = managerRefs
        .map((manager) => (typeof manager === 'string' ? manager : String(manager._id ?? '')))
        .filter(Boolean);
    let managerNames = managerRefs
        .map((manager) => (typeof manager === 'object' ? manager.name ?? '' : ''))
        .filter(Boolean);
    if (Array.isArray(raw.managerNames) && raw.managerNames.length > 0) {
        managerNames = raw.managerNames.filter(Boolean);
    }
    if ((managerIds.length === 0 || managerNames.length === 0) && Array.isArray(raw.managers) && raw.managers.length > 0) {
        if (managerIds.length === 0) {
            managerIds = raw.managers.map((m) => String(m._id ?? '')).filter(Boolean);
        }
        if (managerNames.length === 0) {
            managerNames = raw.managers.map((m) => m.name ?? '').filter(Boolean);
        }
    }
    return {
        id,
        name: raw.name ?? '',
        description: raw.description,
        address: raw.address,
        formId: typeof raw.formId === 'string'
            ? raw.formId
            : raw.formId?._id
                ? String(raw.formId._id)
                : raw.formId?.id
                    ? String(raw.formId.id)
                    : undefined,
        outletTypeId,
        outletTypeName,
        managerIds,
        managerNames,
        rating: raw.rating ?? 0,
        totalFeedback: raw.totalFeedback ?? 0,
        images: raw.images,
        qrToken: raw.qrToken,
    };
}
exports.outletsApi = {
    list: () => client_1.default
        .get('/outlet', { params: { limit: 100 } })
        .then((r) => {
        const raw = Array.isArray(r.data) ? r.data : r.data.data ?? [];
        return (0, mapListSafely_1.mapListSafely)(raw, 'outlets', mapOutlet);
    }),
    getById: (id) => client_1.default.get(`/outlet/${id}`).then((r) => mapOutlet(r.data)),
    create: (payload) => client_1.default.post('/outlet', payload).then((r) => mapOutlet(r.data)),
    update: (id, payload) => client_1.default.patch(`/outlet/${id}`, payload).then((r) => mapOutlet(r.data)),
    delete: (id) => client_1.default.delete(`/outlet/${id}`),
};
