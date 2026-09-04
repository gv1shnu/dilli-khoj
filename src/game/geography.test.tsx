import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GeographicMap } from "./GeographicMap";
import { LANDMARKS, REGIONS } from "./geography";

describe("geographic map visibility", () => {
  it("shows all regions with the frontier open and future regions locked", () => {
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[1, 2, 3]} onSelect={() => {}} />,
    );
    expect(html).toContain("Purana Qila quarantine gate · Restored — revisit");
    const markers = html.match(/<button class="geo-marker [^>]*>/g)!;
    expect(markers).toHaveLength(20);
    for (const [index, marker] of markers.entries()) {
      const locked = index >= 4;
      expect(marker.includes("geo-marker--locked")).toBe(locked);
      expect(marker.includes('aria-disabled="true"')).toBe(locked);
      if (locked) expect(marker).toMatch(/aria-label="[^"]+ · Locked"/);
    }
    expect(markers[3]).toContain("Old Delhi records room · Current archive");
    expect(html).toContain("Open archive");
  });
  it("starts with ruin one open and all nineteen future regions visible but locked", () => {
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[]} onSelect={() => {}} />,
    );
    const markers = html.match(/<button class="geo-marker [^>]*>/g)!;
    expect(markers).toHaveLength(20);
    expect(markers[0]).toContain("Purana Qila quarantine gate · Current archive");
    expect(markers[0]).not.toContain("geo-marker--locked");
    for (const marker of markers.slice(1)) {
      expect(marker).toContain("geo-marker--locked");
      expect(marker).toContain('aria-disabled="true"');
      expect(marker).toMatch(/aria-label="[^"]+ · Locked"/);
    }
    expect(html).toContain("Open archive");
  });
  it("gives the admin atlas all twenty inspectable regions independent of player progress", () => {
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[]} fullAccess onSelect={() => {}} />,
    );
    expect(html).toContain("Signature Bridge · Inspect");
    expect(html.match(/class="geo-marker /g)).toHaveLength(20);
    expect(html).not.toContain("Restored — revisit");
    expect(html).not.toContain("geo-marker--locked");
  });
  it("creates valid bounded geographic parcels for every curriculum landmark", () => {
    expect(REGIONS.map((region) => region.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
    for (const region of REGIONS) {
      const points = region.polygon
        .split(" ")
        .map((point) => point.split(",").map(Number));
      expect(points.length).toBeGreaterThanOrEqual(3);
      for (const [x, y] of points) {
        expect(x).toBeGreaterThanOrEqual(30);
        expect(x).toBeLessThanOrEqual(970);
        expect(y).toBeGreaterThanOrEqual(30);
        expect(y).toBeLessThanOrEqual(710);
      }
      expect(LANDMARKS.find((point) => point.id === region.id)).toBeDefined();
    }
  });
});
