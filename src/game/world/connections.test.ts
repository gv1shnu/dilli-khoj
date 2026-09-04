import { describe, it, expect, afterAll } from "vitest";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import {
  levelAt,
  levelCenter,
  toWorld,
  canEnter,
  findRoute,
  type Point,
} from "./layout";
const kits = new Map(
  LEVELS.map((level) => {
    const kit = new LevelKit(level);
    level.build(kit);
    const h = kit.height(...level.spawn);
    if (h > 1) kit.ramp(0, 54, 18, 12, -h, "z", h);
    return [level.id, kit];
  }),
);
afterAll(() => kits.forEach((k) => k.dispose()));
const height = (x: number, z: number) => {
  const id = levelAt(x, z);
  if (!id) return 0;
  const [cx, cz] = levelCenter(id);
  return kits.get(id)!.height(x - cx, z - cz);
};
describe("connected city routes", () => {
  for (let id = 1; id < 20; id++)
    it(`walks from restored area ${id} into area ${id + 1}`, () => {
      const cleared = Array.from({ length: id }, (_, i) => i + 1);
      const blocked = (x: number, z: number) => {
        if (!canEnter(x, z, cleared)) return true;
        const n = levelAt(x, z);
        if (!n) return false;
        const [cx, cz] = levelCenter(n);
        return kits.get(n)!.blocked(x - cx, z - cz);
      };
      const walk = (a: Point, b: Point) => {
        const steps = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 0.3);
        let h = height(...a);
        for (let i = 1; i <= steps; i++) {
          const x = a[0] + ((b[0] - a[0]) * i) / steps,
            z = a[1] + ((b[1] - a[1]) * i) / steps,
            next = height(x, z);
          if (blocked(x, z) || Math.abs(next - h) > 0.7) return false;
          h = next;
        }
        return true;
      };
      const path = findRoute(
        toWorld(id, LEVELS[id - 1].archive),
        toWorld(id + 1, LEVELS[id].spawn),
        blocked,
        3,
        walk,
      );
      expect(path.length).toBeGreaterThan(0);
      expect(path.every(([x, z]) => canEnter(x, z, cleared))).toBe(true);
    }, 15000);
});
