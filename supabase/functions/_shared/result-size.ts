const encoder = new TextEncoder();

export function resultByteLength(
  columns: readonly string[],
  rows: readonly Record<string, unknown>[],
): number {
  let bytes = columns.reduce(
    (total, column) => total + encoder.encode(column).byteLength + 3,
    2,
  );
  for (const row of rows) {
    bytes += 2;
    for (const column of columns)
      bytes += encoder.encode(valueText(row[column])).byteLength + 3;
  }
  return bytes;
}

function valueText(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (value instanceof Uint8Array) return `bytea:${value.byteLength}`;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}
