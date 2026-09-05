export const CELL = 120;
export const LEVEL_COUNT = 20;
export type Point = readonly [number, number];

export interface RuinGate {
  at: Point;
  axis: "x" | "z";
  direction: -1 | 1;
  rotation: number;
}

/**
 * Each ruin repeats at its own edge. The exit sits behind the arrival point so
 * entering a ruin naturally sends the player inward toward its archive first.
 */
export function ruinGate(spawn: Point): RuinGate {
  const axis = Math.abs(spawn[0]) > Math.abs(spawn[1]) ? "x" : "z";
  const source = axis === "x" ? spawn[0] : spawn[1];
  const direction: -1 | 1 = source < 0 ? -1 : 1;
  const edge = direction * (CELL / 2 - 5);
  return {
    at: axis === "x" ? [edge, spawn[1]] : [spawn[0], edge],
    axis,
    direction,
    rotation: axis === "x" ? Math.PI / 2 : 0,
  };
}

/** Wrap one coordinate into the central copy of a single repeating ruin. */
export function wrapRuinCoordinate(value: number): number {
  return ((((value + CELL / 2) % CELL) + CELL) % CELL) - CELL / 2;
}

/** Return the closest repeated copy of a landmark to the player. */
export function nearestRuinCopy(point: Point, from: Point): Point {
  return [
    point[0] + Math.round((from[0] - point[0]) / CELL) * CELL,
    point[1] + Math.round((from[1] - point[1]) / CELL) * CELL,
  ];
}

/** True once the player has crossed the outer edge inside the gate opening. */
export function crossedRuinGate(point: Point, gate: RuinGate): boolean {
  const normal = gate.axis === "x" ? point[0] : point[1];
  const across = gate.axis === "x" ? point[1] : point[0];
  const gateAcross = gate.axis === "x" ? gate.at[1] : gate.at[0];
  return (
    normal * gate.direction > CELL / 2 - 0.5 &&
    Math.abs(across - gateAcross) < 7.5
  );
}

/** Grid route follows walkable ground instead of pointing through architecture. */
export function findRoute(
  start: Point,
  end: Point,
  blocked: (x: number, z: number) => boolean,
  step = 3,
  canWalk: (from: Point, to: Point) => boolean = () => true,
): Point[] {
  const size = Math.ceil(CELL / step),
    half = CELL / 2;
  const index = (p: Point) =>
    Math.max(0, Math.min(size - 1, Math.round((p[1] + half) / step))) * size +
    Math.max(0, Math.min(size - 1, Math.round((p[0] + half) / step)));
  const point = (i: number): Point => [
    (i % size) * step - half,
    Math.floor(i / size) * step - half,
  ];
  const nearest = (p: Point) => {
    const base = index(p);
    for (let radius = 0; radius < 5; radius++)
      for (let dz = -radius; dz <= radius; dz++)
        for (let dx = -radius; dx <= radius; dx++) {
          const x = (base % size) + dx,
            z = Math.floor(base / size) + dz;
          if (x < 0 || z < 0 || x >= size || z >= size) continue;
          const i = z * size + x,
            q = point(i);
          if (!blocked(q[0], q[1])) return i;
        }
    return -1;
  };
  const first = nearest(start),
    last = nearest(end);
  if (first < 0 || last < 0) return [];
  const previous = new Int32Array(size * size).fill(-1);
  const queue = new Int32Array(size * size);
  queue[0] = first;
  previous[first] = first;
  let head = 0,
    tail = 1;
  while (head < tail && previous[last] === -1) {
    const current = queue[head++],
      cx = current % size,
      cz = Math.floor(current / size);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const x = cx + dx,
        z = cz + dz;
      if (x < 0 || x >= size || z < 0 || z >= size) continue;
      const next = z * size + x;
      if (previous[next] !== -1) continue;
      const p = point(next),
        mid: Point = [
          (p[0] + point(current)[0]) / 2,
          (p[1] + point(current)[1]) / 2,
        ];
      if (
        blocked(p[0], p[1]) ||
        blocked(mid[0], mid[1]) ||
        !canWalk(point(current), p)
      )
        continue;
      previous[next] = current;
      queue[tail++] = next;
    }
  }
  if (previous[last] === -1) return [];
  const route: Point[] = [];
  for (let p = last; p !== first; p = previous[p]) route.push(point(p));
  route.reverse();
  route.push(end);
  return route;
}
