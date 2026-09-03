// Authoritative curriculum sequence for Dilli Khoj.
//
// This is the single source of truth for ruin ORDER and topic mapping. It mirrors
// docs/curriculum-map.md (Modules 1-8 of NST DBMS 2026) and must stay in lockstep
// with it. Progression, unlocks and the leaderboard's "first-time solved" count all
// read this order, so the DBMS topic-tree sequence cannot be lost or reshuffled by
// UI or world-building changes.
//
// NOTE: The product spec groups the 20 ruins into 7 districts, but the exact
// district boundaries are not yet defined in docs/. `district` is left null until
// the owner confirms the split; the linear `order` below is already authoritative.

export interface RuinTopic {
  /** 1-based progression order. Never reuse or reorder without updating the curriculum map. */
  order: number;
  /** Stable ruin id used by questions, fixtures and the judge. Equals `order` today. */
  id: number;
  /** In-world location name. */
  place: string;
  /** DBMS module (1-8) from the Topic Tree. */
  module: number;
  /** The learning target for this ruin. */
  target: string;
  /** Hints available: ruins 1-10 have one, 11-20 have two (product spec). */
  hints: 1 | 2;
  /** District grouping (1-7); null until the owner defines district boundaries. */
  district: number | null;
}

/** Module titles from the workbook sequence (docs/curriculum-map.md). */
export const MODULE_TITLES: Record<number, string> = {
  1: "Relational databases, schema, keys & constraints",
  2: "SQL command families (read-only DQL evidence)",
  3: "SELECT, filtering, LIKE/IN/EXISTS, LIMIT/OFFSET",
  4: "Numeric, date, string, null & aggregate functions",
  5: "GROUP BY, HAVING, CASE — grouped reasoning",
  6: "Window functions & analytics",
  7: "Subqueries (scalar, FROM, WHERE, correlated)",
  8: "Joins & set operations",
};

/** The 20 ruins in fixed progression order. Do not resequence. */
export const RUIN_SEQUENCE: readonly RuinTopic[] = [
  { order: 1, id: 1, place: "Purana Qila quarantine gate", module: 1, target: "Entity, attribute and schema", hints: 1, district: null },
  { order: 2, id: 2, place: "Kashmere Gate ISBT", module: 1, target: "Primary, candidate, unique and not-null keys", hints: 1, district: null },
  { order: 3, id: 3, place: "Nigambodh Ghat register", module: 1, target: "Foreign keys and referential integrity", hints: 1, district: null },
  { order: 4, id: 4, place: "Old Delhi records room", module: 2, target: "DDL and DML evidence via catalog and audit tables", hints: 1, district: null },
  { order: 5, id: 5, place: "Kotwali vault", module: 2, target: "TCL outcomes and DCL permissions via logs and grants", hints: 1, district: null },
  { order: 6, id: 6, place: "Chandni Chowk", module: 3, target: "SELECT and WHERE", hints: 1, district: 2 },
  { order: 7, id: 7, place: "Fatehpuri Masjid steps", module: 3, target: "DISTINCT", hints: 1, district: null },
  { order: 8, id: 8, place: "Chawri Bazaar lanes", module: 3, target: "LIKE, ILIKE and wildcards", hints: 1, district: null },
  { order: 9, id: 9, place: "Dariba Kalan", module: 3, target: "IN, EXISTS and logical operators", hints: 1, district: null },
  { order: 10, id: 10, place: "Chor Bazaar", module: 3, target: "ORDER BY, LIMIT and OFFSET", hints: 1, district: null },
  { order: 11, id: 11, place: "Karim's, Jama Masjid", module: 4, target: "String functions", hints: 2, district: null },
  { order: 12, id: 12, place: "Wazirabad water works", module: 4, target: "Numeric functions and null handling", hints: 2, district: null },
  { order: 13, id: 13, place: "Old Delhi station clock", module: 4, target: "Date functions and aggregation", hints: 2, district: null },
  { order: 14, id: 14, place: "Azadpur Mandi", module: 5, target: "GROUP BY and aggregates", hints: 2, district: null },
  { order: 15, id: 15, place: "Ghazipur landfill", module: 5, target: "Group filtering (HAVING encouraged; equivalents accepted)", hints: 2, district: null },
  { order: 16, id: 16, place: "Tihar sorting yard", module: 5, target: "CASE with grouping and aggregates", hints: 2, district: null },
  { order: 17, id: 17, place: "Rajiv Chowk interchange", module: 6, target: "ROW_NUMBER, RANK and DENSE_RANK", hints: 2, district: null },
  { order: 18, id: 18, place: "Ridge signal tower", module: 6, target: "LAG, LEAD and rolling comparison", hints: 2, district: null },
  { order: 19, id: 19, place: "Agrasen ki Baoli", module: 7, target: "Nested and correlated subqueries", hints: 2, district: null },
  { order: 20, id: 20, place: "Signature Bridge", module: 8, target: "Multi-table joins, join conditions and a set operation", hints: 2, district: null },
];

/** Total ruins in the game. */
export const TOTAL_RUINS = RUIN_SEQUENCE.length;

/** Look up a ruin by its stable id. */
export function ruinById(id: number): RuinTopic | undefined {
  return RUIN_SEQUENCE.find((ruin) => ruin.id === id);
}

/** The next ruin a player should tackle given how many they have solved, or null when finished. */
export function nextRuin(solvedCount: number): RuinTopic | null {
  return RUIN_SEQUENCE[solvedCount] ?? null;
}

// Compile-time guardrails: the sequence must stay contiguous and in order.
if (import.meta.env.DEV) {
  RUIN_SEQUENCE.forEach((ruin, index) => {
    if (ruin.order !== index + 1) {
      console.error(`Ruin sequence broken at index ${index}: order ${ruin.order} out of place.`);
    }
  });
}
