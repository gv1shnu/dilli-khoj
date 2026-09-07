import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ResultTable } from "./components/ResultTable";
import { FullscreenButton } from "./components/FullscreenButton";
import {
  preparePracticeDatabase,
  runPracticeQuery,
  warmPracticeDatabase,
} from "./db/practice-db";
import { RuinScene, type TrailTarget } from "./game/RuinScene";
import { IntroOverlay } from "./game/IntroOverlay";
import { CompletionOverlay } from "./game/CompletionOverlay";
import { RevisitChooser } from "./game/RevisitChooser";
import { PlayerMap } from "./game/PlayerMap";
import { GameEntry, type PlayerIdentity } from "./game/GameEntry";
import { PlayerProfile } from "./game/PlayerProfile";
import { CommunityPanel } from "./game/CommunityPanel";
import {
  fetchGameState,
  gameAction,
  gameRpc,
  type GameState,
} from "./lib/game";
import revisits from "./questions/revisits.generated.json";
import { toFriendlyError, type FriendlyError } from "./lib/errors";
import { ruinById } from "./game/ruins";
import {
  parsePracticeSession,
  practiceStorageKey,
} from "./game/practice-session";
import {
  allCleared,
  clampToUnlocked,
  currentRuinId,
  isUnlocked,
} from "./game/progression";
import { submitToJudge } from "./lib/judge";
import { supabase } from "./lib/supabase";
import { practiceQuestion } from "./questions/practice";
import { diagnoseOrderedResult, type TabularResult } from "./sql/result-policy";
import { hintCost, REVEAL_COST } from "./game/scoring";
import { restorationFor } from "./game/world/restorations";

// Solutions belong to authoring, never the student production bundle.
const WorldMap = import.meta.env.DEV
  ? lazy(() =>
      import("./admin/WorldMap").then((module) => ({
        default: module.WorldMap,
      })),
    )
  : null;
const WorldStudio = import.meta.env.DEV
  ? lazy(() =>
      import("./admin/WorldStudio").then((m) => ({ default: m.WorldStudio })),
    )
  : null;
type Status = {
  kind: "idle" | "loading" | "pass" | "fail" | "error";
  message: string;
  /** Raw technical text, revealed behind a "details" marker on error banners. */
  detail?: string | null;
};

// Player-facing error status; keeps the raw message for the details marker and
// logs the original error so developers still get full diagnostics.
function errorStatus(error: unknown): Status {
  console.error(error);
  const friendly = toFriendlyError(error);
  return { kind: "error", message: friendly.message, detail: friendly.detail };
}
const INTRO_SEEN_KEY = "dk_intro_seen_v1";
// The editor opens empty apart from a nudge; students write the whole query.
const BLANK_QUERY = "-- write your query here\n";

export function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  if (hash.startsWith("#world-studio") && WorldStudio)
    return (
      <Suspense fallback={<p>Opening city studio…</p>}>
        <WorldStudio />
      </Suspense>
    );
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
          walkthrough={import.meta.env.DEV && hash.startsWith("#walkthrough")}
        />
      )}
    </GameEntry>
  );
}

