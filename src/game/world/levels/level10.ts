import * as THREE from "three";
import type { LevelDefinition } from "../types";
export const level10: LevelDefinition = {
  id: 10,
  title: "Chor Bazaar",
  subtitle: "Everything lost has a second address.",
  ground: 0x797963,
  stone: 0x8c7962,
  accent: 0xb47f4c,
  spawn: [0, 46],
  archive: [-25, -31],
  discovery: {
    at: [32, 24],
    title: "The borrowed clock",
    text: "Every clock in this stall shows a different hour. One of them is still ticking.",
  },
  sound: {
    name: "Salvage yard · rattling metal",
    wind: 0.2,
    water: 0,
    hum: 0.012,
    birds: 0.25,
    tone: 95,
    detail: "metal",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    for (const [x, z, r] of [
      [-27, 21, 12],
      [22, 3, 14],
      [-15, -9, 9],
      [32, -30, 10],
      [-43, -34, 6],
    ]) {
      k.mesh(new THREE.ConeGeometry(r, 7, 7), 0x74664f, x, 3, z, true);
      for (let i = 0; i < 8; i++)
        k.box(
          x + Math.cos(i * 2) * r * 0.6,
          1 + (i % 3),
          z + Math.sin(i * 2) * r * 0.6,
          3,
          0.6,
          2,
          i % 2 ? 0x70837a : 0xa48054,
          false,
          i * 0.4,
        );
    }
    k.stall(27, 33, 0xa58452);
    k.stall(-31, -42, 0x5b7a76);
    k.arch(0, 38, 12, 9);
    k.box(39, 0, 3, 2, 9, 32, 0x706756);
    k.box(-47, 0, 2, 2, 6, 24, 0x7b7866);
    for (const [x, z] of [
      [4, 19],
      [-8, -31],
      [30, -13],
      [-40, 39],
    ]) {
      k.crate(x, z, 2);
      k.lamp(x + 3, z);
    }
    k.sign(0, 39, "CHOR BAZAAR", 10, 8);
    k.scatter(10, 110, 0x879078);
  },
};
