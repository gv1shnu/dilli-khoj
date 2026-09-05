const encoder = new TextEncoder();

/**
 * Approximate UTF-8 byte size of a tabular result. Pass `limit` to stop early: an
 * oversized value is rejected from its cheap `.length` (UTF-8 byte length is always
 * >= a string's UTF-16 length) before an encoded copy is ever allocated, so a single
 * huge value — e.g. a long generated string — cannot drive ~2x its size in memory
 * just to be measured.
 */
export function resultByteLength(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
  limit = Number.POSITIVE_INFINITY,
): number {
  let bytes = columns.reduce(
    (total, column) => total + encoder.encode(column).byteLength + 3,
    2,
  );
  for (const row of rows) {
    bytes += 2;
    for (const column of columns) {
      const text = valueText(row[column]);
      if (text.length > limit) return limit + 1;
      bytes += encoder.encode(text).byteLength + 3;
      if (bytes > limit) return bytes;
    }
  }
  return bytes;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Uint8Array) return `bytea:${value.byteLength}`;
  if (value instanceof Date) return value.toISOString();
  // Arrays and jsonb come back as objects; serialize them so their real size counts
  // instead of collapsing to "[object Object]".
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}
