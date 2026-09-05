import * as THREE from "three";
import type { LevelDefinition } from "../types";
export const level14: LevelDefinition = {
  id: 14,
  title: "Azadpur Mandi",
  subtitle: "The harvest left its colours behind.",
  ground: 0x988b67,
  stone: 0xa5a17d,
  accent: 0x658767,
  spawn: [0, 46],
  archive: [29, -36],
  discovery: {
    at: [-34, 34],
    title: "The weighing stone",
    text: "The brass scale tips toward an empty basket. A child has scratched a mango into its base.",
  },
  sound: {
    name: "Mandi breeze · wood and nesting birds",
    wind: 0.13,
    water: 0,
    hum: 0.018,
    birds: 0.7,
    tone: 140,
    detail: "mandi",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    for (const x of [-26, 25]) {
      for (const z of [-39, -17, 5, 27])
        for (const dx of [-12, 12]) k.column(x + dx, z, 9, 0.25);
      k.box(x, 9, -7, 32, 0.35, 88, 0x768c77, false);
      for (const z of [-29, -7, 15])
        for (const dx of [-7, 0, 7]) {
          k.crate(x + dx, z, 3, 0x997b4d);
          for (let i = 0; i < 4; i++)
            k.mesh(
              new THREE.IcosahedronGeometry(0.5, 0),
              i % 2 ? 0xb29f4b : 0x799158,
              x + dx + ((i % 2) - 0.5),
              3.2,
              z + (Math.floor(i / 2) - 0.5),
            );
        }
    }
    k.building(0, -46, 30, 8, 7);
    k.sign(0, -41.9, "WEIGH HOUSE", 12, 5);
    k.box(0, 0, -22, 7, 0.35, 9, 0xa9a98d, false);
    k.lamp(-8, 32);
    k.lamp(8, -30);
    k.sign(0, 40, "AZADPUR MANDI", 12, 6);
    k.scatter(14, 48, 0x9f986b);
  },
};
