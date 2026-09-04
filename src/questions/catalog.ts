// Draft question catalog for all 20 ruins.
//
// Each entry follows docs/question-authoring.md: title (2-6 words), description
// (12-35 words stating exact rows/columns), sample output (fictional rows that
// cannot be confused with the real answer), and hints (<=20 words; one for ruins
// 1-10, two for 11-20). It also carries the schema browser tables, a starter query,
// the canonical solution and structurally different accepted variants.
//
// STATUS: ruin 6 is `live` (real visible + two hidden fixtures exist and the judge
// grades it). Ruins 1-5 and 7-20 are `drafted`: content is authored and reviewable,
// but the three data fixtures, computed expected rows, near-miss tests and the
// required blind human review are still the production step before they ship.
// Expected rows are intentionally NOT hand-written here — they must be COMPUTED by
// running the canonical solution against each fixture, never guessed.
//
// Modules 1-2 are taught read-only: their tables model catalog / audit / grant
// evidence so DQL alone exercises the concept without any writes or grants.

import { ruinSix } from "./ruin-six";
import { RUIN_SEQUENCE, type RuinTopic } from "../game/ruins";

export interface QuestionColumn {
  name: string;
  type: string;
  note?: string;
}

export type SampleValue = string | number | boolean | null;

export interface QuestionTable {
  name: string;
  columns: QuestionColumn[];
  /** A few illustrative source rows shown in the schema browser. Fictional
   *  examples of the table's shape — never the graded fixture or the answer. */
  sampleRows: SampleValue[][];
}

export interface RuinQuestion {
  id: number;
  /** 2-6 word in-world objective. */
  title: string;
  /** 12-35 words; states exactly which rows and columns to return. */
  description: string;
  /** Expected output column names shown in the sample. */
  sampleColumns: string[];
  /** Fictional example rows; never the real answer. */
  sampleRows: SampleValue[][];
  /** Whether output order is graded. */
  ordered: boolean;
  /** One hint for ruins 1-10, two for 11-20. */
  hints: string[];
  /** Tables shown in the schema browser. */
  schema: QuestionTable[];
  /** Query the editor opens with. */
  starterSql: string;
  /** One canonical passing solution (admin/vault only). */
  canonicalSolution: string;
  /** Structurally different solutions that must also pass. */
  acceptedVariants: string[];
  status: "live" | "drafted";
}

const bool = "boolean";
const int = "integer";
const txt = "text";

