import { useState } from "react";
import { RuinScene } from "../game/RuinScene";
import { LEVELS } from "../game/world/levels";

/** Development-only physical world review. No questions or grading calls. */
export function WorldStudio() {
  const [walking, setWalking] = useState(false);
  const [id, setId] = useState(1),
    [restored, setRestored] = useState(false),
    [near, setNear] = useState(false);
  const [discovery, setDiscovery] = useState<{
    title: string;
    text: string;
  } | null>(null);
  const [stats, setStats] = useState<{
    fps: number;
    calls: number;
    triangles: number;
    x: number;
    z: number;
    location: number;
  } | null>(null);
  const level = LEVELS.find((l) => l.id === id)!;
  const cleared = Array.from(
    { length: restored ? id : id - 1 },
    (_, i) => i + 1,
  );
  return (
    <main className="app-shell">
      <RuinScene
        key={`${id}:${restored}`}
        initialLocation={id}
        autoWalk={walking}
        cleared={cleared}
        onProximityChange={setNear}
        onPortalEnter={(next) => {
          setId(next);
          setRestored(false);
          setWalking(false);
        }}
        onDiscovery={setDiscovery}
        onFrameStats={setStats}
      />
      <aside className="world-studio">
        <span className="eyebrow">WORLD LAYOUT STUDIO / DEVELOPMENT</span>
        <h1>
          {String(id).padStart(2, "0")} · {level.title}
        </h1>
        <p>{level.subtitle}</p>
        <div className="city-map-buttons">
          {LEVELS.map((l) => (
            <button
              key={l.id}
              aria-label={`Preview area ${l.id}: ${l.title}`}
              aria-pressed={l.id === id}
              onClick={() => {
                setId(l.id);
                setNear(false);
                setDiscovery(null);
                setWalking(false);
              }}
            >
              {String(l.id).padStart(2, "0")}
            </button>
          ))}
        </div>
        <button className="ghost-button" onClick={() => setWalking((v) => !v)}>
          {walking
            ? "Stop route check"
            : restored
              ? "Walk route to exit gate"
              : "Walk route to archive"}
        </button>
        <label>
          <input
            type="checkbox"
            checked={restored}
            onChange={(e) => setRestored(e.target.checked)}
          />{" "}
          Show restored appearance
        </label>
        <p>
          {level.sound.name}
          <br />
          WASD · move / Shift · run / Drag · orbit / M · mute
        </p>
        <p role="status">
          {near
            ? "Archive reached"
            : restored
              ? "Follow the trail to the open gate"
              : "Explore toward the amber"}
          {stats &&
            ` · ${stats.fps} FPS · ${stats.calls} draws · ${Math.round(stats.triangles / 1000)}k triangles · world ${stats.location} @ ${stats.x.toFixed(1)}, ${stats.z.toFixed(1)}`}
        </p>
        <a href="#">Return to game</a>
      </aside>
      {discovery && (
        <aside className="world-discovery">
          <h3>{discovery.title}</h3>
          <p>{discovery.text}</p>
        </aside>
      )}
    </main>
  );
}
