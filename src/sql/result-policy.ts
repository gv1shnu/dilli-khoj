export interface TabularResult {
  columns: readonly string[];
  rows: readonly Record<string, unknown>[];
}

export function matchesOrderedResult(actual: TabularResult, expected: TabularResult): boolean {
  if (actual.columns.length !== expected.columns.length) return false;
  if (!actual.columns.every((column, index) => column === expected.columns[index])) return false;
  if (actual.rows.length !== expected.rows.length) return false;

  return actual.rows.every((row, rowIndex) =>
    actual.columns.every(
      (column) => stableValue(row[column]) === stableValue(expected.rows[rowIndex][column]),
    ),
  );
}

function stableValue(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value === "bigint") return value.toString();
  return JSON.stringify(value);
}
