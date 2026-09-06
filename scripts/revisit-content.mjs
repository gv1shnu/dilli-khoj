import { PGlite } from "@electric-sql/pglite";
import { fixtureSql } from "./practice-fixtures.mjs";
import { tabular } from "./practice-content.mjs";
// Two distinct, curriculum-matched objectives per ruin. SQL remains authoring-only.
const objectives = [
  [
    "Find the fields belonging to the shelter book. Show each field and what it stores, alphabetically by field.",
    "SELECT field,stores FROM record_fields WHERE book='shelter' ORDER BY field",
    "Find the fields marked as an identifier. Show each book and field, alphabetically by book, then field.",
    "SELECT book,field FROM record_fields WHERE is_key ORDER BY book,field",
  ],
  [
    "Find the bus fields tagged 'none' — they can't pick out a record alone. List their names alphabetically.",
    "SELECT field FROM id_tags WHERE book='bus' AND tag='none' ORDER BY field",
    "Find every field tagged 'spare', a backup identifier. Show its book and field, alphabetically by book, then field.",
    "SELECT book,field FROM id_tags WHERE tag='spare' ORDER BY book,field",
  ],
  [
    "Find links pointing to the shelter book. Show each link's from_book and from_field, alphabetically by both.",
    "SELECT from_book,from_field FROM links WHERE to_book='shelter' ORDER BY from_book,from_field",
    "Find links pointing to the ward book. Show each link's from_book and from_field, alphabetically by both.",
    "SELECT from_book,from_field FROM links WHERE to_book='ward' ORDER BY from_book,from_field",
  ],
  [
    "Find edits that changed a book's contents. Show the target and edit, newest first; undated edits come last.",
    "SELECT target,edit FROM change_log WHERE change_type='contents' ORDER BY changed_at DESC NULLS LAST",
    "Find edits that built a book. Show the target and edit, alphabetically by target.",
    "SELECT target,edit FROM change_log WHERE edit='built the book' ORDER BY target",
  ],
  [
    "Find where read access is explicitly refused. Show the who and record_book, alphabetically by both.",
    "SELECT who,record_book FROM permissions WHERE action='read' AND allowed=false ORDER BY who,record_book",
    "Find who is allowed to write. Show the who and record_book, alphabetically by both.",
    "SELECT who,record_book FROM permissions WHERE action='write' AND allowed ORDER BY who,record_book",
  ],
  [
    "Find closed stalls in ward K-7. List their identification numbers in increasing order.",
    "SELECT stall_id FROM stalls WHERE ward_code='K-7' AND status='closed' ORDER BY stall_id",
    "Find open stalls with a known ward outside K-7. List their identification numbers in increasing order.",
    "SELECT stall_id FROM stalls WHERE ward_code<>'K-7' AND status='open' ORDER BY stall_id",
  ],
  [
    "List each known home ward once for pilgrims arriving after day two. Arrange ward names alphabetically.",
    "SELECT DISTINCT home_ward FROM pilgrims WHERE arrival_day>2 AND home_ward IS NOT NULL ORDER BY home_ward",
    "List each known home ward once for pilgrims arriving before day three. Arrange ward names in reverse alphabetical order.",
    "SELECT DISTINCT home_ward FROM pilgrims WHERE arrival_day<3 AND home_ward IS NOT NULL ORDER BY home_ward DESC",
  ],
  [
    "Find shops whose names begin with Paper, regardless of capital letters. List their names alphabetically.",
    "SELECT shop_name FROM shops WHERE shop_name ILIKE 'paper%' ORDER BY shop_name",
    "Find shops whose trade descriptions end with ink, regardless of capital letters. List their names alphabetically.",
    "SELECT shop_name FROM shops WHERE trade ILIKE '%ink' ORDER BY shop_name",
  ],
  [
    "Find sealed vaults in wards D-1 or D-3. List their identification numbers in increasing order.",
    "SELECT vault_id FROM vaults WHERE ward_code IN ('D-1','D-3') AND sealed ORDER BY vault_id",
    "Find unsealed vaults with known wards outside D-1, D-3, and D-9. List their identification numbers in increasing order.",
    "SELECT vault_id FROM vaults WHERE ward_code NOT IN ('D-1','D-3','D-9') AND NOT sealed ORDER BY vault_id",
  ],
  [
    "Show the second and third most valuable finds with their coin values, most valuable first. Break value ties alphabetically by item name.",
    "SELECT item,value_coins FROM finds ORDER BY value_coins DESC,item LIMIT 2 OFFSET 1",
    "Show the two least valuable finds with their coin values, least valuable first. Break value ties alphabetically by item name.",
    "SELECT item,value_coins FROM finds ORDER BY value_coins,item LIMIT 2",
  ],
  [
    "Show each dish with its notes written in small letters. Arrange dishes alphabetically.",
    "SELECT dish,lower(notes) AS notes_lower FROM recipes ORDER BY dish",
    "Show each dish with the first three characters of its notes. Arrange dishes alphabetically.",
    "SELECT dish,substring(notes,1,3) AS note_start FROM recipes ORDER BY dish",
  ],
  [
    "Show each pump with the magnitude of its backup flow, ignoring the sign. Treat missing backup flow as zero; arrange pumps by identification number.",
    "SELECT pump_id,abs(coalesce(backup_lpm,0)) AS backup_flow FROM pumps ORDER BY pump_id",
    "Show each pump with its main flow rounded to the nearest whole number. Treat missing main flow as zero; arrange pumps by identification number.",
    "SELECT pump_id,round(coalesce(litres_per_min,0)) AS main_flow FROM pumps ORDER BY pump_id",
  ],
  [
    "For each departure day, count trains whose names are recorded. Show the date and count, earliest day first.",
    "SELECT depart_at::date AS date,count(train) AS named_trains FROM departures GROUP BY depart_at::date ORDER BY date",
    "For each known departure day, find its earliest departure time. Show the date and that time, earliest day first.",
    "SELECT depart_at::date AS date,min(depart_at) AS first_departure FROM departures WHERE depart_at IS NOT NULL GROUP BY depart_at::date ORDER BY date",
  ],
  [
    "Count the lots belonging to each crop. Show the crop and lot count, alphabetically by crop.",
    "SELECT crop,count(*) AS lot_count FROM lots GROUP BY crop ORDER BY crop",
    "Find the largest number of crates in a single lot for each crop. Show the crop and amount, alphabetically by crop.",
    "SELECT crop,max(crates) AS max_crates FROM lots GROUP BY crop ORDER BY crop",
  ],
  [
    "Find heaps containing at most 800 kilograms of recovered metal in total. List heap numbers in increasing order.",
    "SELECT heap_no FROM heaps GROUP BY heap_no HAVING sum(metal_kg)<=800 ORDER BY heap_no",
    "Find heaps with more than one metal record. List heap numbers in increasing order.",
    "SELECT heap_no FROM heaps GROUP BY heap_no HAVING count(*)>1 ORDER BY heap_no",
  ],
  [
    "For every bin, count parcels lighter than 20 kilograms, including bins with none. Show bin names and counts, alphabetically by bin.",
    "SELECT bin,sum(CASE WHEN weight_kg<20 THEN 1 ELSE 0 END) AS light_count FROM parcels GROUP BY bin ORDER BY bin",
    "For every bin, count parcels whose weight is unknown, including bins with none. Show bin names and counts, alphabetically by bin.",
    "SELECT bin,sum(CASE WHEN weight_kg IS NULL THEN 1 ELSE 0 END) AS unknown_count FROM parcels GROUP BY bin ORDER BY bin",
  ],
  [
    "Show each line, rider, tap total, and placing. Highest totals lead each line; ties share places without gaps. Arrange by line, placing, then rider.",
    "SELECT line,rider,taps,dense_rank() OVER(PARTITION BY line ORDER BY taps DESC) AS line_rank FROM riders ORDER BY line,line_rank,rider",
    "Show each line, rider, tap total, and position. Number riders within each line by highest totals, breaking ties alphabetically. Arrange by line, then position.",
    "SELECT line,rider,taps,row_number() OVER(PARTITION BY line ORDER BY taps DESC,rider) AS position FROM riders ORDER BY line,position",
  ],
  [
    "Show each reading’s hour, signal, and following signal in time order. The last reading has no following value.",
    "SELECT hour,signal,lead(signal) OVER(ORDER BY hour) AS next_signal FROM readings ORDER BY hour",
    "Show each reading’s hour, signal, and accumulated signal total up to that hour, earliest first.",
    "SELECT hour,signal,sum(signal) OVER(ORDER BY hour ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS running_signal FROM readings ORDER BY hour",
  ],
  [
    "Find wells shallower than the average depth. Show their identification numbers and depths, shallowest first; break ties by identification number.",
    "SELECT well_id,depth_m FROM wells WHERE depth_m<(SELECT avg(depth_m) FROM wells) ORDER BY depth_m,well_id",
    "Find all wells at the smallest known depth. Show their identification numbers and depths, arranged by identification number.",
    "SELECT well_id,depth_m FROM wells WHERE depth_m=(SELECT min(depth_m) FROM wells) ORDER BY well_id",
  ],
  [
    "Show every tower with its number of attached spans, including towers with none. Arrange tower names alphabetically.",
    "SELECT t.tower_name,count(s.span_id) AS span_count FROM towers t LEFT JOIN spans s ON s.tower_id=t.tower_id GROUP BY t.tower_id,t.tower_name ORDER BY t.tower_name",
    "Show tower names and span numbers for attached spans only. Arrange alphabetically by tower name, then by span number.",
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
