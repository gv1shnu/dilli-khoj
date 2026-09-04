import { describe, it, expect } from "vitest";
import {
  canEnter,
  findRoute,
  levelCenter,
  levelAt,
  wrapCoordinate,
  gatePoint,
} from "./layout";
describe("physical city progression", () => {
  it("gives twenty unique places connected in curriculum order", () => {
    const centers = Array.from({ length: 20 }, (_, i) => levelCenter(i + 1));
    expect(new Set(centers.map(String)).size).toBe(20);
    centers.forEach(([x, z], i) => {
      expect(levelAt(x, z)).toBe(i + 1);
      if (i)
        expect(Math.hypot(x - centers[i - 1][0], z - centers[i - 1][1])).toBe(
          120,
        );
    });
  });
  it("blocks future physical locations and opens exactly the frontier", () => {
    for (let id = 1; id <= 20; id++)
      expect(canEnter(...levelCenter(id), [1, 2, 3])).toBe(id <= 4);
    expect(canEnter(...levelCenter(2), [])).toBe(false);
    expect(gatePoint(1, 2)).toEqual([-180, -180]);
  });
  it("wraps at the city seam without changing cell identity", () => {
    expect(wrapCoordinate(361)).toBe(-359);
    expect(wrapCoordinate(-361)).toBe(359);
    expect(levelAt(-240 + 720, -180)).toBe(1);
  });
  it("routes around a wall instead of guiding through it", () => {
    const blocked = (x: number, z: number) =>
      Math.abs(x) < 3 && Math.abs(z) < 15;
    const path = findRoute([-12, 0], [12, 0], blocked);
    expect(path.length).toBeGreaterThan(0);
    expect(path.every(([x, z]) => !blocked(x, z))).toBe(true);
    expect(path.some(([, z]) => Math.abs(z) >= 15)).toBe(true);
  });
});
