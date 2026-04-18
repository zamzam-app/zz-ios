interface RecordWithOptionalId {
  _id?: unknown;
  id?: unknown;
}

export function mapListSafely<TRecord extends RecordWithOptionalId, TOutput>(
  records: TRecord[],
  tag: string,
  mapRecord: (record: TRecord) => TOutput,
): TOutput[] {
  const mapped: TOutput[] = [];

  for (let index = 0; index < records.length; index += 1) {
    const record = records[index];
    try {
      mapped.push(mapRecord(record));
    } catch (error) {
      const recordId = String(record?._id ?? record?.id ?? 'unknown');
      console.warn(`[${tag}] skipping malformed record at index ${index} (id: ${recordId})`, error);
    }
  }

  return mapped;
}
