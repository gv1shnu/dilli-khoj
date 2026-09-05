import { useId, useState } from "react";
import { RUIN_SEQUENCE } from "../ruins";
import { currentRuinId, isUnlocked } from "../progression";

const ATLAS_POINTS: readonly (readonly [number, number])[] = [
  [82, 490],
  [172, 456],
  [278, 481],
  [382, 435],
  [515, 458],
  [542, 367],
  [452, 326],
  [338, 366],
  [226, 319],
  [92, 350],
  [67, 258],
  [177, 219],
  [295, 248],
  [405, 197],
  [532, 224],
  [551, 133],
  [452, 102],
  [329, 145],
  [207, 86],
  [76, 57],
];

// One silhouette for each physical place, in journey order.
const ICON_PATHS = [
  "M3 20V8h4V4h4v6h6V4h4v16M1 20h22M9 20v-5q3-5 6 0v5",
  "M3 17V7q0-3 3-3h12q3 0 3 3v10M4 12h16M7 7h4m2 0h4M6 17v3m12-3v3M6 17h12",
  "M3 15q9 6 18 0l-3 5H6zM7 14V7h10v7M5 8h14M12 3v4",
  "M5 3h11l4 4v14H5zM16 3v5h4M8 12h9M8 16h7",
  "M12 3a5 5 0 1 0 0 10a5 5 0 0 0 0-10M12 13v8m0-4h5m-2 0v3",
  "M3 9h18l-2-5H5zM5 9v11h14V9M8 20v-6h8M4 9q2 4 4 0q2 4 4 0q2 4 4 0q2 4 4 0",
  "M3 20h18M5 20V11h14v9M4 11q8-13 16 0M12 3V1M9 20v-5h6v5",
  "M4 19l5-5m6-6l5-5M8 6l10 10M5 3l4 1 1 4-4 1-3-3zM14 15l4 4",
  "M12 2l8 7-8 13L4 9zM4 9h16M8 9l4 13 4-13M8 9l4-7 4 7",
  "M4 18h16M6 18l2-8h8l2 8M9 10V6h6v4M5 6h14M8 3h8",
  "M5 9h14l-2 11H7zM8 9V6h8v3M4 20h16M9 13h6",
  "M7 3c-5 6-4 9 0 9s5-3 0-9M16 7c-5 6-4 9 0 9s5-3 0-9M4 21h16",
  "M12 3a9 9 0 1 0 0 18a9 9 0 0 0 0-18M12 7v5l4 3M4 21h16",
  "M4 20h16M6 20v-9h12v9M4 11h16l-2-5H6zM8 15h2m4 0h2M12 6V3",
  "M3 20h18L17 8l-4 5-3-8-3 9zM6 9l3-4m8 3 2-3M5 16h14",
  "M4 7h16M6 7v13m12-13v13M6 11h12M6 15h12M9 5l3-3 3 3",
  "M4 18h16M6 18V8h12v10M8 8l2-4h4l2 4M9 12h6M9 15h6M4 21h16",
  "M12 3l-6 8h4l-5 7h14l-5-7h4zM12 18v4M3 22h18",
  "M4 4h16v16H4zM7 8h10M7 12h10M7 16h10M10 8v8M14 8v8",
  "M2 18h20M5 18V6m14 12V6M5 7q7 14 14 0M8 13v5m4-3v3m4-5v5",
] as const;