const QUESTIONS: RuinQuestion[] = [
  {
    id: 1,
    title: "Reading the Resident Schema",
    description:
      "The gate catalog lists every attribute of each entity. Return `attribute` and `data_type` for the `resident` entity, sorted by `attribute`.",
    sampleColumns: ["attribute", "data_type"],
    sampleRows: [
      ["sample_col_a", "text"],
      ["sample_col_b", "integer"],
    ],
    ordered: true,
    hints: ["An entity's attributes are just the rows where `entity` matches; filter then sort."],
    schema: [
      {
        name: "catalog_columns",
        columns: [
          { name: "entity", type: txt, note: "entity/table name" },
          { name: "attribute", type: txt, note: "column name" },
          { name: "data_type", type: txt },
          { name: "is_key", type: bool },
        ],
        sampleRows: [
          ["resident", "resident_id", "integer", true],
          ["resident", "full_name", "text", false],
          ["shelter", "capacity", "integer", false],
        ],
      },
    ],
    starterSql: "SELECT attribute, data_type\nFROM catalog_columns\nORDER BY attribute;",
    canonicalSolution:
      "SELECT attribute, data_type\nFROM catalog_columns\nWHERE entity = 'resident'\nORDER BY attribute;",
    acceptedVariants: [
      "SELECT c.attribute, c.data_type FROM catalog_columns AS c WHERE c.entity = 'resident' ORDER BY 1;",
      "SELECT attribute, data_type FROM catalog_columns WHERE entity ILIKE 'resident' ORDER BY attribute ASC;",
    ],
    status: "drafted",
  },
  {
    id: 2,
    title: "Keys to the Bus Bay",
    description:
      "Some attributes can identify a `bus` on their own. Return each `attribute` whose `key_kind` is `primary` or `candidate`. Sort by `attribute`.",
    sampleColumns: ["attribute"],
    sampleRows: [["sample_key_1"], ["sample_key_2"]],
    ordered: true,
    hints: ["A unique identifier is a primary or candidate key; match either with a set membership test."],
    schema: [
      {
        name: "column_keys",
        columns: [
          { name: "entity", type: txt },
          { name: "attribute", type: txt },
          { name: "key_kind", type: txt, note: "primary | candidate | unique | none" },
          { name: "nullable", type: bool },
        ],
        sampleRows: [
          ["bus", "bus_id", "primary", false],
          ["bus", "plate_no", "candidate", false],
          ["bus", "colour", "none", true],
        ],
      },
    ],
    starterSql: "SELECT attribute\nFROM column_keys\nWHERE entity = 'bus'\nORDER BY attribute;",
    canonicalSolution:
      "SELECT attribute\nFROM column_keys\nWHERE entity = 'bus'\n  AND key_kind IN ('primary', 'candidate')\nORDER BY attribute;",
    acceptedVariants: [
      "SELECT attribute FROM column_keys WHERE entity = 'bus' AND (key_kind = 'primary' OR key_kind = 'candidate') ORDER BY attribute;",
      "SELECT attribute FROM column_keys WHERE entity = 'bus' AND key_kind = ANY (ARRAY['primary','candidate']) ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 3,
    title: "Tracing the Family Links",
    description:
      "The register records foreign keys. List every reference that points at the `family` entity: return `child_entity` and `child_attribute`, ordered by both.",
    sampleColumns: ["child_entity", "child_attribute"],
    sampleRows: [
      ["sample_child", "sample_ref_col"],
      ["sample_child_2", "sample_ref_col_2"],
    ],
    ordered: true,
    hints: ["A foreign key that references `family` is a row whose parent entity is `family`."],
    schema: [
      {
        name: "foreign_keys",
        columns: [
          { name: "child_entity", type: txt },
          { name: "child_attribute", type: txt },
          { name: "parent_entity", type: txt },
          { name: "parent_attribute", type: txt },
        ],
        sampleRows: [
          ["ration_cards", "family_id", "family", "id"],
          ["residents", "family_id", "family", "id"],
          ["families", "ward", "ward", "id"],
        ],
      },
    ],
    starterSql: "SELECT child_entity, child_attribute\nFROM foreign_keys\nORDER BY child_entity, child_attribute;",
    canonicalSolution:
      "SELECT child_entity, child_attribute\nFROM foreign_keys\nWHERE parent_entity = 'family'\nORDER BY child_entity, child_attribute;",
    acceptedVariants: [
      "SELECT child_entity, child_attribute FROM foreign_keys WHERE parent_entity = 'family' ORDER BY 1, 2;",
      "SELECT fk.child_entity, fk.child_attribute FROM foreign_keys fk WHERE fk.parent_entity ILIKE 'family' ORDER BY fk.child_entity, fk.child_attribute;",
    ],
    status: "drafted",
  },
  {
    id: 4,
    title: "Evidence of the Rebuild",
    description:
      "The records room keeps a change log. Return `object_name` and `op` for every entry whose `op_kind` is `DDL`, newest first by `changed_at`.",
    sampleColumns: ["object_name", "op"],
    sampleRows: [
      ["sample_table", "CREATE TABLE"],
      ["sample_index", "ALTER TABLE"],
    ],
    ordered: true,
    hints: ["Data-definition changes are the `DDL` rows; filter on `op_kind`, then order by time descending."],
    schema: [
      {
        name: "change_log",
        columns: [
          { name: "op", type: txt, note: "e.g. CREATE TABLE, INSERT" },
          { name: "object_name", type: txt },
          { name: "op_kind", type: txt, note: "DDL | DML" },
          { name: "changed_at", type: "timestamp" },
        ],
        sampleRows: [
          ["CREATE TABLE", "shelters", "DDL", "2042-01-02 10:00:00"],
          ["ALTER TABLE", "pumps", "DDL", "2042-01-03 10:00:00"],
          ["INSERT", "residents", "DML", "2042-01-04 10:00:00"],
        ],
      },
    ],
    starterSql: "SELECT object_name, op\nFROM change_log\nORDER BY changed_at DESC;",
    canonicalSolution:
      "SELECT object_name, op\nFROM change_log\nWHERE op_kind = 'DDL'\nORDER BY changed_at DESC;",
    acceptedVariants: [
      "SELECT object_name, op FROM change_log WHERE op_kind = 'DDL' ORDER BY changed_at DESC NULLS LAST;",
      "SELECT l.object_name, l.op FROM change_log l WHERE l.op_kind ILIKE 'ddl' ORDER BY l.changed_at DESC;",
    ],
    status: "drafted",
  },
  {
    id: 5,
    title: "Who Holds the Keys",
    description:
      "List `grantee` and `object_name` where a `SELECT` privilege was granted (`granted` is true). Sort by `grantee`, then `object_name`.",
    sampleColumns: ["grantee", "object_name"],
    sampleRows: [
      ["sample_role", "sample_object"],
      ["sample_role_2", "sample_object_2"],
    ],
    ordered: true,
    hints: ["Only rows where the privilege is `SELECT` and the boolean `granted` is true count."],
    schema: [
      {
        name: "access_grants",
        columns: [
          { name: "grantee", type: txt, note: "role name" },
          { name: "object_name", type: txt },
          { name: "privilege", type: txt, note: "SELECT | INSERT | ..." },
          { name: "granted", type: bool },
        ],
        sampleRows: [
          ["scout", "shelters", "SELECT", true],
          ["porter", "crates", "SELECT", false],
          ["builder", "repairs", "INSERT", true],
        ],
      },
    ],
    starterSql: "SELECT grantee, object_name\nFROM access_grants\nORDER BY grantee;",
    canonicalSolution:
      "SELECT grantee, object_name\nFROM access_grants\nWHERE privilege = 'SELECT'\n  AND granted\nORDER BY grantee, object_name;",
    acceptedVariants: [
      "SELECT grantee, object_name FROM access_grants WHERE privilege = 'SELECT' AND granted = true ORDER BY grantee, object_name;",
      "SELECT grantee, object_name FROM access_grants WHERE granted AND privilege ILIKE 'select' ORDER BY 1, 2;",
    ],
    status: "drafted",
  },
  {
    // Ruin 6 is the live vertical slice; reuse its authored content verbatim.
    id: 6,
    title: ruinSix.title,
    description: ruinSix.description,
    sampleColumns: [...ruinSix.sampleColumns],
    sampleRows: ruinSix.sampleRows.map((row) => [...row]),
    ordered: true,
    hints: [...ruinSix.hints],
    schema: [
      {
        name: "stalls",
        columns: [
          { name: "stall_id", type: int, note: "primary key" },
          { name: "stall_name", type: txt },
          { name: "ward_code", type: txt },
          { name: "status", type: txt, note: "open | closed | NULL" },
          { name: "daily_rations", type: int },
        ],
        sampleRows: [
          [102, "Moonlight Grain", "K-7", "open", 28],
          [101, "Copper Kettle", "K-7", "closed", 0],
          [104, "Old Clock Spices", "K-7", null, 7],
        ],
      },
    ],
    starterSql: ruinSix.starterSql,
    canonicalSolution:
      "SELECT stall_id\nFROM stalls\nWHERE ward_code = 'K-7'\n  AND status = 'open'\nORDER BY stall_id;",
    acceptedVariants: [
      "SELECT stall_id FROM stalls WHERE status = 'open' AND ward_code = 'K-7' ORDER BY 1;",
      "SELECT s.stall_id FROM stalls s WHERE s.ward_code = 'K-7' AND s.status = 'open' ORDER BY s.stall_id ASC;",
    ],
    status: "live",
  },
  {
    id: 7,
    title: "Every Ward Represented",
    description:
      "Pilgrims gather on the steps. Return each distinct `home_ward` that appears in `pilgrims` — one row per ward — sorted by `home_ward`.",
    sampleColumns: ["home_ward"],
    sampleRows: [["W-00"], ["W-99"]],
    ordered: true,
    hints: ["Collapse repeated wards to one row each with `DISTINCT`."],
    schema: [
      {
        name: "pilgrims",
        columns: [
          { name: "name", type: txt },
          { name: "home_ward", type: txt },
          { name: "arrival_day", type: int },
        ],
        sampleRows: [
          ["Asha", "W-2", 1],
          ["Dev", "W-1", 2],
          ["Noor", null, 4],
        ],
      },
    ],
    starterSql: "SELECT home_ward\nFROM pilgrims\nORDER BY home_ward;",
    canonicalSolution: "SELECT DISTINCT home_ward\nFROM pilgrims\nORDER BY home_ward;",
    acceptedVariants: [
      "SELECT home_ward FROM pilgrims GROUP BY home_ward ORDER BY home_ward;",
      "SELECT DISTINCT home_ward FROM pilgrims ORDER BY 1 ASC;",
    ],
    status: "drafted",
  },
  {
    id: 8,
    title: "The Paper Traders",
    description:
      "Return `shop_name` for every shop whose `trade` mentions paper in any capitalisation. Sort by `shop_name`.",
    sampleColumns: ["shop_name"],
    sampleRows: [["Sample Stationers"], ["Zeta Scrolls"]],
    ordered: true,
    hints: ["Match anywhere in the text, case-insensitively, using wildcards around the word."],
    schema: [
      {
        name: "shops",
        columns: [
          { name: "shop_name", type: txt },
          { name: "trade", type: txt, note: "free text description" },
        ],
        sampleRows: [
          ["Scroll House", "handmade PAPER"],
          ["Paper Lantern", "lamps"],
          ["Ink Corner", "paper and ink"],
        ],
      },
    ],
    starterSql: "SELECT shop_name\nFROM shops\nORDER BY shop_name;",
    canonicalSolution: "SELECT shop_name\nFROM shops\nWHERE trade ILIKE '%paper%'\nORDER BY shop_name;",
    acceptedVariants: [
      "SELECT shop_name FROM shops WHERE lower(trade) LIKE '%paper%' ORDER BY shop_name;",
      "SELECT shop_name FROM shops WHERE trade ~* 'paper' ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 9,
    title: "Unsealed in the Silver Lane",
    description:
      "Return `vault_id` for vaults in ward `D-1`, `D-3`, or `D-9` that are not sealed (`sealed` is false). Sort by `vault_id`.",
    sampleColumns: ["vault_id"],
    sampleRows: [[900], [901]],
    ordered: true,
    hints: ["Combine a set-membership check on the ward with a negation of `sealed`."],
    schema: [
      {
        name: "vaults",
        columns: [
          { name: "vault_id", type: int, note: "primary key" },
          { name: "ward_code", type: txt },
          { name: "sealed", type: bool },
        ],
        sampleRows: [
          [11, "D-1", false],
          [15, "D-1", true],
          [17, null, false],
        ],
      },
    ],
    starterSql: "SELECT vault_id\nFROM vaults\nORDER BY vault_id;",
    canonicalSolution:
      "SELECT vault_id\nFROM vaults\nWHERE ward_code IN ('D-1', 'D-3', 'D-9')\n  AND NOT sealed\nORDER BY vault_id;",
    acceptedVariants: [
      "SELECT vault_id FROM vaults WHERE ward_code IN ('D-1','D-3','D-9') AND sealed = false ORDER BY vault_id;",
      "SELECT v.vault_id FROM vaults v WHERE NOT v.sealed AND v.ward_code = ANY (ARRAY['D-1','D-3','D-9']) ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 10,
    title: "The Three Richest Finds",
    description:
      "Return `item` and `value_coins` for the three most valuable finds, highest value first. Break ties by `item` ascending.",
    sampleColumns: ["item", "value_coins"],
    sampleRows: [
      ["Sample Relic", 999],
      ["Sample Coin", 998],
    ],
    ordered: true,
    hints: ["Order by value descending, add `item` as a tie-break, then keep only the top rows."],
    schema: [
      {
        name: "finds",
        columns: [
          { name: "item", type: txt },
          { name: "value_coins", type: int },
        ],
        sampleRows: [
          ["Amber lens", 90],
          ["Copper dial", 64],
          ["Worn buckle", 10],
        ],
      },
    ],
    starterSql: "SELECT item, value_coins\nFROM finds\nORDER BY value_coins DESC\nLIMIT 3;",
    canonicalSolution:
      "SELECT item, value_coins\nFROM finds\nORDER BY value_coins DESC, item\nLIMIT 3;",
    acceptedVariants: [
      "SELECT item, value_coins FROM finds ORDER BY value_coins DESC, item ASC FETCH FIRST 3 ROWS ONLY;",
      "SELECT item, value_coins FROM finds ORDER BY value_coins DESC, item OFFSET 0 LIMIT 3;",
    ],
    status: "drafted",
  },
  {
    id: 11,
    title: "Karim's Recipe Cards",
    description:
      "For each dish return its name upper-cased as `dish_caps` and the length of `notes` as `note_len`. Sort by `dish`.",
    sampleColumns: ["dish_caps", "note_len"],
    sampleRows: [
      ["SAMPLE DISH", 42],
      ["ZETA CURRY", 17],
    ],
    ordered: true,
    hints: [
      "String functions transform each value: one upper-cases text, another counts characters.",
      "Alias the two computed columns exactly as `dish_caps` and `note_len`.",
    ],
    schema: [
      {
        name: "recipes",
        columns: [
          { name: "dish", type: txt },
          { name: "notes", type: txt },
        ],
        sampleRows: [
          ["dal", "Stir gently"],
          ["chai", null],
          ["rice", "नींबू"],
        ],
      },
    ],
    starterSql: "SELECT dish, notes\nFROM recipes\nORDER BY dish;",
    canonicalSolution:
      "SELECT upper(dish) AS dish_caps, length(notes) AS note_len\nFROM recipes\nORDER BY dish;",
    acceptedVariants: [
      "SELECT upper(dish) AS dish_caps, char_length(notes) AS note_len FROM recipes ORDER BY dish;",
      "SELECT upper(r.dish) AS dish_caps, length(r.notes) AS note_len FROM recipes r ORDER BY r.dish ASC;",
    ],
    status: "drafted",
  },
  {
    id: 12,
    title: "Total Flow at Wazirabad",
    description:
      "Return `pump_id` and the rounded combined flow `litres_per_min + backup_lpm` as `total_flow`, treating a missing `backup_lpm` as zero. Sort by `pump_id`.",
    sampleColumns: ["pump_id", "total_flow"],
    sampleRows: [
      [500, 120],
      [501, 0],
    ],
    ordered: true,
    hints: [
      "A null backup would poison the sum; replace it with zero first.",
      "Round the total to a whole number with a numeric function.",
    ],
    schema: [
      {
        name: "pumps",
        columns: [
          { name: "pump_id", type: int, note: "primary key" },
          { name: "litres_per_min", type: "numeric" },
          { name: "backup_lpm", type: "numeric", note: "may be NULL" },
        ],
        sampleRows: [
          [1, 12.4, null],
          [2, 10.25, 0.25],
          [3, 0, 0],
        ],
      },
    ],
    starterSql: "SELECT pump_id, litres_per_min, backup_lpm\nFROM pumps\nORDER BY pump_id;",
    canonicalSolution:
      "SELECT pump_id, round(litres_per_min + coalesce(backup_lpm, 0)) AS total_flow\nFROM pumps\nORDER BY pump_id;",
    acceptedVariants: [
      "SELECT pump_id, round(litres_per_min + COALESCE(backup_lpm, 0.0)) AS total_flow FROM pumps ORDER BY 1;",
      "SELECT pump_id, round(litres_per_min + CASE WHEN backup_lpm IS NULL THEN 0 ELSE backup_lpm END) AS total_flow FROM pumps ORDER BY pump_id;",
    ],
    status: "drafted",
  },
  {
    id: 13,
    title: "Departures by Day",
    description:
      "From `departures`, return each calendar `date` of `depart_at` and the count of trains that day as `trains`. Sort by `date`.",
    sampleColumns: ["date", "trains"],
    sampleRows: [
      ["1999-01-01", 9],
      ["1999-01-02", 4],
    ],
    ordered: true,
    hints: [
      "Reduce each timestamp to its date before grouping.",
      "Group by that date and count the rows in each group.",
    ],
    schema: [
      {
        name: "departures",
        columns: [
          { name: "train", type: txt },
          { name: "depart_at", type: "timestamp" },
        ],
        sampleRows: [
          ["A", "2042-02-01 23:59:00"],
          ["B", "2042-02-02 00:00:00"],
          ["C", null],
        ],
      },
    ],
    starterSql: "SELECT depart_at\nFROM departures\nORDER BY depart_at;",
    canonicalSolution:
      "SELECT depart_at::date AS date, count(*) AS trains\nFROM departures\nGROUP BY depart_at::date\nORDER BY date;",
    acceptedVariants: [
      "SELECT CAST(depart_at AS date) AS date, count(*) AS trains FROM departures GROUP BY 1 ORDER BY 1;",
      "WITH days AS (SELECT depart_at::date AS date FROM departures) SELECT date, count(*) AS trains FROM days GROUP BY date ORDER BY date;",
    ],
    status: "drafted",
  },
  {
    id: 14,
    title: "Crates at Azadpur Mandi",
    description:
      "Return each `crop` and its total `crates` as `total_crates` across all lots. Sort by `crop`.",
    sampleColumns: ["crop", "total_crates"],
    sampleRows: [
      ["sample-crop", 1200],
      ["zeta-grain", 8],
    ],
    ordered: true,
    hints: [
      "One output row per crop means grouping by crop.",
      "Sum the crates within each group.",
    ],
    schema: [
      {
        name: "lots",
        columns: [
          { name: "crop", type: txt },
          { name: "crates", type: int },
        ],
        sampleRows: [
          ["rice", 7],
          ["rice", 7],
          ["millet", 3],
        ],
      },
    ],
    starterSql: "SELECT crop, crates\nFROM lots\nORDER BY crop;",
    canonicalSolution:
      "SELECT crop, sum(crates) AS total_crates\nFROM lots\nGROUP BY crop\nORDER BY crop;",
    acceptedVariants: [
      "SELECT crop, sum(crates) AS total_crates FROM lots GROUP BY 1 ORDER BY 1;",
      "SELECT l.crop, sum(l.crates) AS total_crates FROM lots l GROUP BY l.crop ORDER BY l.crop ASC;",
    ],
    status: "drafted",
  },
  {
    id: 15,
    title: "Heaps Above the Line",
    description:
      "Return `heap_no` for disposal heaps whose total recovered `metal_kg` exceeds 800. Sort by `heap_no`. `HAVING` is the intended lesson.",
    sampleColumns: ["heap_no"],
    sampleRows: [["H-00"], ["H-99"]],
    ordered: true,
    hints: [
      "Filter the groups after they are formed, not the individual rows.",
      "The threshold applies to the summed metal per heap.",
    ],
    schema: [
      {
        name: "heaps",
        columns: [
          { name: "heap_no", type: txt },
          { name: "metal_kg", type: "numeric" },
        ],
        sampleRows: [
          ["H-A", 500],
          ["H-B", 800],
          ["H-E", 1000],
        ],
      },
    ],
    starterSql: "SELECT heap_no, metal_kg\nFROM heaps\nORDER BY heap_no;",
    canonicalSolution:
      "SELECT heap_no\nFROM heaps\nGROUP BY heap_no\nHAVING sum(metal_kg) > 800\nORDER BY heap_no;",
    acceptedVariants: [
      "SELECT heap_no FROM (SELECT heap_no, sum(metal_kg) AS t FROM heaps GROUP BY heap_no) s WHERE t > 800 ORDER BY heap_no;",
      "SELECT heap_no FROM heaps GROUP BY heap_no HAVING sum(metal_kg) > 800.0 ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 16,
    title: "Heavy Parcels per Bin",
    description:
      "For each `bin`, return the count of parcels weighing at least 20 kg as `heavy_count`. Sort by `bin`. Try `CASE`; equivalent queries work too.",
    sampleColumns: ["bin", "heavy_count"],
    sampleRows: [
      ["BIN-0", 5],
      ["BIN-9", 0],
    ],
    ordered: true,
    hints: [
      "Turn each parcel into 1 when heavy and 0 otherwise with `CASE`.",
      "Summing those flags per bin gives the heavy count.",
    ],
    schema: [
      {
        name: "parcels",
        columns: [
          { name: "bin", type: txt },
          { name: "weight_kg", type: "numeric" },
        ],
        sampleRows: [
          ["B-A", 20],
          ["B-A", 19.9],
          ["B-C", 40],
        ],
      },
    ],
    starterSql: "SELECT bin, weight_kg\nFROM parcels\nORDER BY bin;",
    canonicalSolution:
      "SELECT bin, sum(CASE WHEN weight_kg >= 20 THEN 1 ELSE 0 END) AS heavy_count\nFROM parcels\nGROUP BY bin\nORDER BY bin;",
    acceptedVariants: [
      "SELECT bin, count(*) FILTER (WHERE weight_kg >= 20) AS heavy_count FROM parcels GROUP BY bin ORDER BY bin;",
      "SELECT bin, sum(CASE WHEN weight_kg >= 20 THEN 1 ELSE 0 END) AS heavy_count FROM parcels GROUP BY 1 ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 17,
    title: "Ranking the Rush",
    description:
      "Return `line`, `rider`, `taps` and `line_rank`: rank descending taps within each line, sharing ranks for ties and leaving gaps. Sort by `line`, `line_rank`, then `rider`.",
    sampleColumns: ["line", "rider", "taps", "line_rank"],
    sampleRows: [
      ["Sample", "rider-a", 999, 1],
      ["Sample", "rider-b", 998, 2],
    ],
    ordered: true,
    hints: [
      "A window function ranks rows without collapsing them.",
      "Partition by `line` and order by `taps` descending so ties share a rank.",
    ],
    schema: [
      {
        name: "riders",
        columns: [
          { name: "line", type: txt },
          { name: "rider", type: txt },
          { name: "taps", type: int },
        ],
        sampleRows: [
          ["Blue", "Mira", 40],
          ["Blue", "Adi", 40],
          ["Gold", "Noor", 25],
        ],
      },
    ],
    starterSql: "SELECT line, rider, taps\nFROM riders\nORDER BY line, taps DESC;",
    canonicalSolution:
      "SELECT line, rider, taps,\n       RANK() OVER (PARTITION BY line ORDER BY taps DESC) AS line_rank\nFROM riders\nORDER BY line, line_rank, rider;",
    acceptedVariants: [
      "SELECT line, rider, taps, rank() OVER w AS line_rank FROM riders WINDOW w AS (PARTITION BY line ORDER BY taps DESC) ORDER BY line, line_rank, rider;",
      "SELECT r.line, r.rider, r.taps, RANK() OVER (PARTITION BY r.line ORDER BY r.taps DESC) AS line_rank FROM riders r ORDER BY 1, 4, 2;",
    ],
    status: "drafted",
  },
  {
    id: 18,
    title: "The Previous Signal",
    description:
      "Return `hour`, `signal`, and the previous reading's `signal` as `prev_signal` (null for the first), ordered by `hour`.",
    sampleColumns: ["hour", "signal", "prev_signal"],
    sampleRows: [
      [0, 55, null],
      [1, 60, 55],
    ],
    ordered: true,
    hints: [
      "A window function can look back one row in an ordered sequence.",
      "Order the window by `hour` so the previous row is the previous hour.",
    ],
    schema: [
      {
        name: "readings",
        columns: [
          { name: "hour", type: int },
          { name: "signal", type: int },
        ],
        sampleRows: [
          [0, 10],
          [1, 20],
          [3, null],
        ],
      },
    ],
    starterSql: "SELECT hour, signal\nFROM readings\nORDER BY hour;",
    canonicalSolution:
      "SELECT hour, signal,\n       LAG(signal) OVER (ORDER BY hour) AS prev_signal\nFROM readings\nORDER BY hour;",
    acceptedVariants: [
      "SELECT hour, signal, lag(signal, 1) OVER (ORDER BY hour) AS prev_signal FROM readings ORDER BY hour;",
      "SELECT r.hour, r.signal, LAG(r.signal) OVER (ORDER BY r.hour ASC) AS prev_signal FROM readings r ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 19,
    title: "Deeper than Average",
    description:
      "Return `well_id` and `depth_m` for every well deeper than the average well depth. Sort by `depth_m` descending, then `well_id`.",
    sampleColumns: ["well_id", "depth_m"],
    sampleRows: [
      [700, 99.9],
      [701, 88.8],
    ],
    ordered: true,
    hints: [
      "Compute the average depth once, then compare each row against it.",
      "A scalar subquery in the `WHERE` clause returns that single average.",
    ],
    schema: [
      {
        name: "wells",
        columns: [
          { name: "well_id", type: int, note: "primary key" },
          { name: "depth_m", type: "numeric" },
        ],
        sampleRows: [
          [1, 10],
          [3, 40],
          [5, null],
        ],
      },
    ],
    starterSql: "SELECT well_id, depth_m\nFROM wells\nORDER BY depth_m DESC, well_id;",
    canonicalSolution:
      "SELECT well_id, depth_m\nFROM wells\nWHERE depth_m > (SELECT avg(depth_m) FROM wells)\nORDER BY depth_m DESC, well_id;",
    acceptedVariants: [
      "SELECT w.well_id, w.depth_m FROM wells w WHERE w.depth_m > (SELECT avg(depth_m) FROM wells) ORDER BY 2 DESC, 1;",
      "WITH a AS (SELECT avg(depth_m) AS m FROM wells) SELECT well_id, depth_m FROM wells, a WHERE depth_m > a.m ORDER BY depth_m DESC, well_id;",
    ],
    status: "drafted",
  },
  {
    id: 20,
    title: "Spans and Their Towers",
    description:
      "Return `tower_name` and `span_id` for each anchored span, plus unoccupied towers with null `span_id`. Sort by `tower_name`, then `span_id`. Try joins and `UNION`; equivalent queries work too.",
    sampleColumns: ["tower_name", "span_id"],
    sampleRows: [
      ["Sample North Tower", 10],
      ["Sample South Tower", null],
    ],
    ordered: true,
    hints: [
      "First inner-join spans to their tower on the shared key.",
      "A set operation appends the towers with no matching span; check with `NOT EXISTS`.",
    ],
    schema: [
      {
        name: "spans",
        columns: [
          { name: "span_id", type: int, note: "primary key" },
          { name: "tower_id", type: int, note: "-> towers.tower_id" },
        ],
        sampleRows: [
          [1, 1],
          [2, 1],
          [4, null],
        ],
      },
      {
        name: "towers",
        columns: [
          { name: "tower_id", type: int, note: "primary key" },
          { name: "tower_name", type: txt },
        ],
        sampleRows: [
          [1, "North"],
          [2, "East"],
          [3, "West"],
        ],
      },
    ],
    starterSql:
      "SELECT t.tower_name, s.span_id\nFROM towers t\nJOIN spans s ON s.tower_id = t.tower_id\nORDER BY t.tower_name, s.span_id;",
    canonicalSolution:
      "SELECT t.tower_name, s.span_id\nFROM towers t\nJOIN spans s ON s.tower_id = t.tower_id\nUNION\nSELECT t.tower_name, NULL\nFROM towers t\nWHERE NOT EXISTS (SELECT 1 FROM spans s WHERE s.tower_id = t.tower_id)\nORDER BY tower_name, span_id;",
    acceptedVariants: [
      "SELECT t.tower_name, s.span_id FROM towers t LEFT JOIN spans s ON s.tower_id = t.tower_id ORDER BY t.tower_name, s.span_id;",
      "SELECT t.tower_name, s.span_id FROM spans s JOIN towers t USING (tower_id) UNION SELECT tower_name, NULL FROM towers WHERE tower_id NOT IN (SELECT tower_id FROM spans WHERE tower_id IS NOT NULL) ORDER BY 1, 2;",
    ],
    status: "drafted",
  },
];

/** All 20 draft questions keyed by ruin id. */
export const RUIN_QUESTIONS: readonly RuinQuestion[] = QUESTIONS;

export function questionById(id: number): RuinQuestion | undefined {
  return QUESTIONS.find((q) => q.id === id);
}

/** A question joined with its curriculum topic, for admin/authoring views. */
export interface RuinEntry {
  topic: RuinTopic;
  question: RuinQuestion;
}

export const RUIN_ENTRIES: readonly RuinEntry[] = RUIN_SEQUENCE.map((topic) => {
  const question = questionById(topic.id);
  if (!question) throw new Error(`No drafted question for ruin ${topic.id}.`);
  return { topic, question };
});

// Dev guardrails: every ruin has a question, and hint counts follow the spec.
if (import.meta.env.DEV) {
  for (const { topic, question } of RUIN_ENTRIES) {
    if (question.hints.length !== topic.hints) {
      console.error(
        `Ruin ${topic.id}: expected ${topic.hints} hint(s) for its band, found ${question.hints.length}.`,
      );
    }
    const words = question.description.trim().split(/\s+/).length;
    if (words > 35) console.error(`Ruin ${topic.id}: description is ${words} words (max 35).`);
  }
}
