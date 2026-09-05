import type { LevelDefinition } from "../types";
export const level08: LevelDefinition = {
  id: 8,
  title: "Chawri Bazaar Lanes",
  subtitle: "The workshops fold around you.",
  ground: 0x756d5d,
  stone: 0xa47e61,
  accent: 0x768977,
  spawn: [0, 46],
  archive: [23, -34],
  discovery: {
    at: [-22, -29],
    title: "The brassworker",
    text: "A half-finished door knocker rests on the bench. Its lion has one polished eye.",
  },
  sound: {
    name: "Workshop alleys · brass chimes",
    wind: 0.065,
    water: 0,
    hum: 0.018,
    birds: 0.2,
    tone: 415,
    detail: "workshop",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.building(-30, 24, 32, 24, 15);
    k.building(24, 24, 27, 15, 11);
    k.building(-9, 0, 36, 16, 13);
    k.building(39, -4, 15, 28, 17);
    k.building(5, -28, 16, 20, 12);
    k.building(-40, -22, 12, 30, 10);
    for (const z of [-10, 7, 30]) {
      k.box(-13, 7, z, 5, 0.5, 9, 0x5e5444, false);
      k.box(-10.5, 7.5, z, 0.2, 1.2, 9, 0x4b5c52, false);
    }
    k.box(10, 10, 12, 39, 0.5, 6, 0x686754, false);
    k.arch(22, -17, 8, 9);
    k.stall(-23, -16, 0xa47a46);
    k.stall(26, 8, 0x4c7a76);
    for (const [x, z] of [
      [-9, 32],
      [15, -11],
      [28, -27],
      [-23, -40],
    ])
      k.lamp(x, z);
    for (let z = -3; z < 8; z += 3) k.crate(-32, z, 2, 0x8e7956);
    k.sign(0, 37, "CHAWRI / WORKSHOPS", 11, 6);
    k.scatter(8, 42);
  },
};
