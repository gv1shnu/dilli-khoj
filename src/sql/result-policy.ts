export interface TabularResult {
  columns: readonly string[];
  rows: readonly Record<string, unknown>[];
}

export type ResultDiagnosisCode =
  | "correct"
  | "column_count"
  | "columns"
  | "missing_rows"
  | "extra_rows"
  | "duplicate_rows"
  | "order"
  | "values";

export interface ResultDiagnosis {
  code: ResultDiagnosisCode;
  message: string;
}

export function matchesOrderedResult(
  actual: TabularResult,
  expected: TabularResult,
): boolean {
  return diagnoseOrderedResult(actual, expected).code === "correct";
}

/** Explain the shape of a mismatch without printing any expected row values. */
export function diagnoseOrderedResult(
  actual: TabularResult,
  expected: TabularResult,
): ResultDiagnosis {
  if (actual.columns.length !== expected.columns.length)
    return {
      code: "column_count",
      message: `Your result has ${actual.columns.length} column${actual.columns.length === 1 ? "" : "s"}; the requested output has ${expected.columns.length}.`,
    };
  if (
    !actual.columns.every((column, index) => column === expected.columns[index])
  )
    return {
      code: "columns",
      message: `Check the column names and their order. The requested shape is: ${expected.columns.join(", ")}.`,
    };
  if (actual.rows.length < expected.rows.length)
    return {
      code: "missing_rows",
      message:
        "Some qualifying records are missing. Recheck every condition and how empty values are handled.",
    };
  if (actual.rows.length > expected.rows.length) {
    const actualCounts = rowCounts(actual);
    const expectedCounts = rowCounts(expected);
    const repeated = [...actualCounts].some(
      ([row, count]) => count > (expectedCounts.get(row) ?? 0) && count > 1,
    );
    return repeated
      ? {
          code: "duplicate_rows",
          message:
            "Repeated records are appearing in the result. Check whether each requested record should appear only once.",
        }
      : {
          code: "extra_rows",
          message:
            "The result includes records outside the request. Tighten the conditions before trying again.",
        };
  }

  const exact = actual.rows.every((row, rowIndex) =>
    actual.columns.every(
      (column) =>
        stableValue(row[column]) ===
        stableValue(expected.rows[rowIndex][column]),
    ),
  );
  if (exact) return { code: "correct", message: "The result matches." };

  const actualKeys = rowKeys(actual);
  const expectedKeys = rowKeys(expected);
  const sortedActual = [...actualKeys].sort();
  const sortedExpected = [...expectedKeys].sort();
  if (sortedActual.every((row, index) => row === sortedExpected[index]))
    return {
      code: "order",
      message:
        "You found the right records, but their order differs from the requested output.",
    };
  return {
    code: "values",
    message:
      "The output shape is right, but one or more returned values differ. Recheck calculations and conditions.",
  };
}

function rowKeys(result: TabularResult): string[] {
  return result.rows.map((row) =>
    JSON.stringify(result.columns.map((column) => stableValue(row[column]))),
  );
}

function rowCounts(result: TabularResult): Map<string, number> {
  const counts = new Map<string, number>();
  for (const row of rowKeys(result))
    counts.set(row, (counts.get(row) ?? 0) + 1);
  return counts;
}

function stableValue(value: unknown): string {
  if (value instanceof Date) return JSON.stringify(value.toISOString());
  if (typeof value === "bigint") return value.toString();
  return JSON.stringify(value);
}
