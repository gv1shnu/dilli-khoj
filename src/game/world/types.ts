import type { LevelKit } from "./kit";
import type { Point } from "./layout";
export interface Soundscape {
  name: string;
  wind: number;
  water: number;
  hum: number;
  birds: number;
  tone: number;
  detail: "bell" | "metal" | "drip" | "insects" | "wood" | "rail";
}
export interface LevelDefinition {
  id: number;
  title: string;
  subtitle: string;
  ground: number;
  stone: number;
  accent: number;
  archive: Point;
  spawn: Point;
  discovery: { at: Point; title: string; text: string };
  sound: Soundscape;
  build: (kit: LevelKit) => void;
}
