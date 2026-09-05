import { describe, it, expect } from "vitest";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import { findRoute } from "./layout";
import { soundscapeSignature } from "../ambience";

describe("authored physical locations", () => {
  it("gives every ruin a distinct audible environment", () => {
    expect(new Set(LEVELS.map((level) => level.sound.name)).size).toBe(20);
    expect(new Set(LEVELS.map((level) => level.sound.detail)).size).toBe(20);
    expect(
      new Set(LEVELS.map((level) => soundscapeSignature(level.sound))).size,
    ).toBe(20);
  });
  for (const level of LEVELS)
    it(`level ${level.id}: entrance, archive and discovery are reachable`, () => {
      const kit = new LevelKit(level);
      level.build(kit);
      try {
        expect(kit.assets.length).toBeGreaterThan(20);
        expect(kit.blocked(...level.spawn)).toBe(false);
        expect(kit.blocked(...level.archive)).toBe(false);
        const blocked = (x: number, z: number) =>
          Math.abs(x) > 57 || Math.abs(z) > 57 || kit.blocked(x, z);
        expect(
          findRoute(level.spawn, level.archive, blocked, 3, (a, b) =>
            kit.canWalk(a, b),
          ).length,
        ).toBeGreaterThan(0);
        expect(kit.blocked(...level.discovery.at)).toBe(false);
        expect(
          findRoute(level.spawn, level.discovery.at, blocked, 3, (a, b) =>
            kit.canWalk(a, b),
          ).length,
        ).toBeGreaterThan(0);
        expect(level.sound.name.length).toBeGreaterThan(5);
      } finally {
        kit.dispose();
      }
    });
});
