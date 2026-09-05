import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LevelDefinition } from "./types";
import type { LevelKit } from "./kit";

export type RestorationMotif =
  | "watchfires"
  | "departure_signal"
  | "river_return"
  | "living_records"
  | "vault_mechanism"
  | "market_lanterns"
  | "courtyard_lights"
  | "brass_workshop"
  | "jewel_constellation"
  | "clockwork"
  | "hearth"
  | "water_pressure"
  | "rail_signal"
  | "harvest"
  | "regrowth"
  | "sorting_line"
  | "interchange"
  | "signal_tower"
  | "stepwell_water"
  | "bridge_lights";

export interface RestorationDefinition {
  id: number;
  motif: RestorationMotif;
  title: string;
  detail: string;
  color: number;
}

export const RESTORATIONS: readonly RestorationDefinition[] = [
  {
    id: 1,
    motif: "watchfires",
    title: "The watch returns",
    detail: "Beacon fires answer one another across the old gate.",
    color: 0xffa43a,
  },
  {
    id: 2,
    motif: "departure_signal",
    title: "Departures resume",
    detail: "The bay signal turns green and the silent board wakes.",
    color: 0x62e4bd,
  },
  {
    id: 3,
    motif: "river_return",
    title: "The river answers",
    detail: "Ripples gather around a newly lit river marker.",
    color: 0x5bd4dc,
  },
  {
    id: 4,
    motif: "living_records",
    title: "The records breathe",
    detail: "Loose pages rise into an ordered, glowing archive.",
    color: 0xf1d39a,
  },
  {
    id: 5,
    motif: "vault_mechanism",
    title: "The lock releases",
    detail: "The vault rings align and the old mechanism turns.",
    color: 0xe0be63,
  },
  {
    id: 6,
    motif: "market_lanterns",
    title: "The bazaar wakes",
    detail: "Lanterns and awnings bring colour back to the empty street.",
    color: 0xff7958,
  },
  {
    id: 7,
    motif: "courtyard_lights",
    title: "The courtyard gathers",
    detail: "A circle of lamps warms the broad stone steps.",
    color: 0xffce72,
  },
  {
    id: 8,
    motif: "brass_workshop",
    title: "The workshop rings",
    detail: "Brass wheels turn and sparks travel between the benches.",
    color: 0xf4ad45,
  },
  {
    id: 9,
    motif: "jewel_constellation",
    title: "Dariba shines",
    detail: "Cut stones assemble into a constellation above the lane.",
    color: 0xdba8ff,
  },
  {
    id: 10,
    motif: "clockwork",
    title: "Lost time returns",
    detail: "Recovered clock faces begin keeping the same time.",
    color: 0x90d8c1,
  },
  {
    id: 11,
    motif: "hearth",
    title: "The hearth is warm",
    detail: "Fire, steam and table light return to the courtyard kitchen.",
    color: 0xff7548,
  },
  {
    id: 12,
    motif: "water_pressure",
    title: "Pressure restored",
    detail: "The pumps answer and clean water rises through the conduits.",
    color: 0x55d3e0,
  },
  {
    id: 13,
    motif: "rail_signal",
    title: "The line is open",
    detail: "Platform lamps illuminate a signal pointing down the track.",
    color: 0x64e59f,
  },
  {
    id: 14,
    motif: "harvest",
    title: "The harvest returns",
    detail: "Empty baskets fill and the mandi regains its colour.",
    color: 0xe9b83f,
  },
  {
    id: 15,
    motif: "regrowth",
    title: "Green breaks through",
    detail: "A living tree rises above the hills of discarded things.",
    color: 0x83d36e,
  },
  {
    id: 16,
    motif: "sorting_line",
    title: "The yard finds order",
    detail: "The sorting line starts and marked containers move into place.",
    color: 0x67cddd,
  },
  {
    id: 17,
    motif: "interchange",
    title: "The passages connect",
    detail: "Three luminous routes cross and pulse through the concourse.",
    color: 0x7ee3d4,
  },
  {
    id: 18,
    motif: "signal_tower",
    title: "The ridge transmits",
    detail: "A bright signal climbs the tower and sweeps over the trees.",
    color: 0xa7df74,
  },
  {
    id: 19,
    motif: "stepwell_water",
    title: "The baoli fills",
    detail: "Water rises through the lowest steps and catches the light.",
    color: 0x55bfcf,
  },
  {
    id: 20,
    motif: "bridge_lights",
    title: "The city is connected",
    detail: "Bridge cables and twenty lights join the restored horizon.",
    color: 0xf4cf72,
  },
] as const;

