import type { LevelDefinition } from "../types";
export const level09: LevelDefinition = {
  id: 9,
  title: "Dariba Kalan",
  subtitle: "Small treasures in a narrow street.",
  ground: 0x806c60,
  stone: 0x8b6970,
  accent: 0xc6ab66,
  spawn: [0, 46],
  archive: [0, -35],
  discovery: {
    at: [31, -10],
    title: "The empty setting",
    text: "The jeweller kept a velvet box for a stone that was never delivered. Dust has filled its shape.",
  },
  sound: {
    name: "Jewellers’ passage · delicate ringing",
    wind: 0.04,
    water: 0,
    hum: 0.008,
    birds: 0.1,
    tone: 660,
    detail: "bell",
  },
  build(k) {
    k.floor(0, 0, 102, 102);
    k.floor(0, 0, 12, 90, 0xb89e7b);
    for (const side of [-1, 1])
      for (const z of [-30, -12, 6, 24]) {
        k.building(side * 16, z, 14, 13, 11, side < 0 ? 0x967976 : 0x858577);
        k.box(side * 8.8, 1, z, 1, 2.4, 7, 0x365b5b);
        k.box(side * 8.2, 1.6, z, 0.2, 0.7, 4, 0xccb774, false);
        k.box(side * 8, 5, z, 4, 0.3, 9, 0x9c7b4a, false);
      }
    for (const z of [-40, -4, 34]) {
      k.arch(0, z, 9, 10);
      k.box(0, 9, z, 0.5, 0.6, 0.5, 0xe8c787, false);
    }
    k.wall(42, -15, 3, 42, 7);
    k.wall(31, -36, 24, 3, 7);
    k.tree(34, -25, 8);
    k.stall(-36, 7, 0x8e645a);
    k.crate(-32, 19);
    k.lamp(6, 22);
    k.lamp(-6, -24);
    k.sign(0, 35, "DARIBA KALAN", 9, 9);
    k.scatter(9, 20);
  },
};
