import { afterAll, describe, expect, it } from "vitest";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import { CELL, findRoute, ruinGate, type Point } from "./layout";

const kits = new Map(
  LEVELS.map((level) => {
    const kit = new LevelKit(level);
    kit.floor(0, 0, CELL, CELL, level.ground, -0.2);
    level.build(kit);
    const entryHeight = kit.height(...level.spawn);
    const gate = ruinGate(level.spawn);
    kit.floor(
      gate.at[0],
      gate.at[1],
      gate.axis === "x" ? 8 : 22,
      gate.axis === "x" ? 22 : 8,
      level.accent,
    );
    if (entryHeight > 1 && gate.axis === "z")
      kit.ramp(gate.at[0], gate.at[1], 18, 12, -entryHeight, "z", entryHeight);
    kit.arch(gate.at[0], gate.at[1], 16, 8, gate.rotation);
    return [level.id, kit] as const;
  }),
);

afterAll(() => kits.forEach((kit) => kit.dispose()));

describe("one-ruin passage routes", () => {
  for (const level of LEVELS)
    it(`ruin ${level.id} connects its archive to its exit gate`, () => {
      const kit = kits.get(level.id)!;
      const gate = ruinGate(level.spawn);
      const approach: Point =
        gate.axis === "x"
          ? [gate.at[0] - gate.direction * 4, gate.at[1]]
          : [gate.at[0], gate.at[1] - gate.direction * 4];
      const blocked = (x: number, z: number) =>
        Math.abs(x) >= CELL / 2 || Math.abs(z) >= CELL / 2 || kit.blocked(x, z);
      const path = findRoute(level.archive, approach, blocked, 3, (from, to) =>
        kit.canWalk(from, to),
      );
      expect(path.length).toBeGreaterThan(0);
      expect(path.at(-1)).toEqual(approach);
    });
});
