import { lazy, Suspense, useCallback, useEffect, useRef, useState } from "react";
import { ResultTable } from "./components/ResultTable";
import { preparePracticeDatabase, runPracticeQuery } from "./db/practice-db";
import { RuinScene } from "./game/RuinScene";
import { IntroOverlay } from "./game/IntroOverlay";
import { PlayerMap } from "./game/PlayerMap";
import { SignInGate } from "./game/SignInGate";
import { RUIN_SEQUENCE, ruinById } from "./game/ruins";
import { parsePracticeSession, PRACTICE_STORAGE_KEY } from "./game/practice-session";
import { allCleared, clampToUnlocked, isUnlocked } from "./game/progression";
import { submitToJudge } from "./lib/judge";
import { signInWithGoogle, supabase } from "./lib/supabase";
import { practiceQuestion } from "./questions/practice";
import { matchesOrderedResult, type TabularResult } from "./sql/result-policy";

// Solutions belong to authoring, never the student production bundle.
const WorldMap = import.meta.env.DEV
  ? lazy(() => import("./admin/WorldMap").then((module) => ({ default: module.WorldMap })))
  : null;
type Status = { kind: "idle" | "loading" | "pass" | "fail" | "error"; message: string };
const INTRO_SEEN_KEY = "dk_intro_seen_v1";

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (hash.startsWith("#admin") && WorldMap) {
    return <Suspense fallback={<p>Opening authoring map…</p>}><WorldMap /></Suspense>;
  }
  return <GameShell />;
}

