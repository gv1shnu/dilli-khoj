import type { LevelDefinition } from "../types";
export const level03: LevelDefinition = {
  id: 3,
  title: "Nigambodh Ghat",
  subtitle: "The city meets the water.",
  ground: 0x998c73,
  stone: 0xbba584,
  accent: 0xd6b783,
  spawn: [0, 45],
  archive: [-26, -25],
  discovery: {
    at: [11, -37],
    title: "A boat without an oar",
    text: "The mooring rope is still tied. The river has kept the boat long after its owner vanished.",
  },
  sound: {
    name: "River wash · water birds",
    wind: 0.17,
    water: 0.22,
    hum: 0,
    birds: 0.8,
    tone: 540,
    detail: "drip",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.water(38, 0, 27, 103);
    k.floor(-25, -17, 36, 46, 0xb19c7c, 3);
    // Approach from the north so the terrace joins the high end of the stairs.
    k.ramp(-25, -46, 18, 12, 3, "z");
    k.ramp(-25, 12, 18, 12, -3, "z", 3);
    for (const z of [-38, -15, 10, 35]) {
      k.box(19, 0, z, 5, 0.4, 12, 0xc3b28f, false);
      k.column(14, z, 5, 0.45);
    }
    k.arch(-26, -34, 9, 10);
    k.dome(-26, -34, 6, 10);
    for (const z of [-20, 22]) {
      k.box(30, 0.3, z, 3, 0.5, 10, 0x624a38, false);
      k.box(28.4, 0.6, z, 0.3, 0.8, 10, 0x805d3f, false);
      k.box(31.6, 0.6, z, 0.3, 0.8, 10, 0x805d3f, false);
    }
    k.tree(-43, 31, 12);
    k.lamp(-7, 20);
    k.sign(-8, 40, "NIGAMBODH GHAT", 10, 4);
    k.scatter(3, 18);
  },
};
