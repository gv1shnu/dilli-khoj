import { useEffect, useRef } from "react";

interface CompletionOverlayProps {
  /** Whether a leaderboard exists to visit (signed-in play only). */
  canViewLeaderboard: boolean;
  onViewLeaderboard: () => void;
  onRevisit: () => void;
  onClose: () => void;
}

// Shown once every ruin is restored. It does not end the game — the world stays open —
// but it points the player at the two things left to do: see their name on the
// leaderboard, and revisit any ruin, each of which holds further practice questions.
export function CompletionOverlay({
  canViewLeaderboard,
  onViewLeaderboard,
  onRevisit,
  onClose,
}: CompletionOverlayProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    const root = dialog.current!;
    root.querySelector<HTMLButtonElement>("button")?.focus();
    const keys = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close.current();
        return;
      }
      if (event.key !== "Tab") return;
      const items = [
        ...root.querySelectorAll<HTMLElement>("button:not(:disabled)"),
      ];
      const first = items[0];
      const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    root.addEventListener("keydown", keys);
    return () => {
      root.removeEventListener("keydown", keys);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, []);

  return (
    <div
      className="intro-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Every ruin restored"
      ref={dialog}
    >
      <div className="intro-card completion-card">
        <button
          className="icon-button intro-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
        <p className="eyebrow">DILLI KHOJ</p>
        <h2 className="intro-title">The quiet city is awake</h2>
        <p className="intro-lead">
          You have woken all twenty archives and brought Shahjahanabad back to
          light. Nothing is locked away any more — the whole city is yours to
          wander.
        </p>
        <p className="intro-lead">
          {canViewLeaderboard
            ? "Your run now stands on the leaderboard. Every ruin also keeps further questions — revisit any of them to keep practising."
            : "Every ruin keeps further questions — revisit any of them to keep practising. Sign in to have a finished run counted on the leaderboard."}
        </p>
        <div className="completion-actions">
          {canViewLeaderboard && (
            <button className="primary-button" onClick={onViewLeaderboard}>
              View the leaderboard
            </button>
          )}
          <button className="ghost-button" onClick={onRevisit}>
            Revisit a ruin
          </button>
        </div>
      </div>
    </div>
  );
}
