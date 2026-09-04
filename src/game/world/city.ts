import * as THREE from "three";
import { cityTexture } from "./textures";
import { currentRuinId, isUnlocked } from "../progression";
import {
  CITY_TILE,
  CELL,
  levelCenter,
  levelAt,
  canEnter,
  toWorld,
  gatePoint,
  type Point,
} from "./layout";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import type { LevelDefinition } from "./types";

export function buildCity() {
  const group = new THREE.Group(),
    stone = cityTexture("stone"),
    ground = cityTexture("ground");
  const material = new THREE.MeshStandardMaterial({
    color: 0x5f7056,
    map: ground,
    roughness: 1,
  });
  const plane = new THREE.PlaneGeometry(CITY_TILE, CITY_TILE);
  plane.rotateX(-Math.PI / 2);
  const horizonMaterial = new THREE.MeshStandardMaterial({
    color: 0x566554,
    roughness: 1,
  });
  const silhouette = new THREE.BoxGeometry(32, 9, 30);
  // Keep the 3×3 toroidal world; distant copies use inexpensive silhouettes.
  for (let dx = -1; dx <= 1; dx++)
    for (let dz = -1; dz <= 1; dz++) {
      const groundMesh = new THREE.Mesh(plane, material);
      groundMesh.position.set(dx * CITY_TILE, -0.2, dz * CITY_TILE);
      groundMesh.receiveShadow = true;
      group.add(groundMesh);
      if (dx || dz)
        for (let id = 1; id <= 20; id++) {
          const [x, z] = levelCenter(id);
          const m = new THREE.Mesh(silhouette, horizonMaterial);
          m.position.set(x + dx * CITY_TILE, 4, z + dz * CITY_TILE);
          group.add(m);
        }
    }
  const kits = new Map<number, LevelKit>();
  const archives = new Map<number, THREE.Group>();
  const cores = new Map<number, THREE.MeshStandardMaterial>();
  const locked = new Map<number, THREE.Group>();
  const gateSeals = new Map<number, THREE.Group>();
  const gateKits: LevelKit[] = [];
  const gateObstacles: THREE.Box3[] = [];
  const regrowth = new Map<number, THREE.Group>();
  let cleared: readonly number[] = [];
  const ringGeo = new THREE.TorusGeometry(2, 0.08, 6, 40),
    coreGeo = new THREE.OctahedronGeometry(0.85),
    baseGeo = new THREE.CylinderGeometry(2, 2.3, 0.6, 12);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x5d6252,
    roughness: 0.9,
  });
  const mistGeo = new THREE.BoxGeometry(CELL - 0.5, 7, CELL - 0.5);
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0x192d30,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  });
  for (const def of LEVELS) {
    const kit = new LevelKit(def, stone, ground);
    kit.group.name = `level-${String(def.id).padStart(2, "0")}`;
    def.build(kit);
    const entryHeight = kit.height(...def.spawn);
    if (entryHeight > 1)
      kit.ramp(0, 54, 18, 12, -entryHeight, "z", entryHeight);
    const [x, z] = levelCenter(def.id);
    kit.group.position.set(x, 0, z);
    group.add(kit.group);
    kits.set(def.id, kit);
    const archive = new THREE.Group(),
      a = toWorld(def.id, def.archive);
    archive.position.set(a[0], kit.height(...def.archive), a[1]);
    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffb34c,
      emissive: 0xff9f36,
      emissiveIntensity: 2,
    });
    cores.set(def.id, coreMat);
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.3;
    archive.add(base);
    const core = new THREE.Mesh(coreGeo, coreMat);
    core.position.y = 2;
    archive.add(core);
    const ring = new THREE.Mesh(ringGeo, coreMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.65;
    archive.add(ring);
    const beacon = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.3, 15, 6),
      coreMat,
    );
    beacon.position.y = 8;
    archive.add(beacon);
    group.add(archive);
    archives.set(def.id, archive);
    const seal = new THREE.Group();
    seal.position.set(x, 3, z);
    seal.add(new THREE.Mesh(mistGeo, mistMat));
    group.add(seal);
    locked.set(def.id, seal);
    const d = def.discovery.at;
    kit.sign(d[0], d[1], def.discovery.title, 5, 2.8);
    const plants = new THREE.Group();
    plants.userData.dynamic = true;
    for (let i = 0; i < 24; i++) {
      const px = ((i * 31 + def.id * 7) % 86) - 43,
        pz = ((i * 19 + def.id * 11) % 86) - 43;
      if (kit.blocked(px, pz)) continue;
      const sprig = kit.mesh(
        new THREE.ConeGeometry(0.3, 0.9, 5),
        0x8aa16b,
        px,
        kit.height(px, pz) + 0.45,
        pz,
      );
      plants.add(sprig);
    }
    kit.group.add(plants);
    regrowth.set(def.id, plants);
    // Each destination has a physical entrance sign.
    kit.sign(
      -28,
      49,
      `${String(def.id).padStart(2, "0")} / ${def.title.toUpperCase()}`,
      11,
      3,
    );
    kit.optimize();
  }
  for (let id = 1; id < 20; id++) {
    const def = LEVELS.find((l) => l.id === id + 1);
    if (!def) continue;
    const kit = new LevelKit(def, stone, ground),
      p = gatePoint(id, id + 1),
      a = levelCenter(id),
      b = levelCenter(id + 1);
    kit.group.position.set(p[0], 0, p[1]);
    if (a[0] !== b[0]) kit.group.rotation.y = Math.PI / 2;
    kit.floor(0, 0, 23, 21, 0x939683);
    kit.arch(0, 0, 18, 7);
    kit.sign(
      0,
      0.1,
      `${String(id + 1).padStart(2, "0")} / ${def.title.toUpperCase()}`,
      15,
      7,
    );
    const seal = new THREE.Group();
    for (let x = -8; x <= 8; x += 2) {
      const bar = kit.box(x, 0, 0, 0.13, 5, 0.13, 0x71989a, false);
      bar.material = kit.material(0x71989a, 0.4);
      seal.add(bar);
    }
    kit.group.add(seal);
    group.add(kit.group);
    gateSeals.set(id + 1, seal);
    gateKits.push(kit);
    kit.group.updateMatrixWorld(true);
    gateObstacles.push(
      ...kit.obstacles.map((b) =>
        b.clone().applyMatrix4(kit.group.matrixWorld),
      ),
    );
  }
  const defFor = (id: number) => LEVELS.find((l) => l.id === id) ?? LEVELS[0];
  const height = (x: number, z: number) => {
    const id = levelAt(x, z);
    if (!id) return 0;
    const [cx, cz] = levelCenter(id);
    return kits.get(id)?.height(x - cx, z - cz) ?? 0;
  };
  const blocked = (x: number, z: number) => {
    if (!canEnter(x, z, cleared)) return true;
    const y = height(x, z);
    if (
      gateObstacles.some(
        (b) =>
          x + 0.65 > b.min.x &&
          x - 0.65 < b.max.x &&
          z + 0.65 > b.min.z &&
          z - 0.65 < b.max.z &&
          b.max.y > y + 0.25 &&
          b.min.y < y + 1.9,
      )
    )
      return true;
    const id = levelAt(x, z);
    if (!id) return false;
    const [cx, cz] = levelCenter(id);
    // An unfinished authoring slot stays sealed until its level is implemented.
    if (!kits.has(id)) return true;
    return kits.get(id)!.blocked(x - cx, z - cz);
  };
  const position = (id: number, kind: "spawn" | "archive"): THREE.Vector3 => {
    const d = defFor(id),
      p = toWorld(d.id, d[kind]);
    return new THREE.Vector3(p[0], height(...p), p[1]);
  };
  const setProgress = (next: readonly number[]) => {
    cleared = next;
    for (const [id, seal] of gateSeals) seal.visible = !isUnlocked(id, cleared);
    for (const def of LEVELS) {
      const done = cleared.includes(def.id),
        open = isUnlocked(def.id, cleared);
      const m = cores.get(def.id)!;
      m.color.setHex(done ? 0x80d9bc : open ? 0xffb34c : 0x708483);
      m.emissive.copy(m.color);
      m.emissiveIntensity = open ? 2 : 0.1;
      locked.get(def.id)!.visible = !open;
      regrowth.get(def.id)!.visible = done;
      const kit = kits.get(def.id)!;
      kit.group.traverse((object) => {
        if (
          object instanceof THREE.Mesh &&
          object.material instanceof THREE.MeshStandardMaterial &&
          object.material.emissiveIntensity > 0
        )
          object.material.emissiveIntensity = done ? 1.7 : 0.12;
      });
    }
  };
  setProgress([]);
  return {
    group,
    tile: CITY_TILE,
    blocked,
    height,
    position,
    setProgress,
    canWalk: (from: Point, to: Point) => {
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.3),
      );
      let y = height(...from);
      for (let i = 1; i <= steps; i++) {
        const x = from[0] + ((to[0] - from[0]) * i) / steps,
          z = from[1] + ((to[1] - from[1]) * i) / steps,
          next = height(x, z);
        if (blocked(x, z) || Math.abs(next - y) > 0.7) return false;
        y = next;
      }
      return true;
    },
    target: () => position(currentRuinId(cleared), "archive"),
    definition: (id: number): LevelDefinition => defFor(id),
    nearArchive: (p: THREE.Vector3): number | null => {
      const id = levelAt(p.x, p.z);
      if (!id || !isUnlocked(id, cleared) || !kits.has(id)) return null;
      return p.distanceTo(position(id, "archive")) < 4.6 ? id : null;
    },
    discovery: (p: THREE.Vector3) => {
      const id = levelAt(p.x, p.z);
      if (!id || !kits.has(id) || !isUnlocked(id, cleared)) return null;
      const def = defFor(id),
        q = toWorld(id, def.discovery.at);
      return Math.hypot(p.x - q[0], p.z - q[1]) < 5
        ? { id, ...def.discovery }
        : null;
    },
    update: (elapsed: number, p: THREE.Vector3) => {
      for (const [id, kit] of kits) {
        const [x, z] = levelCenter(id);
        const near = Math.hypot(x - p.x, z - p.z) < 230;
        kit.group.visible = near;
        for (const asset of kit.assets)
          if (asset.userData.roof)
            asset.visible =
              Math.hypot(
                asset.position.x + x - p.x,
                asset.position.z + z - p.z,
              ) > 35;
        const archive = archives.get(id)!;
        archive.visible = near;
        archive.children[1].rotation.y = elapsed * 0.5;
        archive.children[1].position.y = 2 + Math.sin(elapsed * 1.6) * 0.15;
      }
    },
    dispose: () => {
      gateKits.forEach((k) => k.dispose());
      kits.forEach((k) => k.dispose());
      cores.forEach((m) => m.dispose());
      archives.forEach((a) => {
        const m = a.children[3] as THREE.Mesh;
        m.geometry.dispose();
      });
      plane.dispose();
      material.dispose();
      stone.dispose();
      ground.dispose();
      silhouette.dispose();
      horizonMaterial.dispose();
      ringGeo.dispose();
      coreGeo.dispose();
      baseGeo.dispose();
      baseMat.dispose();
      mistGeo.dispose();
      mistMat.dispose();
    },
  };
}
