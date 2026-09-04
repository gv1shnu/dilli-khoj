import { useId, useState } from "react";
import { DISTRICTS, ruinById } from "./ruins";
import { visibleRegions } from "./geography";

interface GeographicMapProps {
  cleared: readonly number[];
  fullAccess?: boolean;
  selectedId?: number;
  onSelect: (id: number) => void;
}
const RIVER =
  "M765 -30 C665 90 830 190 760 285 S760 425 815 485 S720 665 790 780";
const COLORS = [
  "#baa568",
  "#b88964",
  "#c69861",
  "#9aa777",
  "#cba67a",
  "#869b7b",
  "#a5997a",
];

/** Presentation only: protected content still requires the server admin RPCs. */
export function GeographicMap({
  cleared,
  fullAccess = false,
  selectedId,
  onSelect,
}: GeographicMapProps) {
  const prefix = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<number | null>(null);
  const [motion, setMotion] = useState(true);
  const regions = visibleRegions(cleared, fullAccess);
  const inspected =
    regions.find((region) => region.id === (hovered ?? selectedId)) ??
    regions.at(-1);
  const detail = inspected ? ruinById(inspected.id)! : null;
  return (
    <section
      className={`geo-atlas ${motion ? "" : "geo-still"}`}
      aria-label={
        fullAccess
          ? "Complete geographic world map"
          : "Cleared geographic regions"
      }
    >
      <div className="geo-toolbar">
        <span>
          <i className="geo-dot" />{" "}
          {fullAccess
            ? "COMPLETE ATLAS"
            : `${regions.length} / 20 REGIONS REVEALED`}
        </span>
        <button
          className="ghost-button"
          aria-pressed={!motion}
          onClick={() => setMotion((value) => !value)}
        >
          {motion ? "Pause map animation" : "Resume map animation"}
        </button>
      </div>
      <div className="geo-paper">
        <svg viewBox="0 0 1000 740" aria-hidden="true" className="geo-drawing">
          <defs>
            <pattern
              id={`${prefix}-grain`}
              width="23"
              height="23"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="4" cy="7" r=".7" fill="#f1d9a0" opacity=".15" />
              <path d="M12 19h5" stroke="#f1d9a0" strokeOpacity=".09" />
            </pattern>
            <pattern
              id={`${prefix}-streets`}
              width="42"
              height="35"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(-12)"
            >
              <path
                d="M0 0H42V35"
                fill="none"
                stroke="#ead2a0"
                strokeOpacity=".15"
              />
              <rect
                x="8"
                y="7"
                width="23"
                height="18"
                rx="2"
                fill="#a39160"
                opacity=".08"
              />
            </pattern>
            <clipPath id={`${prefix}-revealed`}>
              {regions.map((region) => (
                <polygon key={region.id} points={region.polygon} />
              ))}
            </clipPath>
            <symbol id={`${prefix}-tree`} viewBox="0 0 24 30">
              <path
                d="M12 1L2 17h5L1 24h22l-6-7h5Z"
                fill="#57725e"
                stroke="#9ba87b"
                strokeWidth=".7"
              />
              <path d="M12 24v6" stroke="#a48f65" />
            </symbol>
            <symbol id={`${prefix}-ruin`} viewBox="0 0 60 46">
              <path
                d="M5 40V15h8V8h8v9h18V8h8v7h8v25Z"
                fill="#ae9461"
                stroke="#e6c889"
                strokeWidth="1.5"
              />
              <path
                d="M24 40V27q6-12 12 0v13M11 23h5m28 0h5"
                fill="#353f34"
                stroke="#e6c889"
              />
            </symbol>
            <symbol id={`${prefix}-dome`} viewBox="0 0 60 46">
              <path
                d="M6 40h48M13 39V22h34v17M10 22Q30-10 50 22Z"
                fill="#a79162"
                stroke="#e6c889"
                strokeWidth="1.5"
              />
              <path
                d="M30 3V0M25 39V29q5-7 10 0v10"
                stroke="#e6c889"
                fill="#354337"
              />
            </symbol>
            <symbol id={`${prefix}-bridge`} viewBox="0 0 60 46">
              <path
                d="M4 34h52M12 34V8m36 26V8M12 10Q30 45 48 10M20 24v10m10-6v6m10-10v10"
                fill="none"
                stroke="#e6c889"
                strokeWidth="2"
              />
            </symbol>
            <symbol id={`${prefix}-well`} viewBox="0 0 60 46">
              <path
                d="M4 7h52v34H4ZM11 13h38v22H11ZM18 19h24v10H18Z"
                fill="none"
                stroke="#d7bd82"
                strokeWidth="2"
              />
              <path d="M24 23h12" stroke="#83bdb4" strokeWidth="4" />
            </symbol>
          </defs>
          <rect x="0" y="0" width="1000" height="740" rx="8" fill="#141f21" />
          <path
            className="geo-mist"
            d="M-50 210Q250 80 550 220T1100 220M-80 570Q240 430 550 560T1100 540"
            stroke="#8daca1"
            strokeWidth="85"
            opacity=".045"
            fill="none"
          />
          <g clipPath={`url(#${prefix}-revealed)`}>
            <rect width="1000" height="740" fill="#384837" />
            {regions.map((region) => (
              <polygon
                key={region.id}
                points={region.polygon}
                fill={COLORS[ruinById(region.id)!.district - 1]}
                fillOpacity=".17"
                stroke="#d7c28e"
                strokeOpacity=".25"
                strokeDasharray="3 6"
              />
            ))}
            <path
              d="M130 -10Q260 135 180 290T290 500L345 770H0V0Z"
              fill="#263b31"
            />
            {Array.from({ length: 65 }, (_, i) => (
              <use
                key={i}
                href={`#${prefix}-tree`}
                x={55 + ((i * 59) % 260)}
                y={55 + ((i * 97) % 635)}
                width={16 + (i % 10)}
                height="30"
                opacity=".8"
              />
            ))}
            <path
              d="M355 210Q515 140 715 240L750 480Q570 600 410 440Z"
              fill={`url(#${prefix}-streets)`}
            />
            <path
              d="M335 730L420 560 510 480 525 260 570 35M60 520Q280 420 450 355T970 360M190 70Q420 180 640 260L900 455M145 565Q350 670 630 610L950 640"
              stroke="#d7bd83"
              strokeWidth="4"
              opacity=".3"
              fill="none"
            />
            <path
              d="M390 240Q580 160 720 285L705 420Q630 550 470 485L405 410Z"
              stroke="#bda77a"
              strokeWidth="7"
              opacity=".5"
              fill="none"
              strokeDasharray="9 4"
            />
            <path
              d={RIVER}
              stroke="#baad7e"
              strokeWidth="59"
              fill="none"
              opacity=".5"
            />
            <path d={RIVER} stroke="#315f63" strokeWidth="48" fill="none" />
            <path
              className="geo-water"
              d={RIVER}
              stroke="#8bbbb4"
              strokeWidth="2"
              strokeDasharray="6 20 40 30"
              fill="none"
              opacity=".7"
            />
            <path
              d="M761 490l51-17m-79-281 62 8"
              stroke="#d7bc83"
              strokeWidth="8"
            />
            <text
              x="816"
              y="575"
              transform="rotate(-72 816 575)"
              className="geo-terrain-label"
            >
              YAMUNA
            </text>
            <text
              x="140"
              y="440"
              transform="rotate(-72 140 440)"
              className="geo-terrain-label"
            >
              THE RIDGE
            </text>
            <text x="481" y="210" className="geo-city-label">
              SHAHJAHANABAD
            </text>
            {regions.map((region) => (
              <use
                key={region.id}
                href={`#${prefix}-${region.id === 20 ? "bridge" : region.id === 19 ? "well" : [7, 11, 17].includes(region.id) ? "dome" : "ruin"}`}
                x={region.x - 27}
                y={region.y - 51}
                width="54"
                height="42"
              />
            ))}
            <path
              className="geo-birds"
              d="M350 130q6-7 12 0q6-7 12 0m15 12q5-6 10 0q5-6 10 0"
              stroke="#dec899"
              strokeWidth="2"
              fill="none"
            />
          </g>
          <rect
            width="1000"
            height="740"
            fill={`url(#${prefix}-grain)`}
            pointerEvents="none"
          />
          <rect
            x="17"
            y="17"
            width="966"
            height="706"
            rx="3"
            fill="none"
            stroke="#bba97a"
            strokeOpacity=".35"
          />
          <g transform="translate(928 80)" stroke="#cdb984" fill="none">
            <path d="M0-25V25M-14 0h28M0-25l-6 16h12Z" />
            <text
              y="-36"
              textAnchor="middle"
              fill="#cdb984"
              stroke="none"
              fontSize="13"
            >
              N
            </text>
          </g>
          <text x="55" y="691" className="geo-signature">
            DILLI KHOJ / FIELD ATLAS
          </text>
        </svg>
        {regions.map((region) => {
          const ruin = ruinById(region.id)!;
          const selected = inspected?.id === region.id;
          return (
            <button
              key={region.id}
              className={`geo-marker ${selected ? "geo-marker--selected" : ""}`}
              style={{ left: `${region.x / 10}%`, top: `${region.y / 7.4}%` }}
              aria-label={`${ruin.place} · ${fullAccess ? "Inspect" : "Restored — revisit"}`}
              title={ruin.place}
              onMouseEnter={() => setHovered(region.id)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => setHovered(region.id)}
              onBlur={() => setHovered(null)}
              onClick={() => onSelect(region.id)}
            >
              <span>{String(region.id).padStart(2, "0")}</span>
            </button>
          );
        })}
        {!regions.length && (
          <div className="geo-empty">
            <span>UNEXPLORED DELHI</span>
            <h3>The city is still under mist.</h3>
            <p>Restore your first archive to reveal its region here.</p>
          </div>
        )}
      </div>
      <div className="geo-caption" aria-live="polite">
        {detail ? (
          <>
            <div>
              <span className="eyebrow">
                {DISTRICTS[detail.district - 1].name} · REGION{" "}
                {String(detail.id).padStart(2, "0")}
              </span>
              <h3>{detail.place}</h3>
              <p>{detail.target}</p>
            </div>
            <button
              className="primary-button"
              onClick={() => onSelect(detail.id)}
            >
              {fullAccess ? "Inspect archive" : "Revisit archive"}
            </button>
          </>
        ) : (
          <p>
            Cleared regions appear as you restore the archives. Your current
            archive remains available in the game.
          </p>
        )}
      </div>
      <p className="geo-footnote">
        An imagined Delhi, drawn for exploration. Geography is compressed;
        archive numbers follow your learning journey.
      </p>
    </section>
  );
}
