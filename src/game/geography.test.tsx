import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GeographicMap } from "./GeographicMap";
import { atlasPoint, WorldAtlas } from "./world/WorldAtlas";
import { LANDMARKS, REGIONS } from "./geography";

describe("geographic map visibility", () => {
  it("draws the player journey from ruin one at the bottom to ruin twenty at the top", () => {
    expect(atlasPoint(1)[1]).toBeGreaterThan(atlasPoint(20)[1]);
    expect(atlasPoint(1)[0]).toBeLessThan(atlasPoint(5)[0]);
    expect(atlasPoint(6)[0]).toBeGreaterThan(atlasPoint(10)[0]);
    expect(atlasPoint(11)[0]).toBeLessThan(atlasPoint(15)[0]);
    expect(atlasPoint(16)[0]).toBeGreaterThan(atlasPoint(20)[0]);
    const gaps = Array.from({ length: 19 }, (_, index) => {
      const [x1, y1] = atlasPoint(index + 1);
      const [x2, y2] = atlasPoint(index + 2);
      return Math.round(Math.hypot(x2 - x1, y2 - y1));
    });
    expect(new Set(gaps).size).toBeGreaterThan(10);

    const html = renderToStaticMarkup(
      <WorldAtlas cleared={[1, 2]} currentLocation={3} onSelect={() => {}} />,
    );
    expect(html).toContain(
      'points="82,490 172,456 278,481 382,435 515,458 542,367',
    );
    expect(html.match(/atlas-marker--sealed/g)).toHaveLength(17);
    expect(html.match(/class="atlas-marker-icon"/g)).toHaveLength(20);
    expect(html).not.toContain("city-map-buttons");
    expect(html).toContain("THE RIDGE");
    expect(html).toContain("YAMUNA");
    expect(html).toContain(
      "Current ruin. Restore its archive to open the next gate.",
    );
  });
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
    expect(markers[0]).toContain(
      "Purana Qila quarantine gate · Current archive",
    );
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
