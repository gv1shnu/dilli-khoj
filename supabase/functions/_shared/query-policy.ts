import { parse } from "libpg-query";

export interface JudgeQueryPolicyOptions {
  allowedTables: readonly string[];
  maxBytes?: number;
}

export type JudgeQueryPolicyResult =
  | { ok: true; normalizedSql: string }
  | { ok: false; code: "sql_error" | "unsafe_query"; reason: string };

const ALLOWED_FUNCTIONS = new Set([
  "abs",
  "age",
  "array_agg",
  "avg",
  "btrim",
  "ceil",
  "ceiling",
  "char_length",
  "coalesce",
  "concat",
  "concat_ws",
  "count",
  "cume_dist",
  "date_part",
  "date_trunc",
  "dense_rank",
  "first_value",
  "floor",
  "initcap",
  "lag",
  "last_value",
  "lead",
  "left",
  "length",
  "lower",
  "ltrim",
  "make_date",
  "max",
  "min",
  "mod",
  "now",
  "nth_value",
  "ntile",
  "nullif",
  "percent_rank",
  "position",
  "power",
  "rank",
  // `repeat` is intentionally omitted: no question needs it and it can inflate a single
  // value to arbitrary size. Keeping it out removes an easy result-size abuse vector.
  "replace",
  "reverse",
  "right",
  "round",
  "row_number",
  "rtrim",
  "sign",
  "split_part",
  "sqrt",
  "string_agg",
  "substr",
  "substring",
  "sum",
  "to_char",
  "trim",
  "trunc",
  "upper",
]);

export async function inspectJudgeQuery(
  sql: string,
  options: JudgeQueryPolicyOptions,
): Promise<JudgeQueryPolicyResult> {
  const normalizedSql = sql.trim().replace(/;+\s*$/, "");
  const maxBytes = options.maxBytes ?? 10_000;

  if (!normalizedSql) {
    return { ok: false, code: "sql_error", reason: "Write a query first." };
  }

  if (new TextEncoder().encode(normalizedSql).byteLength > maxBytes) {
    return { ok: false, code: "unsafe_query", reason: "Keep the query under 10 KB." };
  }

  let parsed: unknown;
  try {
    parsed = await parse(normalizedSql);
  } catch {
    return { ok: false, code: "sql_error", reason: "PostgreSQL could not parse that query." };
  }

  const statements = readRecord(parsed)?.stmts;
  if (!Array.isArray(statements) || statements.length !== 1) {
    return { ok: false, code: "unsafe_query", reason: "Submit one statement at a time." };
  }

  const rootStatement = readRecord(readRecord(statements[0])?.stmt);
  if (!rootStatement?.SelectStmt) {
    return { ok: false, code: "unsafe_query", reason: "Only SELECT or WITH … SELECT is allowed." };
  }

  const cteNames = new Set<string>();
  walkAst(rootStatement, (key, value) => {
    if (key !== "CommonTableExpr") return;
    const name = readRecord(value)?.ctename;
    if (typeof name === "string") cteNames.add(name);
  });

  const allowedTables = new Set(options.allowedTables);
  let rejection: JudgeQueryPolicyResult | undefined;

  walkAst(rootStatement, (key, value) => {
    if (rejection) return;

    if (key.endsWith("Stmt") && key !== "SelectStmt") {
      rejection = {
        ok: false,
        code: "unsafe_query",
        reason: "Data-changing statements are not allowed, including inside a CTE.",
      };
      return;
    }

    if (key === "SelectStmt") {
      const select = readRecord(value);
      if (select?.intoClause || select?.lockingClause) {
        rejection = {
          ok: false,
          code: "unsafe_query",
          reason: "SELECT INTO and row locks are not allowed.",
        };
      }
      return;
    }

    if (key === "RangeVar") {
      const relation = readRecord(value);
      const tableName = relation?.relname;
      if (typeof relation?.schemaname === "string") {
        rejection = {
          ok: false,
          code: "unsafe_query",
          reason: "Use the unqualified table names shown in the schema browser.",
        };
      } else if (
        typeof tableName !== "string" ||
        (!allowedTables.has(tableName) && !cteNames.has(tableName))
      ) {
        rejection = {
          ok: false,
          code: "unsafe_query",
          reason: "That relation is not part of this ruin's dataset.",
        };
      }
      return;
    }

    if (key === "FuncCall") {
      const call = readRecord(value);
      const functionParts = Array.isArray(call?.funcname)
        ? call.funcname
            .map((part) => readRecord(readRecord(part)?.String)?.sval)
            .filter((part): part is string => typeof part === "string")
        : [];

      if (functionParts.length !== 1 || !ALLOWED_FUNCTIONS.has(functionParts[0].toLowerCase())) {
        rejection = {
          ok: false,
          code: "unsafe_query",
          reason: "That function is not available in the course query allowlist.",
        };
      }
    }
  });

  return rejection ?? { ok: true, normalizedSql };
}

function walkAst(value: unknown, visit: (key: string, value: unknown) => void): void {
  if (Array.isArray(value)) {
    value.forEach((item) => walkAst(item, visit));
    return;
  }

  const record = readRecord(value);
  if (!record) return;

  for (const [key, child] of Object.entries(record)) {
    visit(key, child);
    walkAst(child, visit);
  }
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}
