import type { LevelDefinition } from "../types";
export const level19: LevelDefinition = {
  id: 19,
  title: "Agrasen ki Baoli",
  subtitle: "The city falls quiet one step at a time.",
  ground: 0x9b8b75,
  stone: 0xb29b7e,
  accent: 0x747e69,
  spawn: [0, 46],
  archive: [0, -36],
  discovery: {
    at: [25, 28],
    title: "Names in the stone",
    text: "Hundreds of hands have smoothed the same corner. One tiny name remains, carved where only a child would look.",
  },
  sound: {
    name: "Stepwell hush · falling water",
    wind: 0.025,
    water: 0.035,
    hum: 0.012,
    birds: 0.15,
    tone: 790,
    detail: "drip",
  },
  build(k) {
    k.floor(0, 0, 104, 104, 0x7d8876);
    for (const side of [-1, 1]) {
      k.floor(side * 43.25, 0, 17.5, 104, 0xa99b7b, 7);
      k.floor(0, side * 47, 69, 10, 0xa99b7b, 7);
    }
    k.floor(-25, -2, 12, 82, 0xaf997a, 3);
    k.floor(25, -2, 12, 82, 0xaf997a, 3);
    k.ramp(0, 7.5, 18, 69, 7, "z");
    k.floor(14, 3, 12, 8, 0xaf997a, 3);
    k.floor(-14, 3, 12, 8, 0xaf997a, 3);
    for (const side of [-1, 1]) {
      k.wall(side * 38, -3, 5, 91, 14);
      for (let z = -34; z <= 32; z += 11) {
        k.column(side * 18, z, 10, 0.65);
        k.box(side * 27, 10, z, 21, 0.5, 10, 0x9a8b73, false);
      }
      k.box(side * 33, 7, -3, 3, 0.5, 88, 0xc3ac87, false);
    }
    k.wall(0, -48, 80, 3, 15);
    k.arch(0, -43, 13, 11);
    k.water(0, -46, 12, 3);
    k.tree(-44, 36, 10);
    k.tree(43, 35, 12);
    k.sign(0, 43, "AGRASEN KI BAOLI", 14, 11);
    k.lamp(-12, -28);
    k.lamp(12, -28);
    k.scatter(19, 20);
  },
};
