import { describe, it, expect } from "vitest";
import {
  crossedRuinGate,
  findRoute,
  nearestRuinCopy,
  ruinGate,
  wrapRuinCoordinate,
} from "./layout";
describe("physical city progression", () => {
  it("routes around a wall instead of guiding through it", () => {
    const blocked = (x: number, z: number) =>
      Math.abs(x) < 3 && Math.abs(z) < 15;
    const path = findRoute([-12, 0], [12, 0], blocked);
    expect(path.length).toBeGreaterThan(0);
    expect(path.every(([x, z]) => !blocked(x, z))).toBe(true);
    expect(path.some(([, z]) => Math.abs(z) >= 15)).toBe(true);
  });
  it("loops a single ruin at every edge", () => {
    expect(wrapRuinCoordinate(61)).toBe(-59);
    expect(wrapRuinCoordinate(-61)).toBe(59);
    expect(nearestRuinCopy([-26, -25], [55, -25])).toEqual([94, -25]);
  });
  it("places the exit behind the spawn and only triggers inside its opening", () => {
    const south = ruinGate([0, 46]);
    expect(south).toMatchObject({
      at: [0, 55],
      axis: "z",
      direction: 1,
      rotation: 0,
    });
    expect(crossedRuinGate([0, 59.75], south)).toBe(true);
    expect(crossedRuinGate([10, 59.75], south)).toBe(false);
    expect(crossedRuinGate([0, -59.75], south)).toBe(false);

    const west = ruinGate([-55, 0]);
    expect(west).toMatchObject({
      at: [-55, 0],
      axis: "x",
      direction: -1,
      rotation: Math.PI / 2,
    });
    expect(crossedRuinGate([-59.75, 0], west)).toBe(true);
  });
});
