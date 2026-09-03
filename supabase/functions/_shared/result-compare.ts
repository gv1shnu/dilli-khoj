export interface ActualResult {
  columns: readonly string[];
  rows: readonly Record<string, unknown>[];
}

export interface ExpectedResult {
  columns: readonly string[];
  rows: readonly (readonly unknown[])[];
  comparison: "ordered" | "unordered";
}

export function compareResult(actual: ActualResult, expected: ExpectedResult): boolean {
  if (actual.columns.length !== expected.columns.length) return false;
  if (!actual.columns.every((column, index) => column === expected.columns[index])) return false;
  if (actual.rows.length !== expected.rows.length) return false;

  const actualRows = actual.rows.map((row) =>
    actual.columns.map((column) => canonicalValue(row[column])),
  );
  const expectedRows = expected.rows.map((row) => row.map(canonicalValue));

  if (expected.comparison === "unordered") {
    actualRows.sort(compareCanonicalRows);
    expectedRows.sort(compareCanonicalRows);
  }

  return JSON.stringify(actualRows) === JSON.stringify(expectedRows);
}

function canonicalValue(value: unknown): unknown {
  if (value === null) return ["null"];
  if (value instanceof Date) return ["string", value.toISOString()];
  if (typeof value === "bigint") return ["number", value.toString()];
  if (typeof value === "number") return ["number", String(value)];
  if (typeof value === "string") return ["string", value];
  if (typeof value === "boolean") return ["boolean", value];
  if (Array.isArray(value)) return ["array", value.map(canonicalValue)];
  if (value && typeof value === "object") {
    return [
      "object",
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalValue(child)]),
    ];
  }
  return [typeof value, String(value)];
}

function compareCanonicalRows(left: readonly unknown[], right: readonly unknown[]): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}
