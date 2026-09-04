export const DATASET_VERSION = "2026-09-03.1";

export const ruinSix = {
  id: 6,
  district: "Shahjahanabad",
  place: "Chandni Chowk",
  title: "The Last Open Stalls",
  description:
    "Find the stalls still open in ward K-7. List their identification numbers from smallest to largest.",
  sampleColumns: ["stall_id"],
  sampleRows: [[21], [46]],
  hints: ["Filter both `ward_code` and `status`, then use `ORDER BY`."],
  starterSql: `SELECT stall_id\nFROM stalls\nORDER BY stall_id;`,
  expected: {
    columns: ["stall_id"],
    rows: [{ stall_id: 102 }, { stall_id: 107 }],
  },
} as const;

export const visibleFixtureSql = `
DROP TABLE IF EXISTS stalls;
CREATE TABLE stalls (
  stall_id integer PRIMARY KEY,
  stall_name text NOT NULL,
  ward_code text NOT NULL,
  status text,
  daily_rations integer NOT NULL CHECK (daily_rations >= 0)
);

INSERT INTO stalls (stall_id, stall_name, ward_code, status, daily_rations) VALUES
  (101, 'Copper Kettle', 'K-7', 'closed', 0),
  (102, 'Moonlight Grain', 'K-7', 'open', 28),
  (103, 'Red Fort Repairs', 'K-4', 'open', 12),
  (104, 'Old Clock Spices', 'K-7', NULL, 7),
  (105, 'Yamuna Filters', 'K-9', 'open', 19),
  (107, 'Paranthe Power', 'K-7', 'open', 31);
`;
