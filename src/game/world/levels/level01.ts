import type { LevelDefinition } from "../types";
export const level01: LevelDefinition = {
  id: 1,
  title: "Purana Qila",
  subtitle: "The gate remembers every arrival.",
  ground: 0x817866,
  stone: 0xa77b61,
  accent: 0xc8a66d,
  spawn: [0, 43],
  archive: [0, -26],
  discovery: {
    at: [-31, -22],
    title: "The last watch",
    text: "A pair of sandals waits beside an empty watch post. Someone expected to come back.",
  },
  sound: {
    name: "Fortress wind · distant bells",
    wind: 0.3,
    water: 0,
    hum: 0.008,
    birds: 0.75,
    tone: 220,
    detail: "bell",
  },
  build(k) {
    k.floor(0, 0, 100, 100);
    k.floor(0, 7, 16, 76, 0xb6a18a);
    k.arch(0, 32, 15, 15);
    for (const side of [-1, 1]) {
      k.wall(side * 33, 35, 40, 4, 12);
      k.wall(side * 47, -2, 4, 78, 10);
      k.cylinder(side * 45, 0, 36, 7, 16);
      k.cylinder(side * 45, 16, 36, 7.7, 1, 0xc8a66d, false);
      for (let z = -28; z <= 17; z += 15) {
        k.column(side * 25, z, 7);
        k.box(side * 34, 7, z, 21, 0.7, 12, 0xb89979, false);
      }
      k.tree(side * 34, -36, 11);
      k.lamp(side * 10, 24);
      k.lamp(side * 10, -18);
    }
    k.wall(0, -46, 96, 3, 10);
    k.arch(0, -35, 11, 10);
    k.sign(0, 32, "PURANA QILA", 12, 14);
    k.scatter(1, 45);
  },
};
