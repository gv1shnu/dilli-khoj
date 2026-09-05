import { useEffect, useMemo, useState } from "react";
import { RUIN_QUESTIONS, type RuinQuestion } from "../questions/catalog";
import { PRACTICE_QUESTIONS } from "../questions/practice";
import { DISTRICTS, MODULE_TITLES, TOTAL_RUINS, districtById, ruinById } from "../game/ruins";
import { MAX_XP, TOTAL_HINTS, XP } from "../game/scoring";
import { GeographicMap } from "../game/GeographicMap";
import { FullscreenButton } from "../components/FullscreenButton";

// Admin-only authoring workspace (DEV builds only — this module and every canonical
// solution are tree-shaken out of production, so students never receive answers).
//
// It shows the 20 ruins tagged by Level / District / Topic, each with its visible test
// case (seed + computed expected rows), and lets you edit or add questions locally.
// Local edits live in this browser (localStorage) and are exported as JSON to commit.

const MODULE_COLORS: Record<number, string> = {
  1: "#e8825a", 2: "#e2b13c", 3: "#7ec86a", 4: "#4fbfa8",
  5: "#5aa9e6", 6: "#8f8be6", 7: "#d178c4", 8: "#e46a86",
};
const DISTRICT_COLORS: Record<number, string> = {
  1: "#e8825a", 2: "#e2b13c", 3: "#7ec86a", 4: "#4fbfa8", 5: "#5aa9e6", 6: "#8f8be6", 7: "#d178c4",
};

const OVERLAY_KEY = "dk_admin_overlay_v1";

interface Overlay {
  /** Edited full question objects, keyed by id (overrides the base catalog). */
  edits: Record<number, RuinQuestion>;
  /** Extra draft questions added by the author (ids beyond the fixed 20). */
  added: RuinQuestion[];
}

const EMPTY_OVERLAY: Overlay = { edits: {}, added: [] };

function loadOverlay(): Overlay {
  try {
    const raw = localStorage.getItem(OVERLAY_KEY);
    if (!raw) return EMPTY_OVERLAY;
    const parsed = JSON.parse(raw) as Overlay;
    return { edits: parsed.edits ?? {}, added: parsed.added ?? [] };
  } catch {
    return EMPTY_OVERLAY;
  }
}

function blankQuestion(id: number): RuinQuestion {
  return {
    id,
    title: "New archive",
    description: "Describe exactly which rows and columns to return.",
    sampleColumns: ["col"],
    sampleRows: [["sample"]],
    ordered: true,
    hints: ["First hint."],
    schema: [
      { name: "table_name", columns: [{ name: "col", type: "text" }], sampleRows: [["sample"]] },
    ],
    starterSql: "SELECT col\nFROM table_name;",
    canonicalSolution: "SELECT col\nFROM table_name\nORDER BY col;",
    acceptedVariants: [],
    status: "drafted",
  };
}


