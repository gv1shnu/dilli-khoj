export type QueryPolicyResult =
  | { ok: true; normalizedSql: string }
  | { ok: false; reason: string };

const MAX_QUERY_BYTES = 10_000;

/**
 * Fast browser-side guard for the disposable practice database.
 * This is a UX check, not the production security boundary. The server judge
 * must parse and execute queries with a restricted PostgreSQL identity.
 */
export function checkPracticeQuery(sql: string): QueryPolicyResult {
  const normalizedSql = sql.trim();

  if (!normalizedSql) {
    return { ok: false, reason: "Write a query first." };
  }

  if (new TextEncoder().encode(normalizedSql).byteLength > MAX_QUERY_BYTES) {
    return { ok: false, reason: "Keep the query under 10 KB." };
  }

  const statements = splitStatements(normalizedSql);
  if (statements.length !== 1) {
    return { ok: false, reason: "Run one statement at a time." };
  }

  const withoutLeadingComments = stripLeadingComments(statements[0]).trimStart();
  if (!/^(select|with)\b/i.test(withoutLeadingComments)) {
    return { ok: false, reason: "Practice accepts SELECT or WITH … SELECT only." };
  }

  return { ok: true, normalizedSql: statements[0].trim() };
}

function stripLeadingComments(sql: string): string {
  let rest = sql;

  while (true) {
    const next = rest.replace(/^\s*(?:--[^\n]*(?:\n|$)|\/\*[\s\S]*?\*\/)/, "");
    if (next === rest) return rest;
    rest = next;
  }
}

export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let quote: "single" | "double" | "dollar" | null = null;
  let dollarTag = "";
  let lineComment = false;
  let blockDepth = 0;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      if (char === "\n") lineComment = false;
      continue;
    }

    if (blockDepth > 0) {
      if (char === "/" && next === "*") {
        blockDepth += 1;
        index += 1;
      } else if (char === "*" && next === "/") {
        blockDepth -= 1;
        index += 1;
      }
      continue;
    }

    if (quote === "single") {
      if (char === "'" && next === "'") index += 1;
      else if (char === "'") quote = null;
      continue;
    }

    if (quote === "double") {
      if (char === '"' && next === '"') index += 1;
      else if (char === '"') quote = null;
      continue;
    }

    if (quote === "dollar") {
      if (sql.startsWith(dollarTag, index)) {
        index += dollarTag.length - 1;
        quote = null;
      }
      continue;
    }

    if (char === "-" && next === "-") {
      lineComment = true;
      index += 1;
    } else if (char === "/" && next === "*") {
      blockDepth = 1;
      index += 1;
    } else if (char === "'") {
      quote = "single";
    } else if (char === '"') {
      quote = "double";
    } else if (char === "$" && /^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/.test(sql.slice(index))) {
      dollarTag = sql.slice(index).match(/^\$[A-Za-z_][A-Za-z0-9_]*\$|^\$\$/)![0];
      quote = "dollar";
      index += dollarTag.length - 1;
    } else if (char === ";") {
      const statement = sql.slice(start, index).trim();
      if (stripLeadingComments(statement).trim()) statements.push(statement);
      start = index + 1;
    }
  }

  const tail = sql.slice(start).trim();
  if (stripLeadingComments(tail).trim()) statements.push(tail);
  return statements;
}