export function restorationFor(id: number): RestorationDefinition {
  return RESTORATIONS[id - 1] ?? RESTORATIONS[0];
}

/** A small, no-download set piece unique to each ruin. All parts are non-solid. */
export function buildRestorationFeature(
  def: LevelDefinition,
  kit: LevelKit,
): THREE.Group {
  const restoration = restorationFor(def.id);
  const group = new THREE.Group();
  group.name = `restoration-${String(def.id).padStart(2, "0")}`;
  group.userData.dynamic = true;
  group.userData.restoration = restoration.motif;
  group.position.set(
    def.archive[0],
    kit.height(...def.archive),
    def.archive[1],
  );

  let partIndex = 0;
  const add = (
    geometry: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    glow = 0.75,
  ) => {
    const mesh = kit.mesh(geometry, color, x, y, z, false);
    mesh.material = kit.material(color, glow);
    mesh.userData.restorationPart = partIndex++;
    group.add(mesh);
    return mesh;
  };
  const box = (
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color = restoration.color,
  ) => add(new THREE.BoxGeometry(w, h, d), color, x, y, z);
  const orb = (
    x: number,
    y: number,
    z: number,
    radius = 0.35,
    color = restoration.color,
  ) => add(new THREE.IcosahedronGeometry(radius, 1), color, x, y, z, 1.1);
  const column = (
    x: number,
    y: number,
    z: number,
    radius: number,
    height: number,
    color = restoration.color,
  ) =>
    add(new THREE.CylinderGeometry(radius, radius, height, 10), color, x, y, z);
  const ring = (
    x: number,
    y: number,
    z: number,
    radius: number,
    color = restoration.color,
  ) => {
    const mesh = add(
      new THREE.TorusGeometry(radius, 0.09, 6, 32),
      color,
      x,
      y,
      z,
      1,
    );
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  };

  switch (restoration.motif) {
    case "watchfires":
      for (const [x, z] of [
        [-5, -3],
        [5, -3],
        [-5, 3],
        [5, 3],
      ] as const) {
        column(x, 0.45, z, 0.55, 0.9, 0x67442c);
        add(
          new THREE.ConeGeometry(0.55, 1.8, 7),
          restoration.color,
          x,
          1.8,
          z,
          1.35,
        );
      }
      break;
    case "departure_signal":
      box(0, 3.8, 0, 7, 2.8, 0.28, 0x263a39);
      for (let i = 0; i < 3; i++)
        orb(
          -2.3 + i * 2.3,
          3.8,
          -0.24,
          0.42,
          i === 2 ? restoration.color : 0xb06a4f,
        );
      column(0, 1.5, 0, 0.18, 3, 0x8b927e);
      break;
    case "river_return":
      for (const radius of [2.5, 4, 5.5]) ring(0, 0.15, 0, radius);
      box(0, 1, 0, 4.5, 0.22, 1.5, 0x7d6045);
      const sail = add(
        new THREE.ConeGeometry(1.6, 3.2, 3),
        0xefe1be,
        0,
        2.5,
        0,
        0.35,
      );
      sail.rotation.z = 0.18;
      break;
    case "living_records":
      for (let i = 0; i < 7; i++) {
        const page = box(
          (i - 3) * 0.85,
          1.3 + Math.abs(i - 3) * 0.28,
          (i % 2) * 0.45,
          0.65,
          0.06,
          1,
        );
        page.rotation.y = (i - 3) * 0.16;
      }
      break;
    case "vault_mechanism":
      for (const radius of [2.2, 3.4, 4.6]) {
        const vaultRing = ring(0, 2.6, 0, radius);
        vaultRing.rotation.x = 0;
      }
      for (let i = 0; i < 8; i++)
        orb(
          Math.cos((i * Math.PI) / 4) * 4.6,
          2.6,
          Math.sin((i * Math.PI) / 4) * 0.25,
          0.22,
        );
      break;
    case "market_lanterns":
      for (let i = -3; i <= 3; i++) {
        box(
          i * 1.5,
          4 + Math.abs(i) * 0.15,
          0,
          1.15,
          0.12,
          2.8,
          i % 2 ? 0xd15d45 : 0xe7c36e,
        );
        orb(i * 1.5, 2.5, 1.8, 0.32, restoration.color);
      }
      break;
    case "courtyard_lights":
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        column(
          Math.cos(angle) * 5,
          1.3,
          Math.sin(angle) * 5,
          0.12,
          2.6,
          0x766950,
        );
        orb(Math.cos(angle) * 5, 2.8, Math.sin(angle) * 5, 0.28);
      }
      break;
    case "brass_workshop":
      for (const [radius, y] of [
        [2.2, 1.7],
        [3.4, 2.7],
        [4.6, 1.8],
      ] as const) {
        const gear = ring(0, y, 0, radius, restoration.color);
        gear.rotation.x = 0;
      }
      for (let i = 0; i < 9; i++)
        orb(Math.cos(i) * 4.8, 1 + (i % 3), Math.sin(i) * 1.4, 0.16, 0xffdf79);
      break;
    case "jewel_constellation":
      for (let i = 0; i < 10; i++) {
        const angle = i * 2.4;
        orb(
          Math.cos(angle) * (2 + (i % 3)),
          1.2 + (i % 4),
          Math.sin(angle) * (2 + (i % 3)),
          0.3 + (i % 2) * 0.12,
          i % 3 ? restoration.color : 0x8ee6dd,
        );
      }
      break;
    case "clockwork":
      for (const [x, radius] of [
        [-3.2, 2],
        [0, 2.7],
        [3.5, 1.6],
      ] as const) {
        const face = ring(x, 2.8, 0, radius);
        face.rotation.x = 0;
        box(x, 2.8, -0.1, 0.12, radius * 1.5, 0.12);
        box(x + radius * 0.35, 2.8, -0.1, radius * 0.7, 0.12, 0.12);
      }
      break;
    case "hearth":
      for (let i = -2; i <= 2; i++)
        add(
          new THREE.ConeGeometry(0.55, 2.2 + (i % 2) * 0.5, 7),
          i % 2 ? 0xffc15b : restoration.color,
          i * 0.7,
          1.3,
          0,
          1.3,
        );
      for (let i = 0; i < 4; i++)
        ring(0, 2.8 + i * 0.7, 0, 0.7 + i * 0.25, 0xe8e0c8);
      break;
    case "water_pressure":
      ring(0, 0.25, 0, 5.2);
      for (let i = -2; i <= 2; i++) {
        column(
          i * 1.6,
          1.4 + (2 - Math.abs(i)) * 0.5,
          0,
          0.12,
          2.8 + (2 - Math.abs(i)),
          restoration.color,
        );
        orb(i * 1.6, 3 + (2 - Math.abs(i)), 0, 0.22);
      }
      break;
    case "rail_signal":
      column(0, 3, 0, 0.2, 6, 0x757b72);
      box(0, 5.4, 0, 3, 2, 0.3, 0x263a39);
      orb(0, 5.7, -0.28, 0.48, restoration.color);
      for (const x of [-4, -2, 2, 4]) orb(x, 0.5, 0, 0.25, 0xf3d37b);
      break;
    case "harvest":
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        orb(
          Math.cos(angle) * (2.2 + (i % 2)),
          0.45 + (i % 3) * 0.35,
          Math.sin(angle) * (2.2 + (i % 2)),
          0.55,
          [0xe9b83f, 0xd66c43, 0x83b85e][i % 3],
        );
      }
      ring(0, 0.2, 0, 4.5, 0x8b6841);
      break;
    case "regrowth":
      column(0, 2.5, 0, 0.7, 5, 0x67563d);
      for (let i = 0; i < 9; i++) {
        const angle = (i / 9) * Math.PI * 2;
        orb(
          Math.cos(angle) * 2.5,
          4.5 + (i % 3) * 0.65,
          Math.sin(angle) * 2.5,
          1.25,
          i % 2 ? restoration.color : 0x5caf62,
        );
      }
      break;
    case "sorting_line":
      box(0, 0.45, 0, 10, 0.45, 2.6, 0x4f6868);
      for (let i = -3; i <= 3; i++)
        box(
          i * 1.35,
          1.1,
          0,
          1,
          0.9,
          1.6,
          i % 2 ? restoration.color : 0xf0bc61,
        );
      break;
    case "interchange":
      for (let i = 0; i < 3; i++) {
        const route = ring(
          0,
          2.5,
          0,
          2.5 + i * 1.1,
          [restoration.color, 0xe7b85a, 0x8ba8ef][i],
        );
        route.rotation.set(i === 0 ? 0 : Math.PI / 2, (i * Math.PI) / 3, 0);
      }
      break;
    case "signal_tower":
      column(0, 4, 0, 0.35, 8, 0x65736b);
      for (const y of [2, 4, 6]) ring(0, y, 0, 1.2 + y * 0.12);
      add(
        new THREE.ConeGeometry(0.8, 7, 10, 1, true),
        restoration.color,
        0,
        10,
        0,
        0.5,
      );
      break;
    case "stepwell_water":
      box(0, 0.12, 0, 10, 0.18, 8, 0x3b8f9e);
      for (const radius of [1.5, 3, 4.5])
        ring(0, 0.28, 0, radius, restoration.color);
      for (const x of [-4, 4]) column(x, 1.5, 0, 0.12, 3, restoration.color);
      break;
    case "bridge_lights":
      for (const x of [-5, 5]) column(x, 3.5, 0, 0.25, 7, 0xb9b28f);
      for (let i = 0; i < 10; i++) {
        const x = -5 + (i / 9) * 10;
        const y = 3.5 + Math.pow(Math.abs(x) / 5, 1.6) * 3;
        orb(x, y, 0, 0.25, restoration.color);
      }
      box(0, 0.35, 0, 12, 0.3, 2.4, 0xb9b28f);
      break;
  }

  // Merge parts that share a material. The set piece remains one animated group,
  // while each mirrored copy adds only a few draw calls instead of one per ornament.
  const batches = new Map<THREE.Material, THREE.Mesh[]>();
  for (const child of group.children) {
    if (!(child instanceof THREE.Mesh) || Array.isArray(child.material))
      continue;
    const batch = batches.get(child.material) ?? [];
    batch.push(child);
    batches.set(child.material, batch);
  }
  let batchIndex = 0;
  for (const [material, meshes] of batches) {
    if (meshes.length < 2) continue;
    const geometries = meshes.map((mesh) => {
      mesh.updateMatrix();
      return mesh.geometry.clone().applyMatrix4(mesh.matrix);
    });
    const geometry = mergeGeometries(geometries, false);
    geometries.forEach((item) => item.dispose());
    if (!geometry) continue;
    const merged = kit.mesh(geometry, restoration.color, 0, 0, 0, false);
    merged.material = material as THREE.MeshStandardMaterial;
    merged.userData.restorationPart = batchIndex++;
    group.add(merged);
    meshes.forEach((mesh) => mesh.removeFromParent());
  }

  group.userData.parts = partIndex;
  group.visible = false;
  group.scale.setScalar(0.001);
  kit.group.add(group);
  return group;
}