export function WorldMap() {
  const [overlay, setOverlay] = useState<Overlay>(loadOverlay);
  const [selectedId, setSelectedId] = useState<number>(1);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem(OVERLAY_KEY, JSON.stringify(overlay));
    } catch {
      /* private mode: keep edits in memory only */
    }
  }, [overlay]);

  // Base 20 questions with any local edits applied, plus added drafts.
  const questions = useMemo<RuinQuestion[]>(() => {
    const base = RUIN_QUESTIONS.map((q) => overlay.edits[q.id] ?? q);
    return [...base, ...overlay.added];
  }, [overlay]);

  const questionById = (id: number) => questions.find((q) => q.id === id);
  const selected = questionById(selectedId) ?? questions[0];
  const topic = ruinById(selected.id);
  const practice = PRACTICE_QUESTIONS.find((p) => p.id === selected.id);
  const hasLocalEdits = Object.keys(overlay.edits).length > 0 || overlay.added.length > 0;

  const fixtureCurrent = Boolean(practice) && !overlay.edits[selected.id];

  const beginEdit = () => {
    setDraft(JSON.stringify(selected, null, 2));
    setError(null);
    setEditing(true);
  };

  const saveEdit = () => {
    let parsed: RuinQuestion;
    try {
      parsed = JSON.parse(draft) as RuinQuestion;
    } catch (e) {
      setError(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`);
      return;
    }
    if (typeof parsed.id !== "number" || !parsed.title || !parsed.description) {
      setError("A question needs at least a numeric id, a title and a description.");
      return;
    }
    setOverlay((prev) => {
      const isBase = RUIN_QUESTIONS.some((q) => q.id === parsed.id);
      if (isBase) return { ...prev, edits: { ...prev.edits, [parsed.id]: parsed } };
      return { ...prev, added: [...prev.added.filter((q) => q.id !== parsed.id), parsed] };
    });
    setSelectedId(parsed.id);
    setEditing(false);
  };

  const addArchive = () => {
    const nextId = Math.max(TOTAL_RUINS, ...questions.map((q) => q.id)) + 1;
    const q = blankQuestion(nextId);
    setOverlay((prev) => ({ ...prev, added: [...prev.added, q] }));
    setSelectedId(nextId);
    setDraft(JSON.stringify(q, null, 2));
    setError(null);
    setEditing(true);
  };

  const discardLocal = () => {
    if (!confirm("Discard all local edits and added drafts in this browser?")) return;
    setOverlay(EMPTY_OVERLAY);
    setEditing(false);
    setSelectedId(1);
  };

  const exportJson = () => {
    const payload = questions
      .slice()
      .sort((a, b) => a.id - b.id)
      .map((q) => ({ ...q, _tags: tagsFor(q.id) }));
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "dilli-khoj-questions.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">DILLI KHOJ // ADMIN</p>
          <h1>Question Studio</h1>
        </div>
        <div className="admin-stats">
          <FullscreenButton className="admin-chip admin-link" />
          <span className="admin-chip">{TOTAL_RUINS} ruins · {DISTRICTS.length} districts</span>
          <span className="admin-chip admin-chip--live">{PRACTICE_QUESTIONS.length} generated</span>
          {hasLocalEdits && <span className="admin-chip admin-chip--draft">local edits</span>}
          <button className="admin-chip admin-link" onClick={exportJson}>⭳ Export JSON</button>
          <a className="admin-chip admin-link" href="#">← Game</a>
        </div>
      </header>

      <p className="admin-note">
        DEV-only authoring workspace. Edits live in <code>localStorage</code> in this
        browser; use <strong>Export JSON</strong> to save them and commit into the
        catalog. Level / district / topic come from the authoritative{" "}
        <code>ruins.ts</code> sequence. XP: start {XP.START}, survey +{XP.SURVEY}, solve
        +{XP.SOLVE}, first clue {XP.HINT_FIRST}, deeper clue {XP.HINT_DEEP}, reveal {XP.REVEAL} · max {MAX_XP} · {TOTAL_HINTS} clues total.
      </p>

      <div className="admin-legend">
        {DISTRICTS.map((d) => (
          <span key={d.id} className="admin-legend-item">
            <i style={{ background: DISTRICT_COLORS[d.id] }} />
            D{d.id} · {d.name} <span className="admin-colnote">(ruins {d.ruinIds[0]}–{d.ruinIds[d.ruinIds.length - 1]})</span>
          </span>
        ))}
      </div>

      <GeographicMap cleared={[]} fullAccess selectedId={selectedId} onSelect={id => {setSelectedId(id); setEditing(false);}} />

      {overlay.added.length > 0 && (
        <div className="admin-added">
          <span className="admin-colnote">Added drafts (not yet slotted into ruins.ts):</span>
          {overlay.added.map((q) => (
            <button key={q.id} className={`admin-chip ${q.id === selectedId ? "admin-chip--draft" : ""}`}
              onClick={() => { setSelectedId(q.id); setEditing(false); }}>#{q.id} {q.title}</button>
          ))}
        </div>
      )}

      <section className="admin-detail" aria-live="polite">
        <div className="admin-detail-head">
          <div>
            <div className="admin-tags">
              <span className="admin-tag admin-tag--level">LEVEL {String(selected.id).padStart(2, "0")}</span>
              {topic ? (
                <>
                  <span className="admin-tag" style={{ borderColor: DISTRICT_COLORS[topic.district] }}>
                    D{topic.district} · {districtById(topic.district)?.name}
                  </span>
                  <span className="admin-tag" style={{ borderColor: MODULE_COLORS[topic.module] }}>
                    M{topic.module} · {topic.target}
                  </span>
                  <span className="admin-tag">{topic.hints} hint{topic.hints > 1 ? "s" : ""}</span>
                </>
              ) : (
                <span className="admin-tag admin-tag--warn">unslotted — add to ruins.ts</span>
              )}
            </div>
            <h2>{selected.title}</h2>
          </div>
          <span className={`admin-status admin-status--${selected.status}`}>
            {fixtureCurrent ? "GENERATED · review pending" : "LOCAL DRAFT · regenerate"}
          </span>
        </div>

        <p className="admin-desc">{selected.description}</p>

        <div className="admin-actions-row">
          {!editing ? (
            <>
              <button className="secondary-button" onClick={beginEdit}>✎ Edit this archive</button>
              <button className="secondary-button" onClick={addArchive}>＋ Add archive</button>
              {hasLocalEdits && <button className="hint-button" onClick={discardLocal}>Discard local edits</button>}
            </>
          ) : (
            <>
              <button className="primary-button" onClick={saveEdit}>Save locally</button>
              <button className="secondary-button" onClick={() => setEditing(false)}>Cancel</button>
              <span className="admin-colnote">Editing full question JSON — then Export to commit.</span>
            </>
          )}
        </div>

        {editing ? (
          <div className="admin-editor">
            {error && <p className="admin-error">{error}</p>}
            <textarea className="sql-editor admin-json" value={draft} spellCheck={false}
              onChange={(e) => setDraft(e.target.value)} />
          </div>
        ) : (
          <div className="admin-grid">
            <div>
              <h3>Sample output {selected.ordered ? "· ordered" : "· unordered"}</h3>
              <ValueTable columns={selected.sampleColumns} rows={selected.sampleRows} />

              <h3>Visible test case {practice ? "· computed expected" : ""}</h3>
              {practice ? (
                <>
                  <ValueTable columns={[...practice.expected.columns]}
                    rows={practice.expected.rows.map((r) => practice.expected.columns.map((c) => r[c]))} />
                  <details className="admin-fixture">
                    <summary>Seed data (fixtureSql)</summary>
                    <pre className="admin-sql admin-sql--variant">{practice.fixtureSql}</pre>
                  </details>
                </>
              ) : (
                <p className="admin-colnote">No generated fixture yet. Run <code>pnpm content:generate</code>.</p>
              )}

              <h3>Hints</h3>
              <ol className="admin-hints">{selected.hints.map((h, i) => <li key={i}>{h}</li>)}</ol>

              <h3>Schema</h3>
              {selected.schema.map((table) => (
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
              <h3>Canonical solution <span className="admin-vaulted">vault-only · dev</span></h3>
              <pre className="admin-sql">{selected.canonicalSolution}</pre>
              <h3>Accepted variants ({selected.acceptedVariants.length})</h3>
              {selected.acceptedVariants.map((v, i) => <pre key={i} className="admin-sql admin-sql--variant">{v}</pre>)}
              <h3>Authoring checklist</h3>
              <ul className="admin-check">
                <li className="admin-check--done">Content authored (title, description, hints)</li>
                <li className="admin-check--done">Canonical + {selected.acceptedVariants.length} accepted variants</li>
                <li className={fixtureCurrent ? "admin-check--done" : "admin-check--todo"}>Visible fixture generated from the catalog</li>
                <li className="admin-check--todo">Run fixture and near-miss regression tests: pnpm test</li>
                <li className="admin-check--todo">Blind human review (solve from description)</li>
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

function tagsFor(id: number) {
  const t = ruinById(id);
  if (!t) return { level: id, district: null, module: null };
  return { level: t.id, district: districtById(t.district)?.name ?? t.district, module: MODULE_TITLES[t.module], topic: t.target };
}

function ValueTable({ columns, rows }: { columns: string[]; rows: unknown[][] }) {
  return (
    <div className="admin-table-scroll">
      <table className="admin-sample">
        <thead><tr>{columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i}>{row.map((cell, j) => <td key={j}>{cell === null || cell === undefined ? "NULL" : String(cell)}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
