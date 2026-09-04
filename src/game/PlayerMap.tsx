import { DISTRICTS, ruinById } from "./ruins";
import { clearedCount, ruinState, type RuinState } from "./progression";

interface PlayerMapProps {
  cleared: number[];
  /** Open a ruin (current = continue, cleared = revisit). Locked ruins are not selectable. */
  onSelect: (id: number) => void;
  onClose: () => void;
}

const STATE_LABEL: Record<RuinState, string> = {
  cleared: "Restored — revisit",
  current: "Current — continue",
  locked: "Locked",
};

// The player's own map of the world: which ruins they have restored, which one is
// next, and which are still sealed. Restored ruins can be revisited for practice.
export function PlayerMap({ cleared, onSelect, onClose }: PlayerMapProps) {
  const done = clearedCount(cleared);

  return (
    <div className="pmap-backdrop" role="dialog" aria-modal="true" aria-label="Your world map">
      <div className="pmap-card">
        <button className="icon-button pmap-close" onClick={onClose} aria-label="Close map">×</button>
        <p className="eyebrow">DILLI KHOJ</p>
        <h2 className="pmap-title">Your map of the ruins</h2>
        <p className="pmap-lead">
          {done} of 20 ruins restored. Ruins open in order — restore the current one to
          reach the next. Tap a restored ruin to revisit its topic (practice only).
        </p>

        <div className="pmap-districts">
          {DISTRICTS.map((district) => (
            <section key={district.id} className="pmap-district">
              <header className="pmap-district-head">
                <span className="pmap-district-name">D{district.id} · {district.name}</span>
                <span className="pmap-colnote">{district.blurb}</span>
              </header>
              <div className="pmap-ruins">
                {district.ruinIds.map((id) => {
                  const ruin = ruinById(id)!;
                  const state = ruinState(id, cleared);
                  const selectable = state !== "locked";
                  return (
                    <button
                      key={id}
                      className={`pmap-ruin pmap-ruin--${state}`}
                      disabled={!selectable}
                      onClick={() => { if (selectable) { onSelect(id); onClose(); } }}
                      title={STATE_LABEL[state]}
                    >
                      <span className="pmap-ruin-id">
                        {state === "cleared" ? "✓" : state === "locked" ? "🔒" : String(id).padStart(2, "0")}
                      </span>
                      <span className="pmap-ruin-place">{ruin.place}</span>
                      <span className="pmap-ruin-state">{STATE_LABEL[state]}</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
