import { useEffect, useState } from "react";
import { GeographicMap } from "./GeographicMap";
import { gameRpc, type Leaderboard } from "../lib/game";
interface Player {
  id: string;
  display_name: string;
  email: string;
  xp: number;
  ruins_solved: number;
  completed_at: string | null;
}
interface Question {
  title: string;
  description: string;
  hints: string[];
  solution: string;
  dataset_version: string;
}
export function CommunityPanel({
  view,
  onClose,
  onOpenPlayer,
  initialRuin = 1,
}: {
  view: "leaderboard" | "admin" | "players";
  initialRuin?: number;
  onClose: () => void;
  /** Admin roster: open a single explorer's read-only profile. */
  onOpenPlayer?: (player: { id: string; name: string }) => void;
}) {
  const admin = view === "admin";
  const playersView = view === "players";
  const [adminVerified, setAdminVerified] = useState(false);
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [question, setQuestion] = useState<Question | null>(null);
  const [page, setPage] = useState(0);
  const [ruin, setRuin] = useState(initialRuin);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    setQuestion(null);
    setPlayers([]);
    const load = playersView
      ? gameRpc<Player[]>("admin_players", { page }).then((p) => {
          if (active) {
            setAdminVerified(true);
            setPlayers(p);
          }
        })
      : admin
        ? gameRpc<Question>("admin_question", { ruin }).then((q) => {
            if (active) {
              setAdminVerified(true);
              setQuestion(q);
            }
          })
        : gameRpc<Leaderboard>("completion_leaderboard").then((b) => {
            if (active) setBoard(b);
          });
    void load
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [view, admin, playersView, page, ruin]);
  const time = (ms: number) =>
    `${Math.floor(ms / 3600000)}h ${Math.floor(ms / 60000) % 60}m ${Math.floor(ms / 1000) % 60}s`;
  return (
    <div
      className="pmap-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={
        playersView
          ? "Players"
          : admin
            ? "Administration"
            : "Completion leaderboard"
      }
    >
      <div className="pmap-card community-card">
        <button
          className="icon-button pmap-close"
          onClick={onClose}
          aria-label="Close panel"
        >
          ×
        </button>
        <h2>
          {playersView
            ? "Players"
            : admin
              ? "Administration"
              : "Completion leaderboard"}
        </h2>
        {error && <p role="alert">{error}</p>}
        {loading && <p>Loading…</p>}
        {!admin && board && (
          <>
            <p>
              Completers only. Ranked by XP, then time from sign-up to
              completion.
            </p>
            {!board.top.length && (
              <p>No explorer has completed all twenty ruins yet.</p>
            )}
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Explorer</th>
                  <th>XP</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {board.top.map((row, i) => (
                  <tr key={i}>
                    <td>{row.rank}</td>
                    <td>
                      {row.name}
                      {row.isYou ? " (you)" : ""}
                    </td>
                    <td>{row.xp}</td>
                    <td>{time(row.completionMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {board.you && (
              <p>
                Your rank: {board.you.rank} · {board.you.xp} XP ·{" "}
                {time(board.you.completionMs)}
              </p>
            )}
          </>
        )}
        {playersView && !error && adminVerified && (
          <>
            <p>
              Read-only player roster. Access is checked by the server and
              recorded in the audit log.
            </p>
            <h3>Players</h3>
            <table>
              <thead>
                <tr>
                  <th>Explorer</th>
                  <th>Email</th>
                  <th>XP</th>
                  <th>Cleared</th>
                </tr>
              </thead>
              <tbody>
                {players.map((p) => (
                  <tr key={p.id}>
                    <td>
                      {onOpenPlayer ? (
                        <button
                          type="button"
                          className="roster-link"
                          onClick={() =>
                            onOpenPlayer({ id: p.id, name: p.display_name })
                          }
                          aria-label={`View ${p.display_name}'s profile`}
                        >
                          {p.display_name}
                        </button>
                      ) : (
                        p.display_name
                      )}
                    </td>
                    <td>{p.email}</td>
                    <td>{p.xp}</td>
                    <td>{p.ruins_solved}/20</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              disabled={loading || page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous page
            </button>
            <button
              disabled={loading || players.length < 50}
              onClick={() => setPage((p) => p + 1)}
            >
              Next page
            </button>
          </>
        )}
        {admin && !error && (
          <>
            <p>
              Read-only player and content review. Access is checked by the
              server and recorded in the audit log.
            </p>
            {adminVerified && (
              <GeographicMap
                cleared={[]}
                fullAccess
                selectedId={ruin}
                onSelect={setRuin}
              />
            )}
            <h3>Question review</h3>
            <label>
              Ruin{" "}
              <select
                value={ruin}
                onChange={(e) => setRuin(Number(e.target.value))}
              >
                {Array.from({ length: 20 }, (_, i) => (
                  <option key={i + 1}>{i + 1}</option>
                ))}
              </select>
            </label>
            {question && (
              <>
                <h4>{question.title}</h4>
                <p>{question.description}</p>
                <p>Dataset: {question.dataset_version}</p>
                {question.hints.map((h) => (
                  <p key={h}>{h}</p>
                ))}
                <pre>{question.solution}</pre>
              </>
            )}
            <p>
              Author changes in the local Question Studio, then review and
              regenerate versioned fixtures before release.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
