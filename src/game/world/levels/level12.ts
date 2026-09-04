import type { LevelDefinition } from "../types";
export const level12: LevelDefinition = {
  id: 12,
  title: "Wazirabad Water Works",
  subtitle: "The pipes still carry a whisper.",
  ground: 0x718781,
  stone: 0x8eaaa1,
  accent: 0xc2aa65,
  spawn: [0, 46],
  archive: [0, -26],
  discovery: {
    at: [-34, 33],
    title: "Pressure, steady",
    text: "The gauge needle trembles at zero. Someone painted a small sun beside the safe pressure mark.",
  },
  sound: {
    name: "Waterworks · flowing channels and pump hum",
    wind: 0.15,
    water: 0.18,
    hum: 0.07,
    birds: 0.3,
    tone: 196,
    detail: "drip",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.water(37, -2, 20, 92);
    for (const z of [-24, 9]) {
      k.cylinder(-26, 0, z, 10, 8, 0x7d9b96);
      k.cylinder(-26, 8, z, 10.4, 0.4, 0xb7b49b, false);
      k.pipe(-26, 6, z + 12, 21, 0.7, "x");
    }
    k.floor(0, -6, 10, 50, 0x9caea0, 3);
    k.ramp(0, 29, 10, 20, -3, "z", 3);
    for (const side of [-1, 1])
      for (let z = -29; z < 20; z += 6)
        k.box(side * 4.6, 3, z, 0.12, 1.1, 0.12, 0xc8b27b, false);
    for (const side of [-1, 1])
      k.box(side * 4.6, 4, -6, 0.12, 0.12, 50, 0xc8b27b, false);
    k.pipe(15, 6, -12, 34, 0.7, "z");
    k.building(21, 32, 16, 13, 7, 0x8ba093);
    k.lamp(-8, 34);
    k.lamp(0, -30, 3);
    k.sign(0, 40, "WAZIRABAD / WATER", 13, 5);
    k.scatter(12, 30, 0x799082);
  },
};
