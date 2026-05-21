"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mapListSafely = mapListSafely;
function mapListSafely(records, tag, mapRecord) {
    const mapped = [];
    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        try {
            mapped.push(mapRecord(record));
        }
        catch (error) {
            const recordId = String(record?._id ?? record?.id ?? 'unknown');
            console.warn(`[${tag}] skipping malformed record at index ${index} (id: ${recordId})`, error);
        }
    }
    return mapped;
}
