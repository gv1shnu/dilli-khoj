// Fictional, compressed Delhi geography. Coordinates never determine curriculum order.
export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 740;
export const LANDMARKS = [
  [630, 610],
  [640, 260],
  [710, 310],
  [560, 320],
  [625, 370],
  [530, 395],
  [450, 355],
  [500, 455],
  [610, 435],
  [695, 385],
  [590, 505],
  [710, 100],
  [525, 255],
  [330, 160],
  [900, 455],
  [145, 565],
  [415, 560],
  [240, 330],
  [510, 640],
  [825, 165],
].map(([x, y], index) => ({ id: index + 1, x, y }));

// Voronoi parcels make adjoining geographic regions, rather than floating level cards.
export function regionPolygon(id: number): string {
  const site = LANDMARKS.find((point) => point.id === id)!;
  let polygon = [
    [30, 30],
    [970, 30],
    [970, 710],
    [30, 710],
  ];
  for (const other of LANDMARKS) {
    if (other.id === id) continue;
    const a = other.x - site.x,
      b = other.y - site.y;
    const c = (other.x ** 2 + other.y ** 2 - site.x ** 2 - site.y ** 2) / 2;
    const clipped: number[][] = [];
    for (let i = 0; i < polygon.length; i++) {
      const p = polygon[i],
        q = polygon[(i + 1) % polygon.length];
      const dp = a * p[0] + b * p[1] - c,
        dq = a * q[0] + b * q[1] - c;
      if (dp <= 0) clipped.push(p);
      if (dp <= 0 !== dq <= 0) {
        const t = dp / (dp - dq);
        clipped.push([p[0] + t * (q[0] - p[0]), p[1] + t * (q[1] - p[1])]);
      }
    }
    polygon = clipped;
  }
  return polygon
    .map((point) => point.map((n) => n.toFixed(1)).join(","))
    .join(" ");
}
export const REGIONS = LANDMARKS.map((point) => ({
  ...point,
  polygon: regionPolygon(point.id),
}));
export function visibleRegions(cleared: readonly number[], fullAccess = false) {
  return REGIONS.filter((region) => fullAccess || cleared.includes(region.id));
}
