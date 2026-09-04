// Authoring-only fixtures. Only case 0 is exported to the browser.
// Cases 1 and 2 are regression cases, not yet deployed server judge fixtures.
export function fixtureTables(id, variant) {
  const n = variant * 100;
  const label = (text) => `${text}${variant ? `-${variant}` : ""}`;
  const tables = {
    1: { catalog_columns: [
      ["resident", label("resident_id"), "integer", true],
      ["resident", label("name"), "text", false],
      ["shelter", label("capacity"), "integer", false],
      ["resident", label("home_id"), "integer", false],
      [null, label("unknown"), "text", false],
    ] },
    2: { column_keys: [
      ["bus", label("bus_id"), "primary", false],
      ["bus", label("registration"), "candidate", false],
      ["bus", label("radio_code"), "unique", true],
      ["bus", label("colour"), "none", false],
      ["driver", label("licence"), "candidate", false],
      ["bus", label("unknown"), null, true],
    ] },
    3: { foreign_keys: [
      [label("residents"), "family_id", "family", "id"],
      [label("ration_cards"), "household", "family", "id"],
      [label("residents"), "shelter_id", "shelter", "id"],
      [label("families"), "ward", "ward", "id"],
    ] },
    4: { change_log: [
      ["CREATE TABLE", label("shelters"), "DDL", "2042-01-02 10:00:00"],
      ["INSERT", label("residents"), "DML", "2042-01-04 10:00:00"],
      ["ALTER TABLE", label("pumps"), "DDL", "2042-01-03 10:00:00"],
      ["UPDATE", label("pumps"), "DML", null],
    ] },
    5: { access_grants: [
      [label("scout"), "shelters", "SELECT", true],
      [label("archivist"), "records", "SELECT", true],
      [label("archivist"), "maps", "SELECT", true],
      [label("porter"), "crates", "SELECT", false],
      [label("builder"), "repairs", "INSERT", true],
      [label("unknown"), "maps", "SELECT", null],
    ] },
    6: { stalls: [
      [101+n, "Copper Kettle", "K-7", "closed", 0],
      [102+n, "Moonlight Grain", "K-7", "open", 28],
      [103+n, "Red Fort Repairs", "K-4", "open", 12],
      [104+n, "Old Clock Spices", "K-7", null, 7],
      [105+n, "Yamuna Filters", "K-9", "open", 19],
      [107+n, "Paranthe Power", "K-7", "open", 31],
    ] },
    7: { pilgrims: [
      ["Asha", label("W-2"), 1], ["Dev", label("W-1"), 2],
      ["Mira", label("W-2"), 3], ["Noor", null, 4], ["Adi", null, 5],
    ] },
    8: { shops: [
      [label("Scroll House"), "handmade PAPER"],
      [label("Paper Lantern"), "lamps"],
      [label("Ink Corner"), "paper and ink"],
      [label("Lost Ledger"), null], [label("Wrapping Works"), "wastepaper"],
    ] },
    9: { vaults: [
      [11+n, "D-1", false], [12+n, "D-3", false], [13+n, "D-9", false],
      [14+n, "D-2", false], [15+n, "D-1", true], [16+n, "D-3", null],
      [17+n, null, false],
    ] },
    10: { finds: [
      [label("Zinc compass"), 90+n], [label("Amber lens"), 90+n],
      [label("Tin whistle"), 90+n], [label("Copper dial"), 90+n],
      [label("Worn buckle"), 10+n],
    ] },
    11: { recipes: [
      [label("dal"), "Stir gently"], [label("chai"), null],
      [label("roti"), ""], [label("rice"), "नींबू"],
    ] },
    12: { pumps: [
      [1+n, 12.4, null], [2+n, 10.25, 0.25], [3+n, 0, 0],
      [4+n, null, 7.5], [5+n, 8.6, -1.2],
    ] },
    13: { departures: [
      ["A", `2042-02-0${variant+1} 23:59:00`],
      [null, `2042-02-0${variant+1} 01:00:00`],
      ["B", `2042-02-0${variant+2} 00:00:00`], ["C", null],
    ] },
    14: { lots: [
      [label("rice"), 7], [label("rice"), 7], [label("rice"), null],
      [label("millet"), 3], [label("millet"), -1], [label("beans"), null],
    ] },
    15: { heaps: [
      [label("H-A"), 500], [label("H-A"), 400],
      [label("H-B"), 800], [label("H-C"), 801],
      [label("H-D"), null], [label("H-E"), 1000], [label("H-E"), -300],
    ] },
    16: { parcels: [
      [label("B-A"), 20], [label("B-A"), 21], [label("B-A"), 19.9],
      [label("B-B"), 3], [label("B-B"), null], [label("B-C"), 40],
    ] },
    17: { riders: [
      [label("Blue"), "Mira", 40], [label("Blue"), "Adi", 40],
      [label("Blue"), "Dev", 20], [label("Gold"), "Noor", 25],
      [label("Gold"), "Tara", 10],
    ] },
    18: { readings: [[2+n, 30], [0+n, 10], [3+n, null], [1+n, 20], [4+n, 40]] },
    19: { wells: [[1+n, 10], [2+n, 20], [3+n, 40], [4+n, 40], [5+n, null]] },
    20: {
      spans: [[1+n, 1+n], [2+n, 1+n], [3+n, 2+n], [4+n, null]],
      towers: [[1+n, label("North")], [2+n, label("East")], [3+n, label("West")]],
    },
  };
  const result = tables[id];
  if (!result) throw new Error(`No fixture for ruin ${id}`);
  // Vary insertion order as well as values; case 2 changes the distribution.
  for (const rows of Object.values(result)) {
    if (variant) rows.reverse();
    if (variant === 2) rows.splice(1, 1);
  }
  return result;
}

export function fixtureSql(question, variant) {
  const tables = fixtureTables(question.id, variant);
  return question.schema.map((table) => {
    const columns = table.columns.map((column) => `"${column.name}" ${column.type}`).join(", ");
    const rows = tables[table.name].map((row) => `(${row.map(literal).join(", ")})`).join(",\n");
    return `CREATE TABLE "${table.name}" (${columns});\nINSERT INTO "${table.name}" VALUES\n${rows};`;
  }).join("\n");
}

function literal(value) {
  if (value === null) return "NULL";
  if (typeof value !== "string") return String(value);
  return `'${value.replaceAll("'", "''")}'`;
}
