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
    title: "Reading the Resident Records",
    description:
      "The `record_fields` catalogue names every record-book in the city, one field inside it, and what that field stores. List each `field` and what it `stores` for the `resident` book, in alphabetical order by `field`.",
    sampleColumns: ["field", "stores"],
    sampleRows: [
      ["sample_field_a", "text"],
      ["sample_field_b", "integer"],
    ],
    ordered: true,
    hints: ["Keep the rows where `book` = 'resident', return `field` and `stores`, and sort by `field`."],
    schema: [
      {
        name: "record_fields",
        columns: [
          { name: "book", type: txt, note: "which record-book this field belongs to" },
          { name: "field", type: txt, note: "a field inside that book" },
          { name: "stores", type: txt, note: "the kind of value the field stores" },
          { name: "is_key", type: bool },
        ],
        sampleRows: [
          ["resident", "resident_id", "integer", true],
          ["resident", "full_name", "text", false],
          ["shelter", "capacity", "integer", false],
        ],
      },
    ],
    starterSql: "SELECT field, stores\nFROM record_fields\nORDER BY field;",
    canonicalSolution:
      "SELECT field, stores\nFROM record_fields\nWHERE book = 'resident'\nORDER BY field;",
    acceptedVariants: [
      "SELECT r.field, r.stores FROM record_fields AS r WHERE r.book = 'resident' ORDER BY 1;",
      "SELECT field, stores FROM record_fields WHERE book ILIKE 'resident' ORDER BY field ASC;",
    ],
    status: "drafted",
  },
  {
    id: 2,
    title: "Keys to the Bus Bay",
    description:
      "A field's `tag` shows if it can pick out one record alone: `'main'` is the official identifier, `'spare'` also works alone, `'none'` can't. For the `bus` book, list every `field` tagged `'main'` or `'spare'`, alphabetically.",
    sampleColumns: ["field"],
    sampleRows: [["sample_field_1"], ["sample_field_2"]],
    ordered: true,
    hints: ["Filter to `book` = 'bus' and `tag` in ('main', 'spare'), then sort by `field`."],
    schema: [
      {
        name: "id_tags",
        columns: [
          { name: "book", type: txt, note: "which record-book this field belongs to" },
          { name: "field", type: txt },
          { name: "tag", type: txt, note: "main | spare | none" },
        ],
        sampleRows: [
          ["bus", "bus_id", "main"],
          ["bus", "plate_no", "spare"],
          ["bus", "colour", "none"],
        ],
      },
    ],
    starterSql: "SELECT field\nFROM id_tags\nWHERE book = 'bus'\nORDER BY field;",
    canonicalSolution:
      "SELECT field\nFROM id_tags\nWHERE book = 'bus'\n  AND tag IN ('main', 'spare')\nORDER BY field;",
    acceptedVariants: [
      "SELECT field FROM id_tags WHERE book = 'bus' AND (tag = 'main' OR tag = 'spare') ORDER BY field;",
      "SELECT field FROM id_tags WHERE book = 'bus' AND tag = ANY (ARRAY['main','spare']) ORDER BY 1;",
    ],
    status: "drafted",
  },
  {
    id: 3,
    title: "Tracing the Family Links",
    description:
      "Each row of `links` points from one record-book to another. List the `from_book` and `from_field` of every link whose `to_book` is `family`, sorted by both.",
    sampleColumns: ["from_book", "from_field"],
    sampleRows: [
      ["sample_book", "sample_field"],
      ["sample_book_2", "sample_field_2"],
    ],
    ordered: true,
    hints: ["Keep the rows where `to_book` = 'family', then sort by `from_book`, then `from_field`."],
    schema: [
      {
        name: "links",
        columns: [
          { name: "from_book", type: txt, note: "the record-book the link starts at" },
          { name: "from_field", type: txt, note: "the field that points away" },
          { name: "to_book", type: txt, note: "the record-book it points to" },
          { name: "to_field", type: txt },
        ],
        sampleRows: [
          ["ration_cards", "family_id", "family", "id"],
          ["residents", "family_id", "family", "id"],
          ["families", "ward", "ward", "id"],
        ],
      },
    ],
    starterSql: "SELECT from_book, from_field\nFROM links\nORDER BY from_book, from_field;",
    canonicalSolution:
      "SELECT from_book, from_field\nFROM links\nWHERE to_book = 'family'\nORDER BY from_book, from_field;",
    acceptedVariants: [
      "SELECT from_book, from_field FROM links WHERE to_book = 'family' ORDER BY 1, 2;",
      "SELECT l.from_book, l.from_field FROM links l WHERE l.to_book ILIKE 'family' ORDER BY l.from_book, l.from_field;",
    ],
    status: "drafted",
  },
  {
    id: 4,
    title: "Evidence of the Rebuild",
    description:
      "The `change_log` records every edit to the archives — some change a book's structure, others its contents. Show the `target` and `edit` for rows whose `change_type` is `structure`, newest `changed_at` first.",
    sampleColumns: ["target", "edit"],
    sampleRows: [
      ["sample_book", "built the book"],
      ["sample_field", "renamed a field"],
    ],
    ordered: true,
    hints: ["Keep the rows where `change_type` = 'structure', then order by `changed_at` from newest to oldest."],
    schema: [
      {
        name: "change_log",
        columns: [
          { name: "edit", type: txt, note: "what was done, e.g. built the book, added records" },
          { name: "target", type: txt, note: "the record-book affected" },
          { name: "change_type", type: txt, note: "structure: changes the book's shape; contents: changes its records" },
          { name: "changed_at", type: "timestamp" },
        ],
        sampleRows: [
          ["built the book", "shelters", "structure", "2042-01-02 10:00:00"],
          ["renamed a field", "pumps", "structure", "2042-01-03 10:00:00"],
          ["added records", "residents", "contents", "2042-01-04 10:00:00"],
        ],
      },
    ],
    starterSql: "SELECT target, edit\nFROM change_log\nORDER BY changed_at DESC;",
    canonicalSolution:
      "SELECT target, edit\nFROM change_log\nWHERE change_type = 'structure'\nORDER BY changed_at DESC;",
    acceptedVariants: [
      "SELECT target, edit FROM change_log WHERE change_type = 'structure' ORDER BY changed_at DESC NULLS LAST;",
      "SELECT l.target, l.edit FROM change_log l WHERE l.change_type ILIKE 'structure' ORDER BY l.changed_at DESC;",
    ],
    status: "drafted",
  },
  {
    id: 5,
    title: "Who Holds the Keys",
    description:
      "The `permissions` book records who may do what to each record-book. Show the `who` and `record_book` for every row where the `action` is `'read'` and it is `allowed`, sorted by both.",
    sampleColumns: ["who", "record_book"],
    sampleRows: [
      ["sample_person", "sample_book"],
      ["sample_person_2", "sample_book_2"],
    ],
    ordered: true,
    hints: ["Keep rows where `action` = 'read' and `allowed` is true, then sort by `who`, then `record_book`."],
    schema: [
      {
        name: "permissions",
        columns: [
          { name: "who", type: txt, note: "the person or role" },
          { name: "record_book", type: txt },
          { name: "action", type: txt, note: "read | write" },
          { name: "allowed", type: bool },
        ],
        sampleRows: [
          ["scout", "shelters", "read", true],
          ["porter", "crates", "read", false],
          ["builder", "repairs", "write", true],
        ],
      },
    ],
    starterSql: "SELECT who, record_book\nFROM permissions\nORDER BY who;",
    canonicalSolution:
      "SELECT who, record_book\nFROM permissions\nWHERE action = 'read'\n  AND allowed\nORDER BY who, record_book;",
    acceptedVariants: [
      "SELECT who, record_book FROM permissions WHERE action = 'read' AND allowed = true ORDER BY who, record_book;",
      "SELECT who, record_book FROM permissions WHERE allowed AND action ILIKE 'read' ORDER BY 1, 2;",
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
      "List every home ward represented by visiting pilgrims once, in alphabetical order.",
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
      "Find shops whose trade description mentions paper, regardless of capital letters. List the shop names alphabetically.",
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
      "Find unsealed vaults in wards D-1, D-3, or D-9. List their identification numbers in increasing order.",
    sampleColumns: ["vault_id"],
    sampleRows: [[900], [901]],
    ordered: true,
    hints: ["Keep rows where `ward_code` is in ('D-1','D-3','D-9') and `sealed` is false; sort by `vault_id`."],
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
      "Show the three most valuable finds with their coin values, most valuable first. When values match, arrange the item names alphabetically.",
    sampleColumns: ["item", "value_coins"],
    sampleRows: [
      ["Sample Relic", 999],
      ["Sample Coin", 998],
    ],
    ordered: true,
    hints: ["Order by `value_coins` descending, then `item` for ties, and keep the top three with `LIMIT 3`."],
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
      "Write each dish’s name in capital letters and give the number of characters in its notes. Arrange dishes alphabetically by their original names.",
    sampleColumns: ["dish_caps", "note_len"],
    sampleRows: [
      ["SAMPLE DISH", 42],
      ["ZETA CURRY", 17],
    ],
    ordered: true,
    hints: [
      "Use `upper(dish)` to capitalise the name and `length(notes)` to count characters.",
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
      "For each pump, combine its main and backup flows and round to the nearest whole number. Treat missing backup flow as zero; list pumps by identification number.",
    sampleColumns: ["pump_id", "total_flow"],
    sampleRows: [
      [500, 120],
      [501, 0],
    ],
    ordered: true,
    hints: [
      "Adding a missing `backup_lpm` gives nothing — replace it with 0 using `coalesce(backup_lpm, 0)`.",
      "Wrap the total in `round()` to get a whole number.",
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
      "Count the departures on each calendar day. Show each date and its departure total, earliest day first.",
    sampleColumns: ["date", "trains"],
    sampleRows: [
      ["1999-01-01", 9],
      ["1999-01-02", 4],
    ],
    ordered: true,
    hints: [
      "Convert `depart_at` to a date with `depart_at::date`.",
      "Group by that date and use `count(*)` for each group's total.",
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
      "For each crop, add the crates from every lot. Show the crop and its total, alphabetically by crop.",
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
      "Find disposal heaps containing more than 800 kilograms of recovered metal in total. List their heap numbers in increasing order.",
    sampleColumns: ["heap_no"],
    sampleRows: [["H-00"], ["H-99"]],
    ordered: true,
    hints: [
      "Group by `heap_no`, then filter the groups with `HAVING` (not `WHERE`).",
      "The limit applies to each heap's total: `HAVING sum(metal_kg) > 800`.",
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
      "For every bin, count parcels weighing at least 20 kilograms. Include bins with none; show bin names and their counts, alphabetically by bin.",
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
      "Show each line, rider, tap total, and placing. Within each line, highest totals come first; ties share a placing and skip subsequent places. Arrange by line, placing, then rider.",
    sampleColumns: ["line", "rider", "taps", "line_rank"],
    sampleRows: [
      ["Sample", "rider-a", 999, 1],
      ["Sample", "rider-b", 998, 2],
    ],
    ordered: true,
    hints: [
      "`RANK()` numbers rows while keeping every row in the output.",
      "Use `RANK() OVER (PARTITION BY line ORDER BY taps DESC)` so ties share a placing.",
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
      "Show each reading’s hour, signal, and preceding signal in time order. The first reading has no preceding value.",
    sampleColumns: ["hour", "signal", "prev_signal"],
    sampleRows: [
      [0, 55, null],
      [1, 60, 55],
    ],
    ordered: true,
    hints: [
      "`LAG(signal)` returns the `signal` from the previous row in order.",
      "Use `LAG(signal) OVER (ORDER BY hour)` so the previous row is the previous hour.",
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
      "Find wells deeper than the average well depth. Show their identification numbers and depths, deepest first; break ties by identification number.",
    sampleColumns: ["well_id", "depth_m"],
    sampleRows: [
      [700, 99.9],
      [701, 88.8],
    ],
    ordered: true,
    hints: [
      "Compute the average depth once, then compare each row against it.",
      "Put `(SELECT avg(depth_m) FROM wells)` in the `WHERE` clause to compare against.",
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
      "List each tower with its attached span numbers, including towers without spans. For those towers, leave the span missing; arrange alphabetically by tower name, then by span number.",
    sampleColumns: ["tower_name", "span_id"],
    sampleRows: [
      ["Sample North Tower", 10],
      ["Sample South Tower", null],
    ],
    ordered: true,
    hints: [
      "A `LEFT JOIN` from `towers` to `spans` on `tower_id` keeps every tower, even span-less ones.",
      "Sort by `tower_name`, then `span_id`; a tower with no span shows a missing `span_id`.",
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
