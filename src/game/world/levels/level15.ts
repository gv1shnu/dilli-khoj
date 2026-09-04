import * as THREE from "three";
import type { LevelDefinition } from "../types";
export const level15: LevelDefinition = {
  id: 15,
  title: "Ghazipur Landfill",
  subtitle: "A skyline made of yesterday.",
  ground: 0x7e795e,
  stone: 0x918b6b,
  accent: 0xa9a76c,
  spawn: [0, 46],
  archive: [0, -33],
  discovery: {
    at: [36, -37],
    title: "Green through the cracks",
    text: "A peepal sapling has split the casing of a television. Its roots hold the broken screen together.",
  },
  sound: {
    name: "Scrap hills · gusts and distant metal",
    wind: 0.38,
    water: 0,
    hum: 0.016,
    birds: 0.15,
    tone: 80,
    detail: "metal",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    for (const [x, z, r, h] of [
      [-29, 22, 15, 14],
      [31, 11, 17, 18],
      [-30, -24, 17, 23],
      [34, -17, 11, 12],
    ]) {
      k.mesh(new THREE.ConeGeometry(r, h, 9), 0x7f8061, x, h / 2, z, true);
      for (let i = 0; i < 10; i++)
        k.box(
          x + Math.sin(i * 2) * r * 0.6,
          h * 0.15 + (i % 3) * 1.3,
          z + Math.cos(i * 2) * r * 0.6,
          3,
          1,
          2,
          i % 2 ? 0x918569 : 0x6f7b6d,
          false,
          i,
        );
    }
    k.floor(0, -33, 18, 18, 0xa9a079, 5);
    k.ramp(0, 4, 12, 56, -5, "z", 5);
    for (const side of [-1, 1]) {
      k.box(side * 8.7, 5, -33, 0.2, 1.3, 18, 0x625c46, false);
      k.lamp(side * 7, -40, 5);
    }
    k.tree(43, -39, 8);
    k.crate(30, 39, 3);
    k.sign(0, 39, "GHAZIPUR / RECOVERY", 14, 5);
    k.scatter(15, 140, 0x929276);
  },
};
