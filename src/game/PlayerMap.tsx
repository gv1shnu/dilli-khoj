import { useEffect, useRef } from "react";
import { clearedCount } from "./progression";
import { GeographicMap } from "./GeographicMap";

interface PlayerMapProps {
  cleared: number[];
  fullAccess?: boolean;
  onSelect: (id: number) => void;
  onClose: () => void;
}

export function PlayerMap({
  cleared,
  fullAccess = false,
  onSelect,
  onClose,
}: PlayerMapProps) {
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
      }
      if (event.key !== "Tab") return;
      const items = [
        ...root.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], select:not(:disabled), [tabindex="0"]',
        ),
      ];
      const first = items[0],
        last = items.at(-1);
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
      className="pmap-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={fullAccess ? "Complete world map" : "Your world map"}
      ref={dialog}
    >
      <div className="pmap-card geo-modal">
        <button
          className="icon-button pmap-close"
          onClick={onClose}
          aria-label="Close map"
        >
          ×
        </button>
        <p className="eyebrow">DILLI KHOJ / CARTOGRAPHY OFFICE</p>
        <h2 className="pmap-title">
          {fullAccess ? "The complete atlas" : "The city you have restored"}
        </h2>
        <p className="pmap-lead">
          {fullAccess
            ? "All twenty regions are open for administrator inspection."
            : `${clearedCount(cleared)} of 20 regions restored. The whole city is drawn — greyed regions unlock as you clear the ones before them.`}
        </p>
        <GeographicMap
          cleared={cleared}
          fullAccess={fullAccess}
          onSelect={(id) => {
            onSelect(id);
            onClose();
          }}
        />
      </div>
    </div>
  );
}
