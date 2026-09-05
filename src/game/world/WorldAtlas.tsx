import { useState } from "react";
import { RUIN_SEQUENCE } from "../ruins";
import { currentRuinId, isUnlocked } from "../progression";

export function atlasPoint(id: number): readonly [number, number] {
  const row = Math.floor((id - 1) / 5);
  const step = (id - 1) % 5;
  const column = row % 2 === 0 ? step : 4 - step;
  return [70 + column * 115, 475 - row * 130];
}

export function WorldAtlas({
  cleared,
  currentLocation,
  onSelect,
}: {
  cleared: readonly number[];
  currentLocation: number;
  onSelect: (id: number) => void;
}) {
  const [selected, setSelected] = useState(currentLocation);
  const selectedRuin = RUIN_SEQUENCE.find((r) => r.id === selected)!;
  const frontier = currentRuinId(cleared);
  const route = RUIN_SEQUENCE.map((ruin) => atlasPoint(ruin.id)).join(" ");
  const restoredRoute = RUIN_SEQUENCE.filter((ruin) =>
    cleared.includes(ruin.id),
  )
    .map((ruin) => atlasPoint(ruin.id))
    .join(" ");
  return (
    <section className="city-atlas" aria-label="City travel map">
      <svg
        viewBox="0 0 600 550"
        role="img"
        aria-label="Twenty places connected in archive order"
      >
        <rect width="600" height="550" rx="16" fill="#142c2c" />
        <polyline
          points={route}
          fill="none"
          stroke="#6f7976"
          strokeWidth="5"
          strokeDasharray="7 9"
          strokeLinecap="round"
        />
        {restoredRoute && (
          <polyline
            points={restoredRoute}
            fill="none"
            stroke="#75b79f"
            strokeWidth="5"
            strokeLinecap="round"
          />
        )}
        {RUIN_SEQUENCE.map((r) => {
          const [x, y] = atlasPoint(r.id),
            done = cleared.includes(r.id),
            open = isUnlocked(r.id, cleared);
          return (
            <g key={r.id}>
              <rect
                x={x - 40}
                y={y - 32}
                width="80"
                height="64"
                rx="12"
                fill={done ? "#325f50" : open ? "#655039" : "#303837"}
                stroke={selected === r.id ? "#f1c986" : "#687471"}
                strokeWidth={selected === r.id ? 3 : 1}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                fill={open ? "#f3deb4" : "#9ba3a0"}
                fontSize="21"
              >
                {String(r.id).padStart(2, "0")}
              </text>
              {r.id === currentLocation && (
                <>
                  <circle cx={x} cy={y + 17} r="4" fill="#8ae0c2" />
                  <text
                    x={x}
                    y={y + 28}
                    textAnchor="middle"
                    fontSize="8"
                    fill="#8ae0c2"
                  >
                    YOU ARE HERE
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
      <div className="city-map-buttons">
        {RUIN_SEQUENCE.map((r) => (
          <button
            key={r.id}
            className={
              cleared.includes(r.id)
                ? "city-map-button--restored"
                : isUnlocked(r.id, cleared)
                  ? "city-map-button--frontier"
                  : "city-map-button--sealed"
            }
            disabled={!isUnlocked(r.id, cleared)}
            aria-pressed={selected === r.id}
            onClick={() => setSelected(r.id)}
            aria-label={`${r.place}${!isUnlocked(r.id, cleared) ? " · Sealed" : ""}`}
            title={r.place}
          >
            {cleared.includes(r.id) ? "✓ " : ""}
            {String(r.id).padStart(2, "0")}
          </button>
        ))}
      </div>
      <div className="city-map-detail">
        <div>
          <span className="eyebrow">
            AREA {String(selected).padStart(2, "0")}
          </span>
          <h3>{selectedRuin.place}</h3>
          <p>
            {cleared.includes(selected)
              ? "Restored. Travel to the entrance and approach its amber to revisit."
              : selected === frontier
                ? "Current ruin. Restore its archive to open the next gate."
                : "Sealed. Follow the numbered path and restore the earlier ruins first."}
          </p>
        </div>
        <button
          className="primary-button"
          disabled={!cleared.includes(selected)}
          onClick={() => onSelect(selected)}
        >
          {cleared.includes(selected)
            ? "Travel here"
            : selected === frontier
              ? "Current ruin"
              : "Sealed"}
        </button>
      </div>
    </section>
  );
}