function GameShell() {
  const [session, setSession] = useState(() => {
    try { return parsePracticeSession(localStorage.getItem(PRACTICE_STORAGE_KEY)); }
    catch { return parsePracticeSession(null); }
  });
  const question = practiceQuestion(session.selectedId);
  const topic = ruinById(question.id)!;
  const sql = session.drafts[question.id] ?? question.starterSql;
  const [nearTerminal, setNearTerminal] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [result, setResult] = useState<TabularResult | null>(null);
  const [status, setStatus] = useState<Status>({ kind: "loading", message: "Waking the local PostgreSQL archive…" });
  const [hintsShown, setHintsShown] = useState(0);
  const [signedInName, setSignedInName] = useState<string | null>(null);
  const [xp, setXp] = useState<number | null>(null);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [showIntro, setShowIntro] = useState(() => {
    try { return localStorage.getItem(INTRO_SEEN_KEY) !== "1"; }
    catch { return true; }
  });
  const [showMap, setShowMap] = useState(false);
  const [devBypass, setDevBypass] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const operation = useRef(0);
  const busy = useRef(false);

  // Google sign-in is required to play (only when auth is configured). In dev builds a
  // bypass keeps local testing possible before Google/Supabase are wired up.
  const requireAuth = Boolean(supabase);
  const gated = !showIntro && requireAuth && !signedInName && !devBypass;

  useEffect(() => {
    try {
      localStorage.setItem(PRACTICE_STORAGE_KEY, JSON.stringify(session));
      setStorageAvailable(true);
    } catch { setStorageAvailable(false); }
  }, [session]);

  // Sequential passage: never sit on a locked (future) ruin; start at the frontier.
  useEffect(() => {
    setSession((current) => {
      const clamped = clampToUnlocked(current.selectedId, current.passed);
      return clamped === current.selectedId ? current : { ...current, selectedId: clamped };
    });
  }, []);

  // Track survey (archive opened) and sign-up time; stamp completion when all cleared.
  useEffect(() => {
    setSession((current) => {
      const surveyed = current.surveyed.includes(question.id)
        ? current.surveyed
        : [...current.surveyed, question.id];
      const startedAt = current.startedAt ?? Date.now();
      if (surveyed === current.surveyed && startedAt === current.startedAt) return current;
      return { ...current, surveyed, startedAt };
    });
  }, [question.id]);

  useEffect(() => {
    if (allCleared(session.passed) && session.completedAt === null) {
      setSession((current) => ({ ...current, completedAt: Date.now() }));
    }
  }, [session.passed, session.completedAt]);

  useEffect(() => {
    const request = ++operation.current;
    busy.current = true;
    setResult(null);
    setHintsShown(0);
    setStatus({ kind: "loading", message: "Opening this archive's practice tables…" });
    preparePracticeDatabase(question.id).then(() => {
      if (operation.current === request) setStatus({ kind: "idle", message: "Ready. Run checks the visible case; practice never changes official XP." });
    }).catch((error: unknown) => {
      if (operation.current === request) setStatus({ kind: "error", message: getErrorMessage(error) });
    }).finally(() => { if (operation.current === request) busy.current = false; });
    return () => { operation.current += 1; };
  }, [question.id]);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    let authRevision = 0;
    const { data } = client.auth.onAuthStateChange((_event, authSession) => {
      const revision = ++authRevision;
      const user = authSession?.user;
      setSignedInName(user ? String(user.user_metadata.full_name ?? user.email ?? "Explorer") : null);
      setXp(null);
      if (user) queueMicrotask(() => {
        void client.from("profiles").select("xp").eq("id", user.id).maybeSingle().then(({ data: profile }) => {
          if (active && authRevision === revision && typeof profile?.xp === "number") setXp(profile.xp);
        });
      });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try { localStorage.setItem(INTRO_SEEN_KEY, "1"); } catch { /* session-only */ }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && target.closest("textarea,input,select,button,[contenteditable=true]")) return;
      if (event.code === "KeyE" && nearTerminal && !showIntro) setTerminalOpen(true);
      if (event.code === "Escape") setTerminalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearTerminal, showIntro]);

  const handleSignIn = () => {
    setAuthError(null);
    void signInWithGoogle().catch((error: unknown) => setAuthError(getErrorMessage(error)));
  };

  const selectArchive = (id: number) => {
    if (busy.current) return;
    if (!isUnlocked(id, session.passed)) return; // sequential: locked ruins are not openable
    setSession((current) => ({ ...current, selectedId: id }));
    setTerminalOpen(true);
  };

  const handleRun = async () => {
    if (busy.current) return;
    busy.current = true;
    const request = ++operation.current;
    setStatus({ kind: "loading", message: "Running on this archive's visible fixture…" });
    try {
      const nextResult = await runPracticeQuery(sql, question.id);
      if (operation.current !== request) return;
      setResult(nextResult);
      const passed = matchesOrderedResult(nextResult, question.expected);
      if (passed) setSession((current) => ({ ...current, passed: [...new Set([...current.passed, question.id])] }));
      setStatus(passed
        ? { kind: "pass", message: "Visible case passed! Try the next archive, or experiment here. No official XP awarded." }
        : { kind: "fail", message: "Not quite. Check the columns, rows and sorting. Wrong runs cost nothing." });
    } catch (error) {
      if (operation.current !== request) return;
      setResult(null);
      setStatus({ kind: "error", message: getErrorMessage(error) });
    } finally { if (operation.current === request) busy.current = false; }
  };

  const handleSubmit = async () => {
    if (busy.current) return;
    busy.current = true;
    const request = ++operation.current;
    setResult(null);
    setStatus({ kind: "loading", message: "Sending to the authoritative judge…" });
    try {
      const verdict = await submitToJudge(sql, question.id);
      if (operation.current !== request) return;
      if (typeof verdict.xp === "number") setXp(verdict.xp);
      setStatus({ kind: verdict.correct ? "pass" : "fail", message: `${verdict.message} ${verdict.casesPassed}/${verdict.casesTotal} cases passed.` });
    } catch (error) {
      if (operation.current === request) setStatus({ kind: "error", message: getErrorMessage(error) });
    } finally { if (operation.current === request) busy.current = false; }
  };

  const loading = status.kind === "loading";
  return (
    <main className="app-shell">
      <RuinScene onProximityChange={setNearTerminal} inputPaused={terminalOpen || showIntro || gated || showMap} />
      {showIntro && <IntroOverlay onClose={dismissIntro} />}
      {gated && (
        <SignInGate
          onSignIn={handleSignIn}
          error={authError}
          onDevBypass={import.meta.env.DEV ? () => setDevBypass(true) : undefined}
        />
      )}
      {showMap && <PlayerMap cleared={session.passed} onSelect={selectArchive} onClose={() => setShowMap(false)} />}
      <header className="topbar">
        <div><p className="eyebrow">DELHI // ARCHIVE {String(question.id).padStart(2, "0")}</p><h1>Dilli Khoj</h1></div>
        <div className="player-strip">
          <button className="ghost-button help-button" onClick={() => setShowIntro(true)} aria-label="How to play">?</button>
          <span className="xp-chip">{xp === null ? "Practice mode" : `${xp} XP`}</span>
          {signedInName ? <span className="identity">{signedInName}</span> : <button className="ghost-button" onClick={handleSignIn}>Sign in with Google</button>}
        </div>
      </header>
      <aside className="mission-card">
        <p className="eyebrow">RUIN {String(topic.id).padStart(2, "0")} · MODULE {topic.module}</p>
        <h2>{topic.place}</h2>
        <p>{topic.target}. Restore this ruin to unlock the next; revisit restored ruins from your map.</p>
        <div className="mission-progress"><span>Ruins restored</span><strong>{session.passed.length} / 20</strong></div>
        <div className="mission-actions">
          <button className="ghost-button archive-open" onClick={() => setTerminalOpen(true)}>Open archive</button>
          <button className="ghost-button archive-open" onClick={() => setShowMap(true)}>World map</button>
        </div>
      </aside>
      {nearTerminal && !terminalOpen && <button className="interact-prompt" onClick={() => setTerminalOpen(true)}><kbd>E</kbd> Open SQL archive</button>}
      {terminalOpen && <section className="terminal-panel" aria-label="SQL challenge">
        <div className="terminal-header">
          <div><p className="eyebrow">RUIN {String(question.id).padStart(2, "0")} · PRACTICE ARCHIVE</p><h2>{question.title}</h2></div>
          <button className="icon-button" onClick={() => setTerminalOpen(false)} aria-label="Close terminal">×</button>
        </div>
        <nav className="archive-navigation" aria-label="Archive browser">
          <button className="ghost-button" aria-label="Previous archive" disabled={loading || question.id === 1} onClick={() => selectArchive(question.id - 1)}>←</button>
          <select aria-label="Choose archive" value={question.id} disabled={loading} onChange={(event) => selectArchive(Number(event.target.value))}>
            {RUIN_SEQUENCE.map((entry) => {
              const unlocked = isUnlocked(entry.id, session.passed);
              const mark = session.passed.includes(entry.id) ? "✓ " : unlocked ? "" : "🔒 ";
              return <option key={entry.id} value={entry.id} disabled={!unlocked}>{mark}{String(entry.id).padStart(2, "0")} · {entry.place}</option>;
            })}
          </select>
          <button className="ghost-button" aria-label="Next archive" disabled={loading || question.id === 20 || !isUnlocked(question.id + 1, session.passed)} onClick={() => selectArchive(question.id + 1)}>→</button>
        </nav>
        <p className="question-copy">{question.description}</p>
        <div className="sample-block"><span>Sample output · {question.ordered ? "order matters" : "any order"}</span></div>
        <ResultTable result={{ columns: question.sampleColumns, rows: question.sampleRows.map((row) => Object.fromEntries(question.sampleColumns.map((column, index) => [column, row[index]]))) }} />
        <details className="schema-block"><summary>Schema · {question.schema.map((table) => table.name).join(", ")}</summary>
          {question.schema.map((table) => <div className="archive-schema" key={table.name}><strong>{table.name}</strong>{table.columns.map((column) => <code key={column.name}>{column.name} · {column.type}{column.note ? ` · ${column.note}` : ""}</code>)}</div>)}
        </details>
        <label className="editor-label" htmlFor="sql-editor">Query <span className="draft-note">{storageAvailable ? "Saved on this device" : "Storage unavailable · copy your query before leaving"}</span></label>
        <textarea id="sql-editor" className="sql-editor" value={sql} disabled={loading} spellCheck={false} onChange={(event) => {
          const value = event.target.value;
          setSession((current) => ({ ...current, drafts: { ...current.drafts, [question.id]: value } }));
        }} />
        <div className="terminal-actions">
          <button className="hint-button" disabled={hintsShown >= question.hints.length} onClick={() => setHintsShown((count) => count + 1)}>{hintsShown >= question.hints.length ? "Hints opened" : `Hint ${hintsShown + 1} · free practice`}</button>
          <div><button className="secondary-button" onClick={() => void handleRun()} disabled={loading}>Run</button>
            <button className="primary-button" onClick={() => void handleSubmit()} disabled={loading || question.id !== 6 || !signedInName} title={question.id === 6 ? "Sign in to submit to the server judge" : "Server fixtures are not released for this archive yet"}>Submit</button></div>
        </div>
        {question.hints.slice(0, hintsShown).map((hint, index) => <p className="hint-copy" key={hint}>Hint {index + 1}: {hint}</p>)}
        <div className={`status-banner status-${status.kind}`} role="status"><span className="status-light" />{status.message}</div>
        {result && <ResultTable result={result} />}
        <p className="dev-note">{question.id === 6 ? "Submit uses the server judge and requires sign-in. Run and hints here are non-scoring practice." : "Practice preview: server grading for this archive is not released yet. Visible passes do not unlock districts or award XP."}</p>
      </section>}
      <footer className="world-label"><span>DILLI KHOJ · ARCHIVE NETWORK</span><span>{import.meta.env.DEV && <><a className="admin-entry" href="#admin">Authoring map</a> · </>}Local practice</span></footer>
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong. Try again.";
}
