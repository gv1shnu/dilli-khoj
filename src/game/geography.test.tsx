import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GeographicMap } from "./GeographicMap";
import { LANDMARKS, REGIONS, visibleRegions } from "./geography";

describe("geographic map visibility", () => {
  it("keeps the current frontier and all uncleared regions off the player map", () => {
    expect(visibleRegions([1, 2, 3]).map((region) => region.id)).toEqual([
      1, 2, 3,
    ]);
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[1, 2, 3]} onSelect={() => {}} />,
    );
    expect(html).toContain("Purana Qila quarantine gate · Restored — revisit");
    expect(html).not.toContain("Old Delhi records room");
    expect(html).not.toContain("Signature Bridge");
    expect(html.match(/class="geo-marker /g)).toHaveLength(3);
  });
  it("starts entirely fogged, without a selectable future landmark", () => {
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[]} onSelect={() => {}} />,
    );
    expect(html).toContain("The city is still under mist.");
    expect(html).not.toContain('class="geo-marker');
    expect(visibleRegions([])).toEqual([]);
  });
  it("gives the admin atlas all twenty inspectable regions independent of player progress", () => {
    expect(visibleRegions([], true)).toHaveLength(20);
    const html = renderToStaticMarkup(
      <GeographicMap cleared={[]} fullAccess onSelect={() => {}} />,
    );
    expect(html).toContain("Signature Bridge · Inspect");
    expect(html.match(/class="geo-marker /g)).toHaveLength(20);
    expect(html).not.toContain("Restored — revisit");
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