function GameShell({
  player,
  onExit,
  walkthrough = false,
}: {
  player: PlayerIdentity | null;
  onExit: () => void;
  walkthrough?: boolean;
}) {
  const offline = !player;
  const storageKey = practiceStorageKey(player?.id ?? null);
  const signedInName = player?.name ?? null;
  const [server, setServer] = useState<GameState | null>(null);
  const [serverError, setServerError] = useState<FriendlyError | null>(null);
  const failServer = useCallback((error: unknown) => {
    console.error(error);
    setServerError(toFriendlyError(error));
  }, []);
  const [showProfile, setShowProfile] = useState(false);
  const [adminRuin, setAdminRuin] = useState(1);
  const [community, setCommunity] = useState<"leaderboard" | "admin" | null>(
    null,
  );
  const [revisit, setRevisit] = useState<{
    ruin: number;
    variant: number;
  } | null>(null);
  // Ruin id whose revisit objective the player is currently choosing.
  const [revisitChoice, setRevisitChoice] = useState<number | null>(null);
  // Real rows of each schema table, read from the practice fixture for display.
  const [sampleTables, setSampleTables] = useState<
    Record<string, Awaited<ReturnType<typeof runPracticeQuery>>>
  >({});
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
    if (offline) return null;
    const revision = ++refreshRevision.current;
    try {
      const next = await fetchGameState();
      if (alive.current && revision === refreshRevision.current) {
        setServer(next);
        setServerError(null);
      }
      return next;
    } catch (error) {
      if (alive.current && revision === refreshRevision.current)
        failServer(error);
      return null;
    }
  }, [offline, failServer]);
  useEffect(() => {
    if (offline) return;
    let timer = 0;
    let lastRequestedAt = 0;
    const schedule = () => {
      window.clearTimeout(timer);
      // Jitter prevents a classroom of tabs opened together from polling in bursts.
      timer = window.setTimeout(update, 30_000 + Math.random() * 5_000);
    };
    const update = () => {
      if (document.hidden) {
        schedule();
        return;
      }
      const now = Date.now();
      if (now - lastRequestedAt < 1_000) return;
      lastRequestedAt = now;
      void refresh().catch((e) => {
        if (alive.current) failServer(e);
      });
      schedule();
    };
    const onVisible = () => {
      if (!document.hidden) update();
    };
    update();
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", onVisible);
      window.clearTimeout(timer);
    };
  }, [offline, refresh]);
  const [session, setSession] = useState(() => {
    try {
      return parsePracticeSession(localStorage.getItem(storageKey));
    } catch (error) {
      // Corrupt or unreadable saved session: start fresh, but leave a trail.
      console.warn("Could not read saved practice session; starting fresh.", error);
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
  const [revisitDraft, setRevisitDraft] = useState("");
  const sql = revisitQuestion
    ? revisitDraft
    : (session.drafts[question.id] ?? BLANK_QUERY);
  const [nearTerminal, setNearTerminal] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [nearArchive, setNearArchive] = useState<number | null>(null);
  const [locationId, setLocationId] = useState(1);
  const topic = ruinById(locationId)!;
  const restoredHere = cleared.includes(locationId);
  const [trailTarget, setTrailTarget] = useState<TrailTarget>("archive");
  const [travel, setTravel] = useState<{ id: number; nonce: number } | null>(
    null,
  );
  const [discovery, setDiscovery] = useState<{
    id: number;
    title: string;
    text: string;
  } | null>(null);
  const openNearby = useRef<() => void>(() => {});
  const [result, setResult] = useState<TabularResult | null>(null);
  const [status, setStatus] = useState<Status>({
    kind: "loading",
    message: "Waking the local PostgreSQL archive…",
  });
  const [hintsShown, setHintsShown] = useState(0);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showCompletion, setShowCompletion] = useState(false);
  const [restorationMoment, setRestorationMoment] = useState<{
    id: number;
    nonce: number;
  } | null>(null);
  // Fire the completion overlay when the final ruin is restored — not on every reload
  // of an already-finished game.
  const wasAllCleared = useRef(allCleared(cleared));
  useEffect(() => {
    const finished = allCleared(cleared);
    let timer = 0;
    if (finished && !wasAllCleared.current)
      timer = window.setTimeout(() => setShowCompletion(true), 6500);
    wasAllCleared.current = finished;
    return () => window.clearTimeout(timer);
  }, [cleared.length]);
  useEffect(() => {
    if (!restorationMoment) return;
    const timer = window.setTimeout(() => setRestorationMoment(null), 6200);
    return () => window.clearTimeout(timer);
  }, [restorationMoment]);
  const [xpFloats, setXpFloats] = useState<{ id: number; delta: number }[]>([]);
  const operation = useRef(0);
  const busy = useRef(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const xpAnchorRef = useRef<HTMLDivElement>(null);

  // Each new ruin begins by leading to its amber. Restoring it opens the
  // onward choice and makes the gate the most useful default. Map travel to a
  // restored ruin is a revisit, so it leads back to that ruin's amber.
  useEffect(() => {
    const arrivedViaMap = travel?.id === locationId;
    setTrailTarget(
      restoredHere && locationId < 20 && !arrivedViaMap ? "gate" : "archive",
    );
  }, [locationId, restoredHere, travel?.nonce]);

  // Put the cursor ready on the next line when a fresh archive opens.
  useEffect(() => {
    if (status.kind === "loading" || !terminalOpen) return;
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    const end = el.value.length;
    el.setSelectionRange(end, end);
  }, [question.id, terminalOpen, revisitQuestion, status.kind]);

  const showXpChange = (delta: number) => {
    if (delta === 0) return;
    const floatId = Date.now() + Math.random();
    setXpFloats((current) => [...current, { id: floatId, delta }]);
  };

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(session));
      setStorageAvailable(true);
    } catch (error) {
      // Storage blocked (private mode, quota): the UI already warns via the flag.
      console.warn("Local storage unavailable; progress won't persist.", error);
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
            if (alive.current) failServer(e);
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
    // Defer the large PGlite payload until the player is actually at (or opening) an
    // archive, so the 3D world claims startup bandwidth first on a slow connection. The
    // idle warm-up below usually has the engine ready before this runs.
    if (!nearTerminal && !terminalOpen) return;
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
          setStatus(errorStatus(error));
      })
      .finally(() => {
        if (operation.current === request) busy.current = false;
      });
    return () => {
      operation.current += 1;
    };
  }, [question.id, nearTerminal, terminalOpen]);

  // Load the real rows of each schema table so the panel can show a genuine
  // sample table (the same fixture the visible case runs against).
  useEffect(() => {
    if (!terminalOpen) return;
    let active = true;
    const tables = question.schema.map((table) => table.name);
    void (async () => {
      const collected: Record<
        string,
        Awaited<ReturnType<typeof runPracticeQuery>>
      > = {};
      for (const name of tables) {
        try {
          collected[name] = await runPracticeQuery(
            `SELECT * FROM "${name}"`,
            question.id,
          );
        } catch (error) {
          // A table we cannot read is simply omitted from the sample display.
          console.debug(`Skipping sample for table "${name}".`, error);
        }
      }
      if (active) setSampleTables(collected);
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id, terminalOpen]);

  // Warm the practice engine during browser idle time so the ~10 MB download starts
  // after the world is interactive, not in competition with it.
  useEffect(() => {
    const idle = window.requestIdleCallback?.bind(window);
    if (idle) {
      const handle = idle(() => warmPracticeDatabase(), { timeout: 4000 });
      return () => window.cancelIdleCallback?.(handle);
    }
    const timer = window.setTimeout(warmPracticeDatabase, 1500);
    return () => window.clearTimeout(timer);
  }, []);

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
    try {
      localStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch (error) {
      // Storage blocked: the intro will show again next session, which is fine.
      console.debug("Could not persist intro-seen flag.", error);
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("textarea,input,select,[contenteditable=true]")
      )
        return;
      if (
        event.code === "KeyE" &&
        nearTerminal &&
        !showIntro &&
        !showMap &&
        !community &&
        !showProfile
      )
        openNearby.current();
      if (event.code === "Escape") setTerminalOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [nearTerminal, showIntro, showMap, community, showProfile]);

  const selectArchive = async (id: number) => {
    if (busy.current) return;
    if (!isUnlocked(id, cleared) || id !== nearArchive) return; // Must stand at this unlocked archive.
    // A restored ruin opens the revisit chooser; the objective starts on choice.
    if (cleared.includes(id)) {
      setRevisitChoice(id);
      return;
    }
    busy.current = true;
    setRevisit(null);
    setResult(null);
    try {
      setSession((current) => ({ ...current, selectedId: id }));
      setTerminalOpen(true);
    } finally {
      busy.current = false;
    }
  };

  const startRevisit = async (id: number, variant: number) => {
    if (busy.current) return;
    busy.current = true;
    setRevisit(null);
    setResult(null);
    try {
      const next = offline
        ? { variant }
        : await gameRpc<{ variant: number }>("begin_revisit", {
            ruin: id,
            request_id: crypto.randomUUID(),
            chosen_variant: variant,
          });
      if (!alive.current) return;
      setRevisit({ ruin: id, variant: next.variant });
      setRevisitDraft(BLANK_QUERY);
      setRevisitChoice(null);
      setSession((current) => ({ ...current, selectedId: id }));
      setTerminalOpen(true);
    } catch (e) {
      setStatus(errorStatus(e));
      setRevisitChoice(null);
    } finally {
      busy.current = false;
    }
  };

  openNearby.current = () => {
    if (nearArchive !== null) void selectArchive(nearArchive);
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
      const diagnosis = diagnoseOrderedResult(nextResult, question.expected);
      const passed = diagnosis.code === "correct";
      const firstPracticePass =
        passed && offline && !revisitQuestion && !cleared.includes(question.id);
      if (firstPracticePass) {
        setSession((current) => ({
          ...current,
          passed: [...new Set([...current.passed, question.id])],
        }));
        setRestorationMoment({ id: question.id, nonce: Date.now() });
        setTrailTarget("gate");
        setTerminalOpen(false);
      }
      // Local preview has no saved score, but mirrors the live solve feedback
      // on every correct run so the avatar animation can be reviewed repeatedly.
      if (passed && offline) showXpChange(20);
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
              message: `Not quite. ${diagnosis.message} Wrong runs cost nothing.`,
            },
      );
    } catch (error) {
      if (operation.current !== request) return;
      setResult(null);
      setStatus(errorStatus(error));
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
      const xpBefore = server?.xp ?? null;
      const alreadyRestored = cleared.includes(question.id);
      const verdict = await submitToJudge(sql, question.id);
      if (operation.current !== request) return;
      const refreshed = await refresh();
      if (xpBefore !== null)
        showXpChange((refreshed?.xp ?? verdict.xp) - xpBefore);
      if (
        verdict.correct &&
        !alreadyRestored &&
        refreshed?.cleared.includes(question.id)
      ) {
        setRestorationMoment({ id: question.id, nonce: Date.now() });
        setTrailTarget("gate");
        setTerminalOpen(false);
      }
      setStatus({
        kind: verdict.correct ? "pass" : "fail",
        message: `${verdict.message} ${verdict.casesPassed}/${verdict.casesTotal} cases passed.`,
      });
    } catch (error) {
      if (operation.current === request)
        setStatus(errorStatus(error));
    } finally {
      if (operation.current === request) busy.current = false;
    }
  };

  const purchase = async (kind: "hint" | "reveal") => {
    if (busy.current || offline) return;
    busy.current = true;
    setStatus({ kind: "loading", message: "Opening purchased help…" });
    try {
      const xpBefore = server?.xp ?? null;
      await gameAction(
        kind,
        question.id,
        kind === "hint" ? (progress?.hintsOpened ?? 0) + 1 : null,
      );
      const refreshed = await refresh();
      if (xpBefore !== null && refreshed) showXpChange(refreshed.xp - xpBefore);
      if (alive.current)
        setStatus({
          kind: "idle",
          message: "Help opened. Solving is still required.",
        });
    } catch (e) {
      if (alive.current)
        setStatus(errorStatus(e));
    } finally {
      busy.current = false;
    }
  };
  const nextHint = (progress?.hintsOpened ?? 0) + 1;
  const nextHintCost = hintCost(nextHint);
  if (!offline && (!server || serverError))
    return (
      <main className="gate-backdrop">
        <div className={`gate-card${serverError ? " gate-card--error" : ""}`}>
          <h1>
            {serverError ? "Can't load the game" : "Loading your progress…"}
          </h1>
          <p role="alert">
            {serverError?.message ??
              "Checking account access and saved progress."}
          </p>
          <button onClick={() => void refresh().catch(failServer)}>
            Try again
          </button>
          <button onClick={onExit}>Sign out</button>
          {serverError?.detail && (
            <details className="error-details">
              <summary>Details</summary>
              <pre>{serverError.detail}</pre>
            </details>
          )}
        </div>
      </main>
    );
  const loading = status.kind === "loading";
  return (
    <main className="app-shell">
      <RuinScene
        onProximityChange={setNearTerminal}
        cleared={cleared}
        storageKey={storageKey}
        travel={travel}
        onArchiveNear={setNearArchive}
        onLocationChange={setLocationId}
        onPortalEnter={(id) => {
          setTerminalOpen(false);
          setRevisit(null);
          setSession((current) => ({ ...current, selectedId: id }));
        }}
        onDiscovery={setDiscovery}
        inputPaused={
          terminalOpen ||
          showIntro ||
          showMap ||
          showCompletion ||
          Boolean(community) ||
          showProfile
        }
        autoWalk={walkthrough}
        trailTarget={trailTarget}
        restorationSignal={restorationMoment}
        xpAnchor={xpAnchorRef}
      />
      {xpFloats.length > 0 && (
        <div
          ref={xpAnchorRef}
          className="xp-floats"
          role="status"
          aria-label="Experience change"
          aria-live="polite"
        >
          {xpFloats.map((f) => (
            <span
              key={f.id}
              className={`xp-float ${f.delta >= 0 ? "xp-float--gain" : "xp-float--loss"}`}
              onAnimationEnd={() =>
                setXpFloats((current) =>
                  current.filter((item) => item.id !== f.id),
                )
              }
            >
              {f.delta >= 0 ? "+" : "−"}
              {Math.abs(f.delta)} XP
            </span>
          ))}
        </div>
      )}
      {restorationMoment && (
        <aside className="restoration-toast" role="status" aria-live="polite">
          <span>
            RESTORATION {String(restorationMoment.id).padStart(2, "0")}
          </span>
          <h2>{restorationFor(restorationMoment.id).title}</h2>
          <p>{restorationFor(restorationMoment.id).detail}</p>
          <button
            className="ghost-button"
            onClick={() => setRestorationMoment(null)}
          >
            Follow the trail
          </button>
        </aside>
      )}
      {showIntro && <IntroOverlay onClose={dismissIntro} />}
      {revisitChoice !== null && (
        <RevisitChooser
          options={revisits.filter((v) => v.ruin === revisitChoice)}
          onChoose={(variant) => void startRevisit(revisitChoice, variant)}
          onClose={() => setRevisitChoice(null)}
        />
      )}
      {showCompletion && (
        <CompletionOverlay
          canViewLeaderboard={!offline}
          onViewLeaderboard={() => {
            setShowCompletion(false);
            setCommunity("leaderboard");
          }}
          onRevisit={() => {
            setShowCompletion(false);
            setShowMap(true);
          }}
          onClose={() => setShowCompletion(false)}
        />
      )}
      {showProfile && player && (
        <PlayerProfile
          onClose={() => setShowProfile(false)}
          onRevisit={(ruin) => {
            setShowProfile(false);
            setRevisitChoice(ruin);
          }}
        />
      )}
      {community && (
        <CommunityPanel
          admin={community === "admin"}
          initialRuin={adminRuin}
          onClose={() => setCommunity(null)}
        />
      )}
      {showMap && (
        <PlayerMap
          cleared={cleared}
          currentLocation={locationId}
          fullAccess={Boolean(server?.isAdmin)}
          onSelect={(id) => {
            if (server?.isAdmin) {
              setAdminRuin(id);
              setCommunity("admin");
            } else if (cleared.includes(id)) {
              setTerminalOpen(false);
              setTravel({ id, nonce: Date.now() });
            }
          }}
          onClose={() => setShowMap(false)}
        />
      )}
      <header className="topbar">
        <div className="brand-lockup">
          <img
            className="brand-mark"
            src="/favicon.svg"
            alt=""
            aria-hidden="true"
          />
          <div>
            <p className="eyebrow">
              DELHI // AREA {String(locationId).padStart(2, "0")}
            </p>
            <h1>Dilli Khoj</h1>
          </div>
        </div>
        <div className="player-strip">
          <FullscreenButton />
          <button
            className="ghost-button compact-map-button"
            onClick={(event) => {
              // Safari does not focus buttons on pointer click by default. Keep a
              // concrete opener so the map can restore focus when it closes.
              event.currentTarget.focus();
              setShowMap(true);
            }}
          >
            World map
          </button>
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
          {server?.explorers != null && (
            <span
              className="explorer-chip"
              title={`${server.explorers} explorers`}
              aria-label={`${server.explorers} explorers`}
            >
              <svg
                className="explorer-chip__icon"
                viewBox="0 0 24 24"
                width="14"
                height="14"
                aria-hidden="true"
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-3.31 0-6 2.24-6 5v1h12v-1c0-2.76-2.69-5-6-5Zm7.5-2A3.5 3.5 0 1 0 16 4.05a5.5 5.5 0 0 1 0 6.9c.16.03.33.05.5.05Zm.5 2c-.5 0-.98.06-1.43.16A6.9 6.9 0 0 1 17 18v1h4v-1c0-2.76-2.69-5-6-5Z"
                />
              </svg>
              {server.explorers}
            </span>
          )}
          {signedInName && (
            <button
              className="ghost-button profile-entry"
              aria-label="Your profile"
              onClick={(event) => {
                event.currentTarget.focus();
                setShowProfile(true);
              }}
            >
              <span className="profile-entry-name">{signedInName}</span>
              <span className="profile-entry-short">Profile</span>
            </button>
          )}
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
          {cleared.includes(locationId)
            ? locationId < 20
              ? "This ruin is restored. Point the amber trail back to its amber or through the open gate to the next ruin."
              : "All twenty ruins are restored. This final archive remains open to revisit."
            : "Follow the amber trail to this ruin's archive. Restore it to open the exit gate."}
        </p>
        <div className="mission-progress">
          <span>Ruins restored</span>
          <strong>{cleared.length} / 20</strong>
        </div>
        <div
          className="trail-selector"
          role="group"
          aria-label="Amber trail direction"
        >
          <span>TRAIL DIRECTION</span>
          <div>
            <button
              type="button"
              aria-pressed={trailTarget === "archive"}
              onClick={() => setTrailTarget("archive")}
            >
              Current amber
            </button>
            <button
              type="button"
              aria-pressed={trailTarget === "gate"}
              disabled={!restoredHere || locationId >= 20}
              title={
                locationId >= 20
                  ? "This is the final ruin"
                  : !restoredHere
                    ? "Restore this ruin to open its gate"
                    : "Point the trail toward the next ruin"
              }
              onClick={() => setTrailTarget("gate")}
            >
              Next gate
            </button>
          </div>
        </div>
        <div className="mission-actions">
          <button
            className="ghost-button archive-open"
            disabled={!nearTerminal || loading}
            onClick={() => openNearby.current()}
          >
            Open archive
          </button>
          <button
            className="ghost-button archive-open"
            onClick={(event) => {
              event.currentTarget.focus();
              setShowMap(true);
            }}
          >
            World map
          </button>
        </div>
      </aside>
      {!terminalOpen && (
        <div className="world-location" aria-live="polite">
          <span>YOU ARE EXPLORING</span>
          <strong>{ruinById(locationId)?.place}</strong>
          <small>
            WASD · run &nbsp; Shift · walk &nbsp; Drag · look &nbsp; M · sound
          </small>
        </div>
      )}
      {discovery && !terminalOpen && (
        <aside className="world-discovery">
          <span>FIELD NOTE / {String(discovery.id).padStart(2, "0")}</span>
          <h3>{discovery.title}</h3>
          <p>{discovery.text}</p>
        </aside>
      )}
      {nearTerminal && !terminalOpen && (
        <button
          className="interact-prompt"
          disabled={loading}
          onClick={() => openNearby.current()}
        >
          <kbd>E</kbd> Open archive {String(nearArchive).padStart(2, "0")}
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
          <p className="question-copy">{question.description}</p>
          {/* Schema — table structure, shown right after the description */}
          <div className="schema-block schema-open">
            {question.schema.map((table) => (
              <div className="archive-schema" key={table.name}>
                <span className="sample-label">Schema · {table.name}</span>
                <div className="schema-sample-scroll">
                  <table className="schema-sample">
                    <thead>
                      <tr>
                        <th>column</th>
                        <th>type</th>
                        <th>notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((column) => (
                        <tr key={column.name}>
                          <td>
                            <code>{column.name}</code>
                          </td>
                          <td>{column.type}</td>
                          <td>{column.note ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
          {/* Sample table — the real rows the correct query runs against */}
          {question.schema.map((table) =>
            sampleTables[table.name] ? (
              <div className="sample-section" key={table.name}>
                <span className="sample-label">Sample table · {table.name}</span>
                <ResultTable result={sampleTables[table.name]} />
              </div>
            ) : null,
          )}
          {/* Sample output — the correct output of the right query on the sample table */}
          <div className="sample-section">
            <span className="sample-label">
              Sample output · {question.ordered ? "order matters" : "any order"}
            </span>
            <ResultTable
              result={{
                columns: question.expected.columns,
                rows: question.expected.rows,
              }}
            />
          </div>
          <label className="editor-label" htmlFor="sql-editor">
            Query
            {!storageAvailable && (
              <span className="draft-note">
                {" "}
                Storage unavailable · copy your query before leaving
              </span>
            )}
          </label>
          <textarea
            id="sql-editor"
            className="sql-editor"
            ref={editorRef}
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
                      (xp ?? 0) < nextHintCost ||
                      Boolean(server?.completedAt))
                }
                onClick={() =>
                  offline ? setHintsShown((n) => n + 1) : void purchase("hint")
                }
              >
                {offline
                  ? `Clue ${hintsShown + 1} · free practice`
                  : nextHintCost === 0
                    ? `Clue ${nextHint} · free`
                    : `Clue ${nextHint} · ${nextHintCost} XP`}
              </button>
            )}
            {!offline && !revisitQuestion && (
              <button
                className="hint-button"
                disabled={
                  loading ||
                  Boolean(progress?.revealed) ||
                  (progress?.hintsOpened ?? 0) < question.hintCount ||
                  (xp ?? 0) < REVEAL_COST ||
                  Boolean(server?.completedAt)
                }
                onClick={() => void purchase("reveal")}
              >
                Reveal · {REVEAL_COST} XP
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
                title={
                  offline
                    ? "Sign in for server grading"
                    : revisitQuestion
                      ? "Revisits are practice only — not graded"
                      : undefined
                }
              >
                Submit
              </button>
            </div>
          </div>
          {!revisitQuestion &&
            (offline ? hints.slice(0, hintsShown) : hints).map(
              (hint, index) => (
                <p className="hint-copy" key={hint}>
                  Clue {index + 1}: {hint}
                </p>
              ),
            )}
          {!revisitQuestion && progress?.solution && (
            <pre className="hint-copy">{progress.solution}</pre>
          )}
          <div className={`status-banner status-${status.kind}`} role="status">
            <span className="status-light" />
            <span>{status.message}</span>
            {status.kind === "error" && status.detail && (
              <span className="status-meta" title={status.detail}>
                details
              </span>
            )}
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
          Developed by{" "}
          <a href="https://vishnugandarapu.in" target="_blank" rel="noreferrer">
            Vishnu Gandarapu
          </a>
        </span>
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
