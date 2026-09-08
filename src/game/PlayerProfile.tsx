import { useEffect, useRef, useState, type CSSProperties } from "react";
import { gameRpc } from "../lib/game";
import { supabase } from "../lib/supabase";
import { ruinById } from "./ruins";
import "./player-profile.css";

type Help = "independent" | "hint1" | "hint2" | "revealed" | "unknown";
export interface ProfileData {
  id: string;
  name: string;
  email: string;
  joinedAt: string;
  xp: number;
  completedAt: string | null;
  currentRuin: number | null;
  rank: number | null;
  ruins: {
    ruin: number;
    solvedAt: string | null;
    surveyed: boolean;
    help: Help | null;
    hintsOpened: number;
    revealed: boolean;
    attempts: number;
    incorrectAttempts: number;
    revisits: number;
  }[];
}
const labels: Record<Help, string> = {
  independent: "Without hints",
  hint1: "Hint 1 only",
  hint2: "Hint 2 used",
  revealed: "Solution revealed",
  unknown: "Earlier help unknown",
};
export function playerSignature(id: string) {
  let seed = 2166136261;
  for (const c of id) seed = Math.imul(seed ^ c.charCodeAt(0), 16777619) >>> 0;
  return {
    hue: seed % 360,
    turn: (seed >>> 8) % 90,
    seed,
    name:
      ["Monsoon", "Marigold", "Jamun", "Sandstone", "Peacock", "Moonlit"][
        seed % 6
      ] +
      " " +
      ["Cartographer", "Wayfinder", "Archivist", "Pathfinder", "Chronicler"][
        (seed >>> 12) % 5
      ],
  };
}
const date = (value: string) =>
  new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function PlayerProfile({
  onClose,
  onRevisit,
  target,
}: {
  onClose: () => void;
  onRevisit: (ruin: number) => void;
  /** When set, an admin is viewing this explorer's record read-only. */
  target?: { id: string; name: string };
}) {
  const adminView = Boolean(target);
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef(document.activeElement);
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  const [confirm, setConfirm] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    const root = dialog.current;
    root?.showModal();
    return () => {
      root?.close();
      if (returnFocus.current instanceof HTMLElement)
        returnFocus.current.focus();
    };
  }, []);
  useEffect(() => {
    let active = true;
    setError("");
    void gameRpc<ProfileData>(
      target ? "admin_player_profile" : "player_profile",
      target ? { target: target.id } : {},
    )
      .then((p) => {
        if (active) setData(p);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [reload, target?.id]);
  const signature = playerSignature(data?.id ?? "explorer");
  const solved = data?.ruins.filter((r) => r.solvedAt) ?? [];
  const sum = (key: "attempts" | "incorrectAttempts" | "revisits") =>
    data?.ruins.reduce((n, r) => n + r[key], 0) ?? 0;
  async function deleteAccount() {
    if (typed !== "DELETE" || deleting || !data) return;
    setDeleting(true);
    setError("");
    try {
      await gameRpc("delete_player_account", { confirmation: typed });
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Deletion failed. Please retry.",
      );
      setDeleting(false);
      return;
    }
    // Remove only this player's drafts and retry records, including older versions.
    try {
      for (const storage of [localStorage, sessionStorage])
        for (const key of Object.keys(storage))
          if (key.startsWith("dk_") && key.includes(data.id))
            storage.removeItem(key);
    } catch {
      /* Browser storage may be unavailable. */
    }
    await supabase?.auth.signOut({ scope: "local" }).catch(() => undefined);
    window.location.replace(window.location.pathname);
  }
  return (
    <dialog
      ref={dialog}
      className="explorer-profile"
      aria-labelledby={
        data ? (confirm ? "delete-title" : "profile-title") : undefined
      }
      aria-label={
        data
          ? undefined
          : adminView
            ? `${target?.name ?? "Explorer"}'s profile`
            : "Your profile"
      }
      style={
        {
          "--profile-hue": signature.hue,
          "--profile-turn": `${signature.turn}deg`,
        } as CSSProperties
      }
      onCancel={(e) => {
        e.preventDefault();
        if (!deleting) {
          if (confirm) {
            setConfirm(false);
            setError("");
          } else onClose();
        }
      }}
    >
      <div className="profile-paper">
        <nav className="profile-nav">
          <span>DILLI KHOJ / EXPLORER RECORDS</span>
          <button autoFocus onClick={onClose} disabled={deleting}>
            {adminView ? "Back to roster ↗" : "Back to the city ↗"}
          </button>
        </nav>
        {error && (
          <div role="alert" className="profile-error">
            {error}{" "}
            {!confirm && (
              <button onClick={() => setReload((n) => n + 1)}>Retry</button>
            )}
          </div>
        )}
        {!data && !error && (
          <h1 id="profile-title" role="status">
            {adminView
              ? `Opening ${target?.name ?? "explorer"}'s record…`
              : "Opening your field journal…"}
          </h1>
        )}
        {data &&
          (confirm ? (
            <section className="profile-confirm" aria-labelledby="delete-title">
              <span className="profile-kicker">CLOSE YOUR JOURNAL</span>
              <h1 id="delete-title">Delete your account?</h1>
              <p>
                This permanently removes your profile, XP, progress, submissions
                and leaderboard entry. Signing in again creates a new explorer.
                This cannot be undone.
              </p>
              <label htmlFor="delete-confirmation">
                Type DELETE to confirm
              </label>
              <input
                id="delete-confirmation"
                autoFocus
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                disabled={deleting}
                autoComplete="off"
              />
              <div className="profile-confirm-actions">
                <button
                  onClick={() => {
                    setConfirm(false);
                    setError("");
                  }}
                  disabled={deleting}
                >
                  Keep my account
                </button>
                <button
                  className="profile-delete"
                  disabled={typed !== "DELETE" || deleting}
                  onClick={() => void deleteAccount()}
                >
                  {deleting ? "Deleting…" : "Permanently delete account"}
                </button>
              </div>
            </section>
          ) : (
            <>
              <header className="profile-hero">
                <div>
                  <p className="profile-kicker">
                    {adminView
                      ? "EXPLORER RECORD · ADMIN VIEW"
                      : "YOUR PERSONAL FIELD JOURNAL"}
                  </p>
                  <p className="profile-alias">{signature.name}</p>
                  <h1 id="profile-title">{data.name}</h1>
                  <p className="profile-email">{data.email}</p>
                  <p className="profile-meta">
                    Exploring since {date(data.joinedAt)} · Record{" "}
                    {data.id.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div className="profile-seal" aria-hidden="true">
                  <svg viewBox="0 0 160 160">
                    <circle
                      cx="80"
                      cy="80"
                      r="73"
                      fill="none"
                      stroke="currentColor"
                    />
                    <g transform={`rotate(${signature.turn} 80 80)`}>
                      {Array.from({ length: 8 }, (_, i) => (
                        <path
                          key={i}
                          transform={`rotate(${i * 45} 80 80)`}
                          d={`M80 16 L${90 + ((signature.seed >>> (i * 3)) & 7)} 63 L80 80 L64 63 Z`}
                          fill="currentColor"
                          opacity={0.25 + i * 0.08}
                        />
                      ))}
                    </g>
                    <circle
                      cx="80"
                      cy="80"
                      r="25"
                      fill="var(--profile-paper)"
                    />
                    <text
                      x="80"
                      y="88"
                      textAnchor="middle"
                      fill="currentColor"
                      fontSize="23"
                    >
                      {data.name.trim().slice(0, 1).toUpperCase()}
                    </text>
                  </svg>
                  <span>ONE EXPLORER. ONE TRAIL.</span>
                </div>
              </header>
              <section
                className="profile-progress"
                aria-label="Current progress"
              >
                <div>
                  <span className="profile-kicker">
                    {data.currentRuin
                      ? `CURRENT LEVEL / ${String(data.currentRuin).padStart(2, "0")}`
                      : "JOURNEY COMPLETE"}
                  </span>
                  <h2>
                    {data.currentRuin
                      ? ruinById(data.currentRuin)?.place
                      : "You brought the city back."}
                  </h2>
                </div>
                <div className="profile-xp">
                  <strong>{data.xp}</strong> XP
                </div>
                <div
                  className="profile-track"
                  role="progressbar"
                  aria-label="Questions solved"
                  aria-valuenow={solved.length}
                  aria-valuemin={0}
                  aria-valuemax={20}
                >
                  {data.ruins.map((r) => (
                    <span
                      key={r.ruin}
                      className={r.solvedAt ? "is-solved" : ""}
                    />
                  ))}
                </div>
                <p>{solved.length} of 20 questions solved</p>
                <p>
                  {data.rank
                    ? `Leaderboard rank #${data.rank}`
                    : "Complete all 20 to enter the leaderboard"}
                </p>
              </section>
              <section className="profile-methods">
                <div className="profile-section-title">
                  <h2>How you found your way</h2>
                  <span>HELP USED BEFORE FIRST SOLVE</span>
                </div>
                <div className="profile-stat-grid">
                  {(
                    ["independent", "hint1", "hint2", "revealed"] as Help[]
                  ).map((kind, i) => (
                    <article key={kind}>
                      <span className="profile-stat-index">0{i + 1} /</span>
                      <strong>
                        {solved.filter((r) => r.help === kind).length}
                      </strong>
                      <h3>{labels[kind]}</h3>
                    </article>
                  ))}
                </div>
                {solved.some((r) => r.help === "unknown") && (
                  <p>
                    {solved.filter((r) => r.help === "unknown").length} earlier
                    solves have unknown help history.
                  </p>
                )}
                <p className="profile-footnote">
                  Each solve belongs to one category. Opening help afterward
                  never changes it. Revisits do not count toward official
                  solves.
                </p>
              </section>
              <section
                className="profile-secondary"
                aria-label="More statistics"
              >
                {[
                  [sum("attempts"), "Submissions"],
                  [sum("incorrectAttempts"), "Incorrect attempts"],
                  [
                    data.ruins.filter((r) => r.surveyed).length,
                    "Ruins surveyed",
                  ],
                  [sum("revisits"), "Revisits started"],
                  [
                    data.ruins.filter((r) => r.revealed && !r.solvedAt).length,
                    "Revealed, unsolved",
                  ],
                ].map(([value, label]) => (
                  <div key={label}>
                    <strong>{value}</strong>
                    <span>{label}</span>
                  </div>
                ))}
              </section>
              <section>
                <div className="profile-section-title">
                  <h2>Your trail through Delhi</h2>
                  <span>THE TWENTY ARCHIVES</span>
                </div>
                <ol className="profile-ruins">
                  {data.ruins.map((r) => (
                    <li key={r.ruin} className={r.solvedAt ? "is-solved" : ""}>
                      <span className="profile-ruin-number">
                        {String(r.ruin).padStart(2, "0")}
                      </span>
                      <div>
                        <h3>{ruinById(r.ruin)?.place}</h3>
                        <p>
                          {r.solvedAt
                            ? `${labels[r.help ?? "unknown"]} · ${date(r.solvedAt)}`
                            : r.ruin === data.currentRuin
                              ? r.revealed
                                ? "In progress · solution revealed"
                                : `In progress · ${r.hintsOpened} hints opened`
                              : "Not reached yet"}
                        </p>
                      </div>
                      <span className="profile-attempts">
                        {r.attempts} attempts
                      </span>
                      {r.solvedAt && !adminView && (
                        <button
                          onClick={() => onRevisit(r.ruin)}
                          aria-label={`Revisit ruin ${r.ruin}`}
                        >
                          Revisit ↗
                        </button>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
              <footer className="profile-footer">
                {adminView ? (
                  <span>Read-only · this view is recorded in the audit log.</span>
                ) : (
                  <>
                    <button
                      className="profile-delete"
                      onClick={() => {
                        setConfirm(true);
                        setTyped("");
                        setError("");
                      }}
                    >
                      Delete account
                    </button>
                    <span>Your journal, your journey.</span>
                  </>
                )}
              </footer>
            </>
          ))}
      </div>
    </dialog>
  );
}
