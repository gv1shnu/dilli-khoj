import type { LevelDefinition } from "../types";
export const level18: LevelDefinition = {
  id: 18,
  title: "Ridge Signal Tower",
  subtitle: "The trees have taken the high ground.",
  ground: 0x5b7655,
  stone: 0x8b8c69,
  accent: 0xb8a470,
  spawn: [0, 46],
  archive: [25, -24],
  discovery: {
    at: [-32, -31],
    title: "The nesting frequency",
    text: "A bird has woven wire into its nest. The signal tower is transmitting something after all.",
  },
  sound: {
    name: "Woodland canopy · insects and birds",
    wind: 0.22,
    water: 0,
    hum: 0.006,
    birds: 0.85,
    tone: 430,
    detail: "woodland",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.floor(25, -20, 25, 40, 0x8c9670, 6);
    k.ramp(0, 12, 72, 10, 6, "x");
    k.floor(34, 6, 7, 22, 0x8c9670, 6);
    for (const [x, z, h] of [
      [-43, 35, 17],
      [-25, 29, 13],
      [21, 34, 16],
      [39, 34, 18],
      [-45, 0, 15],
      [-22, -12, 17],
      [-42, -28, 20],
      [-13, -36, 15],
      [4, -30, 13],
      [45, -30, 19],
      [40, -8, 15],
    ])
      k.tree(x, z, h);
    for (const x of [18, 32])
      for (const z of [-34, -20]) k.column(x, z, 20, 0.55, 6);
    k.box(25, 26, -27, 20, 0.5, 21, 0x698778, false);
    k.cylinder(25, 26, -27, 0.3, 12, 0xbdb98f, false);
    for (let y = 10; y < 25; y += 4)
      k.box(25, y, -34, 14, 0.2, 0.2, 0x9f9d78, false);
    k.wall(-16, -1, 38, 2, 2, 0x7b8362);
    k.lamp(-34, 15);
    k.lamp(32, -8, 6);
    k.sign(-12, 38, "THE RIDGE", 10, 5);
    k.scatter(18, 90, 0x6d875c);
  },
};
