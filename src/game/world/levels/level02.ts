import type { LevelDefinition } from "../types";
export const level02: LevelDefinition = {
  id: 2,
  title: "Kashmere Gate ISBT",
  subtitle: "Departures that never left.",
  ground: 0x687578,
  stone: 0x8f9c98,
  accent: 0xc3b05f,
  spawn: [0, 46],
  archive: [29, -29],
  discovery: {
    at: [-34, 20],
    title: "Platform seven",
    text: "A hand-painted route board promises one last bus to the hills. Its departure time has faded away.",
  },
  sound: {
    name: "Depot draft · loose metal",
    wind: 0.18,
    water: 0,
    hum: 0.035,
    birds: 0.2,
    tone: 146,
    detail: "depot",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.floor(0, 0, 12, 95, 0xb2aaa0);
    for (const x of [-22, 20])
      for (const z of [-22, 3, 27])
        k.bus(x, z, x < 0 ? 0x6c9b8c : 0xba8650, 0.08 * (z / 27));
    for (const side of [-1, 1]) {
      k.box(side * 38, 0, -7, 5, 0.25, 75, 0xb5b1a0, false);
      for (let z = -38; z < 40; z += 15) k.column(side * 40, z, 6, 0.18);
      k.box(side * 39, 6, -4, 12, 0.35, 91, 0x567b78, false);
    }
    k.building(18, -43, 42, 9, 6);
    k.sign(18, -38, "DEPARTURES", 12, 5);
    k.building(-40, 33, 9, 10, 4, 0xb9b6a0);
    k.sign(-40, 38.1, "TICKETS", 5, 3);
    for (const z of [-30, 0, 30]) {
      k.lamp(-7, z);
      k.box(7, 0.02, z, 1, 0.03, 5, 0xd6ba69, false);
    }
    k.crate(-32, -38);
    k.crate(-30, -40);
    k.scatter(2, 26, 0x65716b);
  },
};
