import type { LevelDefinition } from "../types";
export const level07: LevelDefinition = {
  id: 7,
  title: "Fatehpuri Masjid Steps",
  subtitle: "A wide stair into the quiet.",
  ground: 0x9b8f7a,
  stone: 0xbb987f,
  accent: 0xd9c6a2,
  spawn: [0, 46],
  archive: [0, -25],
  discovery: {
    at: [29, -13],
    title: "Shade at noon",
    text: "The courtyard sundial still keeps time. Grass has grown around every hour except noon.",
  },
  sound: {
    name: "Courtyard air · pigeons",
    wind: 0.12,
    water: 0.035,
    hum: 0,
    birds: 0.9,
    tone: 280,
    detail: "bell",
  },
  build(k) {
    k.floor(0, 0, 104, 104);
    k.floor(0, -16, 90, 60, 0xc5b395, 5);
    k.ramp(0, 26, 26, 24, -5, "z", 5);
    for (const x of [-37, 37]) {
      k.cylinder(x, 0, -35, 4, 20);
      k.dome(x, -35, 5, 20);
      k.wall(x, 26, 20, 22, 5);
    }
    for (let x = -28; x <= 28; x += 14) {
      k.column(x, -39, 10, 0.8, 5);
    }
    k.box(0, 15, -40, 67, 0.7, 9, 0xc2ad8c, false);
    k.dome(0, -40, 12, 15);
    k.water(-23, -12, 15, 16, 5.02);
    k.lamp(-15, 8, 5);
    k.lamp(15, 8, 5);
    for (const x of [-43, 43]) for (const z of [-20, 1]) k.tree(x, z, 10);
    k.sign(0, 37, "FATEHPURI STEPS", 12, 6);
    k.scatter(7, 30);
  },
};
