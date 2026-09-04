import { PGlite } from "@electric-sql/pglite";
import { fixtureSql } from "./practice-fixtures.mjs";
import { tabular } from "./practice-content.mjs";
// Two distinct, curriculum-matched objectives per ruin. SQL remains authoring-only.
const objectives = [
  [
    "Return attribute and data_type for shelter attributes, sorted by attribute.",
    "SELECT attribute,data_type FROM catalog_columns WHERE entity='shelter' ORDER BY attribute",
    "Return entity and attribute for key attributes, sorted by entity and attribute.",
    "SELECT entity,attribute FROM catalog_columns WHERE is_key ORDER BY entity,attribute",
  ],
  [
    "Return attribute for nullable bus attributes, sorted by attribute.",
    "SELECT attribute FROM column_keys WHERE entity='bus' AND nullable ORDER BY attribute",
    "Return attribute for non-nullable bus attributes with no key, sorted by attribute.",
    "SELECT attribute FROM column_keys WHERE entity='bus' AND NOT nullable AND key_kind='none' ORDER BY attribute",
  ],
  [
    "Return child_entity and child_attribute for references to shelter, sorted by both columns.",
    "SELECT child_entity,child_attribute FROM foreign_keys WHERE parent_entity='shelter' ORDER BY child_entity,child_attribute",
    "Return child_entity and child_attribute for references to ward, sorted by both columns.",
    "SELECT child_entity,child_attribute FROM foreign_keys WHERE parent_entity='ward' ORDER BY child_entity,child_attribute",
  ],
  [
    "Return object_name and op for DML entries, newest first with missing timestamps last.",
    "SELECT object_name,op FROM change_log WHERE op_kind='DML' ORDER BY changed_at DESC NULLS LAST",
    "Return object_name and op for CREATE TABLE entries, sorted by object_name.",
    "SELECT object_name,op FROM change_log WHERE op='CREATE TABLE' ORDER BY object_name",
  ],
  [
    "Return grantee and object_name for explicitly revoked SELECT privileges, sorted by both columns.",
    "SELECT grantee,object_name FROM access_grants WHERE privilege='SELECT' AND granted=false ORDER BY grantee,object_name",
    "Return grantee and object_name for granted INSERT privileges, sorted by both columns.",
    "SELECT grantee,object_name FROM access_grants WHERE privilege='INSERT' AND granted ORDER BY grantee,object_name",
  ],
  [
    "Return stall_id for closed K-7 stalls, sorted by stall_id.",
    "SELECT stall_id FROM stalls WHERE ward_code='K-7' AND status='closed' ORDER BY stall_id",
    "Return stall_id for open stalls outside K-7, sorted by stall_id.",
    "SELECT stall_id FROM stalls WHERE ward_code<>'K-7' AND status='open' ORDER BY stall_id",
  ],
  [
    "Return distinct non-null home_ward values among pilgrims arriving after day 2, sorted by home_ward.",
    "SELECT DISTINCT home_ward FROM pilgrims WHERE arrival_day>2 AND home_ward IS NOT NULL ORDER BY home_ward",
    "Return distinct non-null home_ward values among pilgrims arriving before day 3, sorted by home_ward descending.",
    "SELECT DISTINCT home_ward FROM pilgrims WHERE arrival_day<3 AND home_ward IS NOT NULL ORDER BY home_ward DESC",
  ],
  [
    "Return shop_name for shops whose name begins with Paper, case-insensitively, sorted by shop_name.",
    "SELECT shop_name FROM shops WHERE shop_name ILIKE 'paper%' ORDER BY shop_name",
    "Return shop_name for shops whose trade ends with ink, case-insensitively, sorted by shop_name.",
    "SELECT shop_name FROM shops WHERE trade ILIKE '%ink' ORDER BY shop_name",
  ],
  [
    "Return vault_id for sealed vaults in D-1 or D-3, sorted by vault_id.",
    "SELECT vault_id FROM vaults WHERE ward_code IN ('D-1','D-3') AND sealed ORDER BY vault_id",
    "Return vault_id for unsealed vaults outside D-1, D-3 and D-9, sorted by vault_id.",
    "SELECT vault_id FROM vaults WHERE ward_code NOT IN ('D-1','D-3','D-9') AND NOT sealed ORDER BY vault_id",
  ],
  [
    "Return item and value_coins for the second and third most valuable finds; break value ties by item ascending.",
    "SELECT item,value_coins FROM finds ORDER BY value_coins DESC,item LIMIT 2 OFFSET 1",
    "Return item and value_coins for the two least valuable finds; break value ties by item ascending.",
    "SELECT item,value_coins FROM finds ORDER BY value_coins,item LIMIT 2",
  ],
  [
    "Return dish and lower-cased notes as notes_lower, sorted by dish.",
    "SELECT dish,lower(notes) AS notes_lower FROM recipes ORDER BY dish",
    "Return dish and the first three note characters as note_start, sorted by dish.",
    "SELECT dish,substring(notes,1,3) AS note_start FROM recipes ORDER BY dish",
  ],
  [
    "Return pump_id and absolute backup flow as backup_flow, treating missing backup as zero, sorted by pump_id.",
    "SELECT pump_id,abs(coalesce(backup_lpm,0)) AS backup_flow FROM pumps ORDER BY pump_id",
    "Return pump_id and rounded primary flow as main_flow, treating missing primary flow as zero, sorted by pump_id.",
    "SELECT pump_id,round(coalesce(litres_per_min,0)) AS main_flow FROM pumps ORDER BY pump_id",
  ],
  [
    "Return departure date as date and count of named trains as named_trains per date, sorted by date.",
    "SELECT depart_at::date AS date,count(train) AS named_trains FROM departures GROUP BY depart_at::date ORDER BY date",
    "Return departure date as date and earliest timestamp as first_departure per non-null date, sorted by date.",
    "SELECT depart_at::date AS date,min(depart_at) AS first_departure FROM departures WHERE depart_at IS NOT NULL GROUP BY depart_at::date ORDER BY date",
  ],
  [
    "Return crop and number of lots as lot_count, sorted by crop.",
    "SELECT crop,count(*) AS lot_count FROM lots GROUP BY crop ORDER BY crop",
    "Return crop and maximum crates in one lot as max_crates, sorted by crop.",
    "SELECT crop,max(crates) AS max_crates FROM lots GROUP BY crop ORDER BY crop",
  ],
  [
    "Return heap_no for heaps with total metal at most 800 kg, sorted by heap_no.",
    "SELECT heap_no FROM heaps GROUP BY heap_no HAVING sum(metal_kg)<=800 ORDER BY heap_no",
    "Return heap_no for heaps with more than one metal record, sorted by heap_no.",
    "SELECT heap_no FROM heaps GROUP BY heap_no HAVING count(*)>1 ORDER BY heap_no",
  ],
  [
    "Return bin and number of parcels lighter than 20 kg as light_count, sorted by bin.",
    "SELECT bin,sum(CASE WHEN weight_kg<20 THEN 1 ELSE 0 END) AS light_count FROM parcels GROUP BY bin ORDER BY bin",
    "Return bin and number of parcels with unknown weight as unknown_count, sorted by bin.",
    "SELECT bin,sum(CASE WHEN weight_kg IS NULL THEN 1 ELSE 0 END) AS unknown_count FROM parcels GROUP BY bin ORDER BY bin",
  ],
  [
    "Return line, rider, taps and line_rank using descending taps with shared ranks and no gaps, sorted by line, line_rank, rider.",
    "SELECT line,rider,taps,dense_rank() OVER(PARTITION BY line ORDER BY taps DESC) AS line_rank FROM riders ORDER BY line,line_rank,rider",
    "Return line, rider, taps and position numbering each line by descending taps then rider, sorted by line and position.",
    "SELECT line,rider,taps,row_number() OVER(PARTITION BY line ORDER BY taps DESC,rider) AS position FROM riders ORDER BY line,position",
  ],
  [
    "Return hour, signal and the next signal as next_signal, null after the final reading, sorted by hour.",
    "SELECT hour,signal,lead(signal) OVER(ORDER BY hour) AS next_signal FROM readings ORDER BY hour",
    "Return hour, signal and the sum of signals so far as running_signal, sorted by hour.",
    "SELECT hour,signal,sum(signal) OVER(ORDER BY hour ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_signal FROM readings ORDER BY hour",
  ],
  [
    "Return well_id and depth_m for wells shallower than the average depth, sorted by depth_m then well_id.",
    "SELECT well_id,depth_m FROM wells WHERE depth_m<(SELECT avg(depth_m) FROM wells) ORDER BY depth_m,well_id",
    "Return well_id and depth_m for wells at the smallest known depth, sorted by well_id.",
    "SELECT well_id,depth_m FROM wells WHERE depth_m=(SELECT min(depth_m) FROM wells) ORDER BY well_id",
  ],
  [
    "Return tower_name and count of anchored spans as span_count for every tower, including zero counts, sorted by tower_name.",
    "SELECT t.tower_name,count(s.span_id) AS span_count FROM towers t LEFT JOIN spans s ON s.tower_id=t.tower_id GROUP BY t.tower_id,t.tower_name ORDER BY t.tower_name",
    "Return tower_name and span_id only for anchored spans, sorted by tower_name then span_id.",
    "SELECT t.tower_name,s.span_id FROM towers t JOIN spans s ON s.tower_id=t.tower_id ORDER BY t.tower_name,s.span_id",
  ],
];
export function revisitDefinitions(q) {
  const entries = objectives[q.id - 1];
  return [0, 1].map((i) => ({
    variant: i,
    description: entries[i * 2],
    sql: entries[i * 2 + 1],
  }));
}
export async function generateRevisits(questions) {
  const db = new PGlite();
  const output = [];
  try {
    for (const q of questions) {
      await db.exec(
        `drop schema public cascade; create schema public; ${fixtureSql(q, 0)}`,
      );
      for (const v of revisitDefinitions(q)) {
        const expected = tabular(await db.query(v.sql));
        output.push({
          ruin: q.id,
          variant: v.variant,
          title: `Archive ${q.id} · Revisit ${v.variant + 1}`,
          description: v.description,
          expected,
        });
      }
    }
    return JSON.stringify(output, null, 2) + "\n";
  } finally {
    await db.close();
  }
}
