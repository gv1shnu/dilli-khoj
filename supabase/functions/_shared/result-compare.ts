export interface ActualResult {
  columns: readonly string[];
  /** PostgreSQL OIDs supplied by the wire driver (PGlite already returns JS numbers). */
  columnTypes?: readonly number[];
  rows: readonly Record<string, unknown>[];
}

export interface ExpectedResult {
  columnTypes?: readonly number[];
  columns: readonly string[];
  rows: readonly (readonly unknown[])[];
  comparison: "ordered" | "unordered";
}

export function compareResult(
  actual: ActualResult,
  expected: ExpectedResult,
): boolean {
  if (actual.columns.length !== expected.columns.length) return false;
  if (
    !actual.columns.every((column, index) => column === expected.columns[index])
  )
    return false;
  if (actual.rows.length !== expected.rows.length) return false;

  const actualRows = actual.rows.map((row) =>
    actual.columns.map((column, index) =>
      canonicalValue(
        row[column],
        actual.columnTypes?.[index] ?? expected.columnTypes?.[index],
      ),
    ),
  );
  const expectedRows = expected.rows.map((row) =>
    row.map((value, index) =>
      canonicalValue(value, expected.columnTypes?.[index]),
    ),
  );

  if (expected.comparison === "unordered") {
    actualRows.sort(compareCanonicalRows);
    expectedRows.sort(compareCanonicalRows);
  }

  return JSON.stringify(actualRows) === JSON.stringify(expectedRows);
}

function canonicalValue(value: unknown, oid?: number): unknown {
  // postgres.js preserves bigint/numeric as strings. Do not coerce arbitrary text
  // or round high-precision decimals through Number just to match browser results.
  if ((oid === 20 || oid === 1700) && typeof value === "string")
    return ["number", numericKey(value)];
  if (value === null) return ["null"];
  if (value instanceof Date) return ["string", value.toISOString()];
  if (typeof value === "bigint")
    return ["number", numericKey(value.toString())];
  if (typeof value === "number") return ["number", numericKey(String(value))];
  if (typeof value === "string") return ["string", value];
  if (typeof value === "boolean") return ["boolean", value];
  if (Array.isArray(value))
    return ["array", value.map((child) => canonicalValue(child))];
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

function compareCanonicalRows(
  left: readonly unknown[],
  right: readonly unknown[],
): number {
  return JSON.stringify(left).localeCompare(JSON.stringify(right));
}

function numericKey(value: string): string {
  const match = /^([+-]?)(\d+)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(value);
  if (!match) return value;
  const fraction = match[3] ?? "";
  let digits = (match[2] + fraction).replace(/^0+/, "");
  if (!digits) return "0";
  let exponent = Number(match[4] ?? 0) - fraction.length;
  while (digits.endsWith("0")) {
    digits = digits.slice(0, -1);
    exponent++;
  }
  return `${match[1] === "-" ? "-" : ""}${digits}e${exponent}`;
}
