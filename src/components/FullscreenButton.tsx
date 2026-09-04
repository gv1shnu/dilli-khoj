import { useEffect, useState } from "react";

export function FullscreenButton({
  className = "ghost-button",
}: {
  className?: string;
}) {
  const [active, setActive] = useState(() =>
    Boolean(document.fullscreenElement),
  );
  const [error, setError] = useState("");
  const supported = Boolean(document.fullscreenEnabled);

  useEffect(() => {
    const sync = () => setActive(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", sync);
    return () => document.removeEventListener("fullscreenchange", sync);
  }, []);

  const toggle = async () => {
    if (!supported) return;
    setError("");
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else
        await document.documentElement.requestFullscreen({
          navigationUI: "hide",
        });
    } catch {
      setError("Your browser could not change fullscreen. Try its View menu.");
    }
  };

  return (
    <span className="fullscreen-control">
      <button
        className={className}
        type="button"
        disabled={!supported}
        onClick={() => void toggle()}
        aria-label={active ? "Exit fullscreen" : "Enter fullscreen"}
        title={
          supported ? undefined : "Fullscreen is not available in this browser"
        }
      >
        {active ? "Exit fullscreen" : "Fullscreen"}
      </button>
      {error && (
        <span className="fullscreen-error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
