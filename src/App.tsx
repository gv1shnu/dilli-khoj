import { useCallback, useEffect, useState } from "react";
import { ResultTable } from "./components/ResultTable";
import { preparePracticeDatabase, runPracticeQuery } from "./db/practice-db";
import { RuinScene } from "./game/RuinScene";
import { submitToJudge } from "./lib/judge";
import { signInWithGoogle, supabase } from "./lib/supabase";
import { ruinSix } from "./questions/ruin-six";
import { matchesOrderedResult, type TabularResult } from "./sql/result-policy";

type Status = { kind: "idle" | "loading" | "pass" | "fail" | "error"; message: string };

export function App() {
  const [nearTerminal, setNearTerminal] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [sql, setSql] = useState<string>(ruinSix.starterSql);
  const [result, setResult] = useState<TabularResult | null>(null);
  const [status, setStatus] = useState<Status>({
    kind: "loading",
    message: "Waking the local PostgreSQL archive…",
  });
  const [hintOpen, setHintOpen] = useState(false);
  const [signedInName, setSignedInName] = useState<string | null>(null);

  useEffect(() => {
    preparePracticeDatabase()
      .then(() => setStatus({ kind: "idle", message: "Local PostgreSQL is ready." }))
      .catch((error: unknown) =>
        setStatus({ kind: "error", message: getErrorMessage(error) }),
      );

    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => {
      const name = data.user?.user_metadata.full_name ?? data.user?.email;
      if (name) setSignedInName(String(name));
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      const name = session?.user.user_metadata.full_name ?? session?.user.email;
      setSignedInName(name ? String(name) : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "KeyE" && nearTerminal && !(event.target instanceof HTMLTextAreaElement)) {
        setTerminalOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearTerminal]);

  const handleRun = useCallback(async () => {
    setStatus({ kind: "loading", message: "Running on the visible practice fixture…" });
    try {
      const nextResult = await runPracticeQuery(sql);
      setResult(nextResult);
      const passesVisibleCase = matchesOrderedResult(nextResult, ruinSix.expected);
      setStatus(
        passesVisibleCase
          ? { kind: "pass", message: "Visible case passed. Submit checks the hidden cases." }
          : { kind: "fail", message: "The query ran, but the visible result does not match yet." },
      );
    } catch (error) {
      setResult(null);
      setStatus({ kind: "error", message: getErrorMessage(error) });
    }
  }, [sql]);

  const handleSubmit = useCallback(async () => {
    setStatus({ kind: "loading", message: "Sending to the authoritative judge…" });
    try {
      const verdict = await submitToJudge(sql);
      setStatus({
        kind: verdict.correct ? "pass" : "fail",
        message: `${verdict.message} ${verdict.casesPassed}/${verdict.casesTotal} cases passed.`,
      });
    } catch (error) {
      setStatus({ kind: "error", message: getErrorMessage(error) });
    }
  }, [sql]);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      setStatus({ kind: "error", message: getErrorMessage(error) });
    }
  };

  return (
    <main className="app-shell">
      <RuinScene onProximityChange={setNearTerminal} />

      <header className="topbar">
        <div>
          <p className="eyebrow">DELHI // ARCHIVE 06</p>
          <h1>Dilli Khoj</h1>
        </div>
        <div className="player-strip">
          <span className="xp-chip">100 XP</span>
          {signedInName ? (
            <span className="identity">{signedInName}</span>
          ) : (
            <button className="ghost-button" onClick={handleSignIn}>
              Sign in with Google
            </button>
          )}
        </div>
      </header>

      <aside className="mission-card">
        <p className="eyebrow">DISTRICT 02</p>
        <h2>{ruinSix.place}</h2>
        <p>Find the amber archive. Use WASD or arrow keys to move.</p>
        <div className="mission-progress">
          <span>Ruins restored</span>
          <strong>5 / 20</strong>
        </div>
      </aside>

      {nearTerminal && !terminalOpen && (
        <button className="interact-prompt" onClick={() => setTerminalOpen(true)}>
          <kbd>E</kbd> Open SQL archive
        </button>
      )}

      {terminalOpen && (
        <section className="terminal-panel" aria-label="SQL challenge">
          <div className="terminal-header">
            <div>
              <p className="eyebrow">RUIN {String(ruinSix.id).padStart(2, "0")}</p>
              <h2>{ruinSix.title}</h2>
            </div>
            <button className="icon-button" onClick={() => setTerminalOpen(false)} aria-label="Close terminal">
              ×
            </button>
          </div>

          <p className="question-copy">{ruinSix.description}</p>

          <details className="schema-block">
            <summary>Schema · stalls</summary>
            <code>stall_id int · stall_name text · ward_code text · status text · daily_rations int</code>
          </details>

          <div className="sample-block">
            <span>Sample output</span>
            <div className="sample-values">
              <code>stall_id</code>
              <code>21</code>
              <code>46</code>
            </div>
          </div>

          <label className="editor-label" htmlFor="sql-editor">
            Query
          </label>
          <textarea
            id="sql-editor"
            className="sql-editor"
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
          />

          <div className="terminal-actions">
            <button className="hint-button" onClick={() => setHintOpen((open) => !open)}>
              {hintOpen ? "Hide hint" : "Hint · −10 XP"}
            </button>
            <div>
              <button className="secondary-button" onClick={handleRun} disabled={status.kind === "loading"}>
                Run
              </button>
              <button className="primary-button" onClick={handleSubmit} disabled={status.kind === "loading"}>
                Submit
              </button>
            </div>
          </div>

          {hintOpen && <p className="hint-copy">{ruinSix.hints[0]}</p>}

          <div className={`status-banner status-${status.kind}`} role="status">
            <span className="status-light" />
            {status.message}
          </div>

          {result && <ResultTable result={result} />}

          {!supabase && (
            <p className="dev-note">
              Development mode: Run works locally. Add the publishable key and deploy the judge before Submit can award XP.
            </p>
          )}
        </section>
      )}

      <footer className="world-label">
        <span>SHAHJAHANABAD</span>
        <span>Signal: stable</span>
      </footer>
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}
