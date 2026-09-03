import { useMemo, useState } from "react";
import { RUIN_ENTRIES } from "../questions/catalog";
import { MODULE_TITLES, TOTAL_RUINS } from "../game/ruins";

// Admin-only overview of the whole game: a route map of the 20 ruins in
// progression order, colour-coded by DBMS module, with a detail panel showing each
// drafted question, its canonical solution and authoring status.
//
// NOTE: This view is gated only by the `#admin` URL fragment today. Real admin
// authorization (the approved admin email list + RLS) is a later step; treat this
// as an internal authoring tool, not a secured surface.

const MODULE_COLORS: Record<number, string> = {
  1: "#e8825a",
  2: "#e2b13c",
  3: "#7ec86a",
  4: "#4fbfa8",
  5: "#5aa9e6",
  6: "#8f8be6",
  7: "#d178c4",
  8: "#e46a86",
};

const COLS = 5;
const CELL_W = 190;
const CELL_H = 150;
const PAD_X = 70;
const PAD_Y = 70;

interface NodePoint {
  id: number;
  x: number;
  y: number;
}

export function WorldMap() {
  const [selectedId, setSelectedId] = useState<number>(1);

  const nodes = useMemo<NodePoint[]>(() => {
    return RUIN_ENTRIES.map(({ topic }, index) => {
      const row = Math.floor(index / COLS);
      const posInRow = index % COLS;
      // Serpentine: even rows go left-to-right, odd rows right-to-left.
      const col = row % 2 === 0 ? posInRow : COLS - 1 - posInRow;
      return {
        id: topic.id,
        x: PAD_X + col * CELL_W,
        y: PAD_Y + row * CELL_H,
      };
    });
  }, []);

  const pathD = useMemo(() => {
    return nodes
      .map((n, i) => `${i === 0 ? "M" : "L"} ${n.x.toFixed(0)} ${n.y.toFixed(0)}`)
      .join(" ");
  }, [nodes]);

  const width = PAD_X * 2 + (COLS - 1) * CELL_W;
  const rows = Math.ceil(RUIN_ENTRIES.length / COLS);
  const height = PAD_Y * 2 + (rows - 1) * CELL_H;

  const selected = RUIN_ENTRIES.find((e) => e.topic.id === selectedId) ?? RUIN_ENTRIES[0];
  const liveCount = RUIN_ENTRIES.filter((e) => e.question.status === "live").length;
  const draftedCount = RUIN_ENTRIES.filter((e) => e.question.status === "drafted").length;

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">DILLI KHOJ // ADMIN</p>
          <h1>World Map</h1>
        </div>
        <div className="admin-stats">
          <span className="admin-chip">{TOTAL_RUINS} ruins</span>
          <span className="admin-chip admin-chip--live">{liveCount} live</span>
          <span className="admin-chip admin-chip--draft">{draftedCount} drafted</span>
          <a className="admin-chip admin-link" href="#">
            ← Back to game
          </a>
        </div>
      </header>

      <p className="admin-note">
        Internal authoring view, gated only by <code>#admin</code>. Real admin auth
        (approved email list + RLS) comes with the dashboard step. Curriculum order is
        the authoritative sequence from <code>ruins.ts</code>.
      </p>

      <div className="admin-legend">
        {Object.entries(MODULE_TITLES).map(([mod, title]) => (
          <span key={mod} className="admin-legend-item">
            <i style={{ background: MODULE_COLORS[Number(mod)] }} />
            M{mod} · {title}
          </span>
        ))}
      </div>

      <div className="admin-map-wrap">
        <svg
          className="admin-map"
          viewBox={`0 0 ${width} ${height}`}
          role="group"
          aria-label="Ruin progression map"
        >
          <path d={pathD} className="admin-route" />
          {nodes.map((n) => {
            const entry = RUIN_ENTRIES.find((e) => e.topic.id === n.id)!;
            const color = MODULE_COLORS[entry.topic.module];
            const isSelected = n.id === selectedId;
            const isLive = entry.question.status === "live";
            return (
              <g
                key={n.id}
                transform={`translate(${n.x} ${n.y})`}
                className="admin-node"
                onClick={() => setSelectedId(n.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedId(n.id);
                }}
              >
                <circle r={26} fill={color} stroke={isSelected ? "#fff" : "#0a0d0c"} strokeWidth={isSelected ? 3 : 2} />
                {isLive && <circle r={31} fill="none" stroke="#65e1bd" strokeWidth={2} strokeDasharray="3 3" />}
                <text className="admin-node-num" textAnchor="middle" dy="0.35em">
                  {n.id}
                </text>
                <text className="admin-node-label" textAnchor="middle" y={46}>
                  {entry.topic.place.length > 20 ? `${entry.topic.place.slice(0, 19)}…` : entry.topic.place}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <section className="admin-detail" aria-live="polite">
        <div className="admin-detail-head">
          <div>
            <p className="eyebrow" style={{ color: MODULE_COLORS[selected.topic.module] }}>
              RUIN {String(selected.topic.id).padStart(2, "0")} · MODULE {selected.topic.module} ·{" "}
              {selected.topic.place}
            </p>
            <h2>{selected.question.title}</h2>
          </div>
          <span className={`admin-status admin-status--${selected.question.status}`}>
            {selected.question.status === "live" ? "LIVE · fixtures graded" : "DRAFT · needs fixtures"}
          </span>
        </div>

        <p className="admin-topic">
          <strong>Topic:</strong> {selected.topic.target} · <strong>Hints:</strong>{" "}
          {selected.topic.hints}
        </p>

        <p className="admin-desc">{selected.question.description}</p>

        <div className="admin-grid">
          <div>
            <h3>Sample output {selected.question.ordered ? "· ordered" : "· unordered"}</h3>
            <table className="admin-sample">
              <thead>
                <tr>
                  {selected.question.sampleColumns.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {selected.question.sampleRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell === null ? "NULL" : String(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>

            <h3>Hints</h3>
            <ol className="admin-hints">
              {selected.question.hints.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ol>

            <h3>Schema</h3>
            {selected.question.schema.map((table) => (
              <div key={table.name} className="admin-schema">
                <code className="admin-schema-name">{table.name}</code>
                <ul>
                  {table.columns.map((col) => (
                    <li key={col.name}>
                      <code>{col.name}</code> <span className="admin-type">{col.type}</span>
                      {col.note ? <span className="admin-colnote"> — {col.note}</span> : null}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div>
            <h3>Canonical solution <span className="admin-vaulted">vault-only</span></h3>
            <pre className="admin-sql">{selected.question.canonicalSolution}</pre>

            <h3>Accepted variants ({selected.question.acceptedVariants.length})</h3>
            {selected.question.acceptedVariants.map((v, i) => (
              <pre key={i} className="admin-sql admin-sql--variant">
                {v}
              </pre>
            ))}

            <h3>Authoring checklist</h3>
            <ul className="admin-check">
              <li className="admin-check--done">Content authored (title, description, hints)</li>
              <li className="admin-check--done">Canonical + {selected.question.acceptedVariants.length} accepted variants</li>
              <li className={selected.question.status === "live" ? "admin-check--done" : "admin-check--todo"}>
                Visible + two hidden fixtures with computed expected rows
              </li>
              <li className={selected.question.status === "live" ? "admin-check--done" : "admin-check--todo"}>
                Near-miss tests (missing/extra rows, wrong column/order, NULL/tie/duplicate)
              </li>
              <li className="admin-check--todo">Blind human review (solve from description)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
