import * as THREE from "three";
import type { LevelDefinition } from "../types";
export const level17: LevelDefinition = {
  id: 17,
  title: "Rajiv Chowk Interchange",
  subtitle: "Every passage once led somewhere.",
  ground: 0x858b83,
  stone: 0xa2aaa0,
  accent: 0x4c8c8b,
  spawn: [0, 46],
  archive: [0, -21],
  discovery: {
    at: [26, 10],
    title: "Meeting point",
    text: "Under the old meeting-point sign, two names have been written together. The chalk is sheltered from the rain.",
  },
  sound: {
    name: "Underground concourse · electrical resonance",
    wind: 0.03,
    water: 0.01,
    hum: 0.075,
    birds: 0,
    tone: 240,
    detail: "concourse",
  },
  build(k) {
    k.floor(0, 0, 104, 104, 0x87958b);
    for (const side of [-1, 1]) {
      k.floor(side * 43.25, 0, 17.5, 104, 0x87958b, 4);
      k.floor(0, side * 43.25, 69, 17.5, 0x87958b, 4);
    }
    k.floor(0, 0, 65, 65, 0xa4aa98, 0);
    k.ramp(0, 37, 16, 12, 4, "z");
    for (let i = 0; i < 24; i++) {
      const a = (i * Math.PI) / 12;
      if (i % 6 === 0) continue;
      k.box(Math.sin(a) * 36, 0, Math.cos(a) * 36, 8, 10, 2, 0x8fa39b, true, a);
      if (i % 2 === 0) k.column(Math.sin(a) * 25, Math.cos(a) * 25, 8, 0.7);
    }
    k.cylinder(0, 0, 0, 6, 0.4, 0x6b8e86, false);
    k.cylinder(0, 0.4, 0, 1.5, 4, 0xb9af86);
    const torus = new THREE.TorusGeometry(6.5, 0.2, 6, 40);
    torus.rotateX(Math.PI / 2);
    k.mesh(torus, 0xc5b681, 0, 0.6, 0, false);
    for (const x of [-19, 19]) k.box(x, 0, -8, 8, 0.6, 2, 0x8a9484);
    k.sign(0, 30, "RAJIV CHOWK", 12, 8);
    k.sign(20, -16, "EXIT / RIDGE", 7, 5);
    k.lamp(-15, 14);
    k.lamp(15, -14);
    k.scatter(17, 28);
  },
};
