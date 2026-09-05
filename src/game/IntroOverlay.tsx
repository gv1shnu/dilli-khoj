interface IntroOverlayProps {
  onClose: () => void;
}

// First-run onboarding / how-to-play. Intentionally says nothing about an endgame,
// leaderboard or "finishing" — the world is presented as open-ended exploration.
// Reopenable any time from the "?" button in the top bar.

export function IntroOverlay({ onClose }: IntroOverlayProps) {
  return (
    <div
      className="intro-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="How to play Dilli Khoj"
    >
      <div className="intro-card">
        <button
          className="icon-button intro-close"
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>

        <p className="eyebrow">DILLI KHOJ</p>
        <h2 className="intro-title">The quiet city is waiting</h2>

        <p className="intro-lead">
          Long after the noise faded, old Delhi went still. Its records — who
          lived where, what moved through the bazaars, how the wards were run —
          were sealed away in scattered archives and slowly overgrown. You walk
          the ruins of Shahjahanabad to wake those archives, one question at a
          time.
        </p>

        <div className="intro-sections">
          <section className="intro-section">
            <h3>Moving around</h3>
            <ul className="intro-keys">
              <li>
                <kbd>W</kbd>
                <kbd>A</kbd>
                <kbd>S</kbd>
                <kbd>D</kbd> or <kbd>↑</kbd>
                <kbd>↓</kbd>
                <kbd>←</kbd>
                <kbd>→</kbd> — run
              </li>
              <li>
                <span className="intro-mouse">Drag</span> — look around
              </li>
              <li>
                <kbd>Shift</kbd> — walk
              </li>
              <li>
                <kbd>E</kbd> — open an archive you're standing at
              </li>
              <li>
                <kbd>M</kbd> — mute or unmute the ambience
              </li>
            </ul>
          </section>

          <section className="intro-section">
            <h3>Ruins &amp; ambers</h3>
            <p>
              <strong>Ruins</strong> are the broken places across the city —
              each one guards a sealed archive holding a question about the
              city's records.
            </p>
            <p>
              An <strong className="intro-amber">amber</strong> is that archive:
              the glowing light rising from a ruin. Twenty different places are
              connected by streets and gates. The arrows follow a walkable route
              to your next archive.
            </p>
          </section>

          <section className="intro-section intro-section--wide">
            <h3>Waking a ruin</h3>
            <ol className="intro-steps">
              <li>
                Walk into an amber and press <kbd>E</kbd> to open its archive.
              </li>
              <li>
                Read what the archive is asking for — the rows and columns it
                wants back.
              </li>
              <li>
                Use <span className="intro-run">Run</span> to try queries freely
                against the local records. It's unlimited and costs you nothing
                — experiment as much as you like.
              </li>
              <li>
                When your query looks right,{" "}
                <span className="intro-submit">Submit</span> it. The archive
                checks it for real against records you can't see. Get it right
                and the ruin wakes, its lights return, and the gate to the next
                area opens.
              </li>
              <li>
                Use the world map to travel to restored places. Future areas
                stay sealed until you restore the earlier archives.
              </li>
              <li>
                Stuck? Open a <strong>hint</strong> — it nudges you for a small
                cost. A wrong submission never costs anything, so submit
                whenever you want to test an idea.
              </li>
            </ol>
          </section>
        </div>

        <button className="primary-button intro-begin" onClick={onClose}>
          Step into the ruins
        </button>
      </div>
    </div>
  );
}
