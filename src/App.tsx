import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ResultTable } from "./components/ResultTable";
import { preparePracticeDatabase, runPracticeQuery } from "./db/practice-db";
import { RuinScene } from "./game/RuinScene";
import { IntroOverlay } from "./game/IntroOverlay";
import { PlayerMap } from "./game/PlayerMap";
import { GameEntry, type PlayerIdentity } from "./game/GameEntry";
import { CommunityPanel } from "./game/CommunityPanel";
import {
  fetchGameState,
  gameAction,
  gameRpc,
  type GameState,
} from "./lib/game";
import revisits from "./questions/revisits.generated.json";
import { RUIN_SEQUENCE, ruinById } from "./game/ruins";
import {
  parsePracticeSession,
  practiceStorageKey,
} from "./game/practice-session";
import { allCleared, clampToUnlocked, isUnlocked } from "./game/progression";
import { submitToJudge } from "./lib/judge";
import { supabase } from "./lib/supabase";
import { practiceQuestion } from "./questions/practice";
import { matchesOrderedResult, type TabularResult } from "./sql/result-policy";

// Solutions belong to authoring, never the student production bundle.
const WorldMap = import.meta.env.DEV
  ? lazy(() =>
      import("./admin/WorldMap").then((module) => ({
        default: module.WorldMap,
      })),
    )
  : null;
type Status = {
  kind: "idle" | "loading" | "pass" | "fail" | "error";
  message: string;
};
const INTRO_SEEN_KEY = "dk_intro_seen_v1";

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (hash.startsWith("#admin") && WorldMap) {
    return (
      <Suspense fallback={<p>Opening authoring map…</p>}>
        <WorldMap />
      </Suspense>
    );
  }
  if (import.meta.env.PROD && !supabase) {
    return (
      <main className="gate-backdrop" role="alert">
        <div className="gate-card">
          <h1>Dilli Khoj is unavailable</h1>
          <p>Sign-in is not configured. Please contact the game organizer.</p>
        </div>
      </main>
    );
  }

  return (
    <GameEntry>
      {(player, onExit) => (
        <GameShell
          key={player?.id ?? "local-dev"}
          player={player}
          onExit={onExit}
        />
      )}
    </GameEntry>
  );
}

