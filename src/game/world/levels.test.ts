import { describe, it, expect } from "vitest";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import { findRoute } from "./layout";
import { soundscapeSignature } from "../ambience";
import { buildRestorationFeature, RESTORATIONS } from "./restorations";

describe("authored physical locations", () => {
  it("gives every ruin a distinct audible environment", () => {
    expect(new Set(LEVELS.map((level) => level.sound.name)).size).toBe(20);
    expect(new Set(LEVELS.map((level) => level.sound.detail)).size).toBe(20);
    expect(
      new Set(LEVELS.map((level) => soundscapeSignature(level.sound))).size,
    ).toBe(20);
  });
  it("gives every ruin a distinct physical restoration payoff", () => {
    expect(RESTORATIONS).toHaveLength(20);
    expect(RESTORATIONS.map((entry) => entry.id)).toEqual(
      Array.from({ length: 20 }, (_, index) => index + 1),
    );
    expect(new Set(RESTORATIONS.map((entry) => entry.motif)).size).toBe(20);
    expect(new Set(RESTORATIONS.map((entry) => entry.title)).size).toBe(20);
    for (const level of LEVELS) {
      const kit = new LevelKit(level);
      const feature = buildRestorationFeature(level, kit);
      try {
        expect(feature.userData.parts).toBeGreaterThan(2);
        expect(feature.children.length).toBeGreaterThan(0);
        expect(feature.children.length).toBeLessThanOrEqual(5);
        expect(feature.visible).toBe(false);
        expect(feature.userData.restoration).toBeTruthy();
        expect(kit.blocked(...level.archive)).toBe(false);
      } finally {
        kit.dispose();
      }
    }
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