export function atlasPoint(id: number): readonly [number, number] {
  return ATLAS_POINTS[id - 1] ?? ATLAS_POINTS[0];
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
  const prefix = useId().replace(/:/g, "");
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
      <div className="city-atlas-map">
        <svg
          viewBox="0 0 600 550"
          role="img"
          aria-label="Twenty places connected in archive order"
        >
          <defs>
            <pattern
              id={`${prefix}-atlas-grain`}
              width="19"
              height="19"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="4" cy="7" r=".7" fill="#f1d9a0" opacity=".14" />
              <path d="M10 16h5" stroke="#f1d9a0" strokeOpacity=".08" />
            </pattern>
            <pattern
              id={`${prefix}-atlas-streets`}
              width="31"
              height="27"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-11)"
            >
              <path
                d="M0 0H31V27"
                fill="none"
                stroke="#ead2a0"
                strokeOpacity=".14"
              />
              <rect
                x="6"
                y="6"
                width="17"
                height="13"
                rx="2"
                fill="#a39160"
                opacity=".1"
              />
            </pattern>
            <symbol id={`${prefix}-atlas-tree`} viewBox="0 0 24 30">
              <path
                d="M12 1L2 17h5L1 24h22l-6-7h5Z"
                fill="#496354"
                stroke="#90a37a"
                strokeWidth=".7"
              />
              <path d="M12 24v6" stroke="#a48f65" />
            </symbol>
          </defs>
          <rect width="600" height="550" rx="16" fill="#141f21" />
          <path
            className="geo-mist"
            d="M-30 150Q150 65 330 160T650 150M-45 405Q140 315 330 410T660 392"
            stroke="#8daca1"
            strokeWidth="62"
            opacity=".045"
            fill="none"
          />
          <path d="M78-10Q165 90 112 216T180 374L218 570H0V0Z" fill="#263b31" />
          {Array.from({ length: 38 }, (_, i) => (
            <use
              key={i}
              href={`#${prefix}-atlas-tree`}
              x={24 + ((i * 43) % 170)}
              y={25 + ((i * 71) % 485)}
              width={13 + (i % 8)}
              height="25"
              opacity=".72"
            />
          ))}
          <path
            d="M205 145Q310 100 440 178L458 360Q345 452 245 330Z"
            fill={`url(#${prefix}-atlas-streets)`}
          />
          <path
            d="M198 535L254 412 309 354 318 188 352 22M35 382Q168 312 278 269T583 270M112 47Q258 132 395 194L550 340M80 418Q214 507 389 462L570 482"
            stroke="#d7bd83"
            strokeWidth="3"
            opacity=".28"
            fill="none"
          />
          <path
            d="M238 180Q350 115 438 210L424 321Q378 414 282 365L246 306Z"
            stroke="#bda77a"
            strokeWidth="6"
            opacity=".42"
            fill="none"
            strokeDasharray="8 5"
          />
          <path
            d="M477-20C414 62 500 140 464 211S471 326 504 368 449 486 488 570"
            stroke="#baad7e"
            strokeWidth="43"
            fill="none"
            opacity=".48"
          />
          <path
            d="M477-20C414 62 500 140 464 211S471 326 504 368 449 486 488 570"
            stroke="#315f63"
            strokeWidth="34"
            fill="none"
          />
          <path
            className="geo-water"
            d="M477-20C414 62 500 140 464 211S471 326 504 368 449 486 488 570"
            stroke="#8bbbb4"
            strokeWidth="2"
            strokeDasharray="6 18 36 26"
            fill="none"
            opacity=".7"
          />
          <text
            x="523"
            y="390"
            transform="rotate(-75 523 390)"
            className="geo-terrain-label"
          >
            YAMUNA
          </text>
          <text
            x="65"
            y="300"
            transform="rotate(-72 65 300)"
            className="geo-terrain-label"
          >
            THE RIDGE
          </text>
          <text x="286" y="165" className="geo-city-label">
            SHAHJAHANABAD
          </text>
          <polyline
            className="atlas-route atlas-route--sealed"
            points={route}
          />
          {restoredRoute && (
            <polyline
              className="atlas-route atlas-route--restored"
              points={restoredRoute}
            />
          )}
          <rect
            width="600"
            height="550"
            rx="16"
            fill={`url(#${prefix}-atlas-grain)`}
            pointerEvents="none"
          />
          <rect
            x="12"
            y="12"
            width="576"
            height="526"
            rx="5"
            fill="none"
            stroke="#bba97a"
            strokeOpacity=".32"
          />
          <g transform="translate(557 48)" stroke="#cdb984" fill="none">
            <path d="M0-18V18M-10 0h20M0-18l-5 12h10Z" />
            <text
              y="-25"
              textAnchor="middle"
              fill="#cdb984"
              stroke="none"
              fontSize="10"
            >
              N
            </text>
          </g>
          <text x="30" y="525" className="geo-signature">
            DILLI KHOJ / FIELD ATLAS
          </text>
        </svg>
        {RUIN_SEQUENCE.map((ruin) => {
          const [x, y] = atlasPoint(ruin.id);
          const restored = cleared.includes(ruin.id);
          const unlocked = isUnlocked(ruin.id, cleared);
          return (
            <button
              key={ruin.id}
              className={`atlas-marker ${restored ? "atlas-marker--restored" : unlocked ? "atlas-marker--frontier" : "atlas-marker--sealed"} ${selected === ruin.id ? "atlas-marker--selected" : ""} ${currentLocation === ruin.id ? "atlas-marker--current" : ""}`}
              style={{
                left: `${(x / 600) * 100}%`,
                top: `${(y / 550) * 100}%`,
              }}
              disabled={!unlocked}
              aria-pressed={selected === ruin.id}
              aria-current={
                currentLocation === ruin.id ? "location" : undefined
              }
              aria-label={`${ruin.place}${!unlocked ? " · Sealed" : ""}`}
              title={ruin.place}
              onClick={() => setSelected(ruin.id)}
            >
              <svg
                className="atlas-marker-icon"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d={ICON_PATHS[ruin.id - 1]} />
              </svg>
              <span>{String(ruin.id).padStart(2, "0")}</span>
            </button>
          );
        })}
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