function GameShell({
  player,
  onExit,
}: {
  player: PlayerIdentity | null;
  onExit: () => void;
}) {
  const offline = !player;
  const storageKey = practiceStorageKey(player?.id ?? null);
  const signedInName = player?.name ?? null;
  const [server, setServer] = useState<GameState | null>(null);
  const [serverError, setServerError] = useState("");
  const [community, setCommunity] = useState<"leaderboard" | "admin" | null>(
    null,
  );
  const [revisit, setRevisit] = useState<{
    ruin: number;
    variant: number;
  } | null>(null);
  const [devHints, setDevHints] = useState<string[]>([]);
  const alive = useRef(true);
  const refreshRevision = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const refresh = useCallback(async () => {
    if (offline) return;
    const revision = ++refreshRevision.current;
    try {
      const next = await fetchGameState();
      if (alive.current && revision === refreshRevision.current) {
        setServer(next);
        setServerError("");
      }
    } catch (error) {
      if (alive.current && revision === refreshRevision.current)
        setServerError(getErrorMessage(error));
    }
  }, [offline]);
  useEffect(() => {
    if (offline) return;
    const update = () => {
      void refresh().catch((e) => {
        if (alive.current) setServerError(e.message);
      });
    };
    update();
    window.addEventListener("focus", update);
    const timer = window.setInterval(update, 30000);
    return () => {
      window.removeEventListener("focus", update);
      window.clearInterval(timer);
    };
  }, [offline, refresh]);
  const [session, setSession] = useState(() => {
    try {
      return parsePracticeSession(localStorage.getItem(storageKey));
    } catch {
      return parsePracticeSession(null);
    }
  });
  const cleared = offline ? session.passed : (server?.cleared ?? []);
  const baseQuestion = practiceQuestion(session.selectedId);
  const revisitQuestion =
    revisit?.ruin === session.selectedId
      ? revisits.find(
          (v) => v.ruin === revisit.ruin && v.variant === revisit.variant,
        )
      : undefined;
  const question = revisitQuestion
    ? { ...baseQuestion, ...revisitQuestion }
    : baseQuestion;
  const progress = server?.progress.find((p) => p.ruin === question.id);
  const hints = offline ? devHints : (progress?.hints ?? []);
  const xp = server?.xp ?? null;
  const topic = ruinById(question.id)!;
  const [revisitDraft, setRevisitDraft] = useState("");
  const sql = revisitQuestion
    ? revisitDraft
    : (session.drafts[question.id] ?? question.starterSql);
  const [nearTerminal, setNearTerminal] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(true);
  const [result, setResult] = useState<TabularResult | null>(null);
  const [status, setStatus] = useState<Status>({
    kind: "loading",
    message: "Waking the local PostgreSQL archive…",
  });
  const [hintsShown, setHintsShown] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const operation = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
      setStorageAvailable(true);
    } catch {
      setStorageAvailable(false);
    }
  }, [session, storageKey]);

  // Sequential passage: never sit on a locked (future) ruin; start at the frontier.
  useEffect(() => {
    if (!offline && !server) return;
    setSession((current) => {
      const clamped = clampToUnlocked(current.selectedId, cleared);
      return clamped === current.selectedId
        ? current
        : { ...current, selectedId: clamped };
    });
  }, [JSON.stringify(cleared), Boolean(server)]);

  // Offline preview stays separate; signed-in awards are server transactions.
  useEffect(() => {
    if (!offline) {
      if (server && isUnlocked(question.id, cleared))
        void gameAction("survey", question.id)
          .then(refresh)
          .catch((e) => {
            if (alive.current) setServerError(e.message);
          });
      return;
    }
    setSession((current) => {
      const surveyed = current.surveyed.includes(question.id)
        ? current.surveyed
        : [...current.surveyed, question.id];
      const startedAt = current.startedAt ?? Date.now();
      if (surveyed === current.surveyed && startedAt === current.startedAt)
        return current;
      return { ...current, surveyed, startedAt };
    });
  }, [question.id, offline, Boolean(server)]);

  useEffect(() => {
    if (offline && allCleared(session.passed) && session.completedAt === null) {
      setSession((current) => ({ ...current, completedAt: Date.now() }));
    }
  }, [session.passed, session.completedAt, offline]);

  useEffect(() => {
    if (import.meta.env.DEV && offline) {
      let active = true;
      void import("./questions/catalog").then(({ RUIN_QUESTIONS }) => {
        if (active)
          setDevHints(
            RUIN_QUESTIONS.find((q) => q.id === question.id)?.hints ?? [],
          );
      });
      return () => {
        active = false;
      };
    }
  }, [question.id, offline]);

  useEffect(() => {
    const request = ++operation.current;
    busy.current = true;
    setResult(null);
    setHintsShown(0);
    setStatus({
      kind: "loading",
      message: "Opening this archive's practice tables…",
    });
    preparePracticeDatabase(question.id)
      .then(() => {
        if (operation.current === request)
          setStatus({
            kind: "idle",
            message:
              "Ready. Run checks the visible case; practice never changes official XP.",
          });
      })
      .catch((error: unknown) => {
        if (operation.current === request)
          setStatus({ kind: "error", message: getErrorMessage(error) });
      })
      .finally(() => {
        if (operation.current === request) busy.current = false;
      });
    return () => {
      operation.current += 1;
    };
  }, [question.id]);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      /* session-only */
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("textarea,input,select,button,[contenteditable=true]")
      )
        return;
      if (event.code === "KeyE" && nearTerminal && !showIntro)
        setTerminalOpen(true);
      if (event.code === "Escape") setTerminalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearTerminal, showIntro]);

  const selectArchive = async (id: number) => {
    if (busy.current) return;
    if (!isUnlocked(id, cleared)) return; // sequential: locked ruins are not openable
    busy.current = true;
    setRevisit(null);
    setResult(null);
    try {
      if (cleared.includes(id)) {
        try {
          const next = offline
            ? { variant: Date.now() % 2 }
            : await gameRpc<{ variant: number }>("begin_revisit", {
                ruin: id,
                request_id: crypto.randomUUID(),
              });
          if (!alive.current) return;
          setRevisit({ ruin: id, variant: next.variant });
          setRevisitDraft(practiceQuestion(id).starterSql);
        } catch (e) {
          setStatus({ kind: "error", message: getErrorMessage(e) });
          return;
        }
      }
      setSession((current) => ({ ...current, selectedId: id }));
      setTerminalOpen(true);
    } finally {
      busy.current = false;
    }
  };

  const handleRun = async () => {
    if (busy.current) return;
    busy.current = true;
    const request = ++operation.current;
    setStatus({
      kind: "loading",
      message: "Running on this archive's visible fixture…",
    });
    try {
      const nextResult = await runPracticeQuery(sql, question.id);
      if (operation.current !== request) return;
      setResult(nextResult);
      const passed = matchesOrderedResult(nextResult, question.expected);
      if (passed && offline && !revisitQuestion)
        setSession((current) => ({
          ...current,
          passed: [...new Set([...current.passed, question.id])],
        }));
      setStatus(
        passed
          ? {
              kind: "pass",
              message: revisitQuestion
                ? "Visible case passed! Revisit complete; XP and official progression are unchanged."
                : offline
                  ? "Visible case passed! Try the next archive, or experiment here. No official XP awarded."
                  : "Visible case passed! Submit to restore this ruin. Run never awards XP or unlocks ruins.",
            }
          : {
              kind: "fail",
              message:
                "Not quite. Check the columns, rows and sorting. Wrong runs cost nothing.",
            },
      );
    } catch (error) {
      if (operation.current !== request) return;
      setResult(null);
      setStatus({ kind: "error", message: getErrorMessage(error) });
    } finally {
      if (operation.current === request) busy.current = false;
    }
  };

  const handleSubmit = async () => {
    if (busy.current || offline || revisitQuestion) return;
    busy.current = true;
    const request = ++operation.current;
    setResult(null);
    setStatus({
      kind: "loading",
      message: "Sending to the authoritative judge…",
    });
    try {
      const verdict = await submitToJudge(sql, question.id);
      if (operation.current !== request) return;
      await refresh();
      setStatus({
        kind: verdict.correct ? "pass" : "fail",
        message: `${verdict.message} ${verdict.casesPassed}/${verdict.casesTotal} cases passed.`,
      });
    } catch (error) {
      if (operation.current === request)
        setStatus({ kind: "error", message: getErrorMessage(error) });
    } finally {
      if (operation.current === request) busy.current = false;
    }
  };

  const purchase = async (kind: "hint" | "reveal") => {
    if (busy.current || offline) return;
    busy.current = true;
    setStatus({ kind: "loading", message: "Opening purchased help…" });
    try {
      await gameAction(
        kind,
        question.id,
        kind === "hint" ? (progress?.hintsOpened ?? 0) + 1 : null,
      );
      await refresh();
      if (alive.current)
        setStatus({
          kind: "idle",
          message: "Help opened. Solving is still required.",
        });
    } catch (e) {
      if (alive.current)
        setStatus({ kind: "error", message: getErrorMessage(e) });
    } finally {
      busy.current = false;
    }
  };
  if (!offline && (!server || serverError))
    return (
      <main className="gate-backdrop">
        <div className="gate-card">
          <h1>
            {serverError ? "Server play unavailable" : "Loading your progress…"}
          </h1>
          <p role="alert">
            {serverError || "Checking account access and saved progress."}
          </p>
          <button
            onClick={() =>
              void refresh().catch((e) => setServerError(e.message))
            }
          >
            Retry
          </button>
          <button onClick={onExit}>Sign out</button>
        </div>
      </main>
    );
  const loading = status.kind === "loading";
  return (
    <main className="app-shell">
      <RuinScene
        onProximityChange={setNearTerminal}
        inputPaused={terminalOpen || showIntro || showMap || Boolean(community)}
      />
      {showIntro && <IntroOverlay onClose={dismissIntro} />}
      {community && (
        <CommunityPanel
          admin={community === "admin"}
          onClose={() => setCommunity(null)}
        />
      )}
      {showMap && (
        <PlayerMap
          cleared={cleared}
          onSelect={selectArchive}
          onClose={() => setShowMap(false)}
        />
      )}
      <header className="topbar">
        <div>
          <p className="eyebrow">
            DELHI // ARCHIVE {String(question.id).padStart(2, "0")}
          </p>
          <h1>Dilli Khoj</h1>
        </div>
        <div className="player-strip">
          <button
            className="ghost-button help-button"
            onClick={() => setShowIntro(true)}
            aria-label="How to play"
          >
            ?
          </button>
          <span className="xp-chip">
            {xp === null ? "Practice mode" : `${xp} XP`}
          </span>
          {signedInName && <span className="identity">{signedInName}</span>}
          <button className="ghost-button" onClick={onExit}>
            {offline ? "Exit local preview" : "Sign out"}
          </button>
          {!offline && (
            <button
              className="ghost-button"
              onClick={() => setCommunity("leaderboard")}
            >
              Leaderboard
            </button>
          )}
          {server?.isAdmin && (
            <button
              className="ghost-button"
              onClick={() => setCommunity("admin")}
            >
              Admin
            </button>
          )}
        </div>
      </header>
      <aside className="mission-card">
        <p className="eyebrow">
          RUIN {String(topic.id).padStart(2, "0")} · MODULE {topic.module}
        </p>
        <h2>{topic.place}</h2>
        <p>
          {topic.target}. Restore this ruin to unlock the next; revisit restored
          ruins from your map.
        </p>
        <div className="mission-progress">
          <span>Ruins restored</span>
          <strong>{cleared.length} / 20</strong>
        </div>
        <div className="mission-actions">
          <button
            className="ghost-button archive-open"
            onClick={() => setTerminalOpen(true)}
          >
            Open archive
          </button>
          <button
            className="ghost-button archive-open"
            onClick={() => setShowMap(true)}
          >
            World map
          </button>
        </div>
      </aside>
      {nearTerminal && !terminalOpen && (
        <button
          className="interact-prompt"
          onClick={() => setTerminalOpen(true)}
        >
          <kbd>E</kbd> Open SQL archive
        </button>
      )}
      {terminalOpen && (
        <section className="terminal-panel" aria-label="SQL challenge">
          <div className="terminal-header">
            <div>
              <p className="eyebrow">
                RUIN {String(question.id).padStart(2, "0")} ·{" "}
                {revisitQuestion
                  ? "REVISIT · NO SCORE"
                  : offline
                    ? "LOCAL PREVIEW"
                    : "ARCHIVE"}
              </p>
              <h2>{question.title}</h2>
            </div>
            <button
              className="icon-button"
              onClick={() => setTerminalOpen(false)}
              aria-label="Close terminal"
            >
              ×
            </button>
          </div>
          <nav className="archive-navigation" aria-label="Archive browser">
            <button
              className="ghost-button"
              aria-label="Previous archive"
              disabled={loading || question.id === 1}
              onClick={() => selectArchive(question.id - 1)}
            >
              ←
            </button>
            <select
              aria-label="Choose archive"
              value={question.id}
              disabled={loading}
              onChange={(event) => selectArchive(Number(event.target.value))}
            >
              {RUIN_SEQUENCE.map((entry) => {
                const unlocked = isUnlocked(entry.id, cleared);
                const mark = cleared.includes(entry.id)
                  ? "✓ "
                  : unlocked
                    ? ""
                    : "🔒 ";
                return (
                  <option key={entry.id} value={entry.id} disabled={!unlocked}>
                    {mark}
                    {String(entry.id).padStart(2, "0")} · {entry.place}
                  </option>
                );
              })}
            </select>
            <button
              className="ghost-button"
              aria-label="Next archive"
              disabled={
                loading ||
                question.id === 20 ||
                !isUnlocked(question.id + 1, cleared)
              }
              onClick={() => selectArchive(question.id + 1)}
            >
              →
            </button>
          </nav>
          <p className="question-copy">{question.description}</p>
          <div className="sample-block">
            <span>
              Sample output · {question.ordered ? "order matters" : "any order"}
            </span>
          </div>
          <ResultTable
            result={{
              columns: question.sampleColumns,
              rows: question.sampleRows.map((row) =>
                Object.fromEntries(
                  question.sampleColumns.map((column, index) => [
                    column,
                    row[index],
                  ]),
                ),
              ),
            }}
          />
          <details className="schema-block">
            <summary>
              Schema · {question.schema.map((table) => table.name).join(", ")}
            </summary>
            {question.schema.map((table) => (
              <div className="archive-schema" key={table.name}>
                <strong>{table.name}</strong>
                {table.columns.map((column) => (
                  <code key={column.name}>
                    {column.name} · {column.type}
                    {column.note ? ` · ${column.note}` : ""}
                  </code>
                ))}
              </div>
            ))}
          </details>
          <label className="editor-label" htmlFor="sql-editor">
            Query{" "}
            <span className="draft-note">
              {storageAvailable
                ? "Saved on this device"
                : "Storage unavailable · copy your query before leaving"}
            </span>
          </label>
          <textarea
            id="sql-editor"
            className="sql-editor"
            value={sql}
            disabled={loading}
            spellCheck={false}
            onChange={(event) => {
              const value = event.target.value;
              if (revisitQuestion) {
                setRevisitDraft(value);
                return;
              }
              setSession((current) => ({
                ...current,
                drafts: { ...current.drafts, [question.id]: value },
              }));
            }}
          />
          <div className="terminal-actions">
            {!revisitQuestion && (
              <button
                className="hint-button"
                disabled={
                  loading ||
                  (offline
                    ? hintsShown >= question.hintCount
                    : (progress?.hintsOpened ?? 0) >= question.hintCount ||
                      (xp ?? 0) < 10 ||
                      Boolean(server?.completedAt))
                }
                onClick={() =>
                  offline ? setHintsShown((n) => n + 1) : void purchase("hint")
                }
              >
                {offline
                  ? `Hint ${hintsShown + 1} · free practice`
                  : `Hint ${(progress?.hintsOpened ?? 0) + 1} · 10 XP`}
              </button>
            )}
            {!offline && !revisitQuestion && (
              <button
                className="hint-button"
                disabled={
                  loading ||
                  Boolean(progress?.revealed) ||
                  (progress?.hintsOpened ?? 0) < question.hintCount ||
                  (xp ?? 0) < 20 ||
                  Boolean(server?.completedAt)
                }
                onClick={() => void purchase("reveal")}
              >
                Reveal · 20 XP
              </button>
            )}
            <div>
              <button
                className="secondary-button"
                onClick={() => void handleRun()}
                disabled={loading}
              >
                Run
              </button>
              <button
                className="primary-button"
                onClick={() => void handleSubmit()}
                disabled={loading || offline || Boolean(revisitQuestion)}
                title="Server grading requires sign-in"
              >
                Submit
              </button>
            </div>
          </div>
          {!revisitQuestion &&
            (offline ? hints.slice(0, hintsShown) : hints).map(
              (hint, index) => (
                <p className="hint-copy" key={hint}>
                  Hint {index + 1}: {hint}
                </p>
              ),
            )}
          {!revisitQuestion && progress?.solution && (
            <pre className="hint-copy">{progress.solution}</pre>
          )}
          <div className={`status-banner status-${status.kind}`} role="status">
            <span className="status-light" />
            {status.message}
          </div>
          {result && <ResultTable result={result} />}
          <p className="dev-note">
            {revisitQuestion
              ? "Revisit practice changes no XP, completion time or unlocks."
              : offline
                ? "Local preview only. Sign in for official progression."
                : "Run is free practice. Only a passing Submit restores a ruin."}
          </p>
        </section>
      )}
      <footer className="world-label">
        <span>DILLI KHOJ · ARCHIVE NETWORK</span>
        <span>
          {import.meta.env.DEV && (
            <>
              <a className="admin-entry" href="#admin">
                Authoring map
              </a>{" "}
              ·{" "}
            </>
          )}
          {offline ? "Local preview" : "Server progression"}
        </span>
      </footer>
    </main>
  );
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Try again.";
}
