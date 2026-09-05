import * as THREE from "three";
import { cityTexture } from "./textures";
import {
  CELL,
  crossedRuinGate,
  nearestRuinCopy,
  ruinGate,
  wrapRuinCoordinate,
  type Point,
} from "./layout";
import { LEVELS } from "./levels";
import { LevelKit } from "./kit";
import { buildRestorationFeature } from "./restorations";
import type { LevelDefinition } from "./types";

const copyName = (kind: string, id: number) =>
  `${kind}-${String(id).padStart(2, "0")}`;

/**
 * Build twenty self-contained ruin worlds. Only one is visible at a time; its
 * 3x3 copies surround the player so every ordinary edge loops back into the
 * same place. The solved exit gate is the only route to another ruin.
 */
export function buildCity() {
  const group = new THREE.Group();
  const stone = cityTexture("stone");
  const ground = cityTexture("ground");
  const kits = new Map<number, LevelKit>();
  const worlds = new Map<number, THREE.Group>();
  const archives = new Map<number, THREE.Group[]>();
  const cores = new Map<number, THREE.MeshStandardMaterial>();
  const gates = new Map<number, ReturnType<typeof ruinGate>>();
  const restorationStartedAt = new Map<number, number>();
  let cleared: readonly number[] = [];
  let activeId = 1;
  let lastElapsed = 0;

  const ringGeo = new THREE.TorusGeometry(2, 0.08, 6, 40);
  const coreGeo = new THREE.OctahedronGeometry(0.85);
  const baseGeo = new THREE.CylinderGeometry(2, 2.3, 0.6, 12);
  const beaconGeo = new THREE.CylinderGeometry(0.06, 0.3, 15, 6);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x5d6252,
    roughness: 0.9,
  });

  const defFor = (id: number) =>
    LEVELS.find((level) => level.id === id) ?? LEVELS[0];
  const heightFor = (id: number, x: number, z: number) =>
    kits.get(id)?.height(wrapRuinCoordinate(x), wrapRuinCoordinate(z)) ?? 0;

  const buildWorld = (def: LevelDefinition) => {
    const kit = new LevelKit(def, stone, ground);
    kit.group.name = copyName("geometry", def.id);

    // A full-tile ground sheet closes the narrow gaps around authored floors.
    // Repeating sheets meet at the seam and keep the horizon continuous.
    kit.floor(0, 0, CELL, CELL, def.ground, -0.2);
    def.build(kit);

    const entryHeight = kit.height(...def.spawn);

    const discovery = def.discovery.at;
    kit.sign(discovery[0], discovery[1], def.discovery.title, 5, 2.8);

    const plants = new THREE.Group();
    plants.name = copyName("regrowth", def.id);
    plants.userData.dynamic = true;
    for (let i = 0; i < 24; i++) {
      const x = ((i * 31 + def.id * 7) % 86) - 43;
      const z = ((i * 19 + def.id * 11) % 86) - 43;
      if (kit.blocked(x, z)) continue;
      const sprig = kit.mesh(
        new THREE.ConeGeometry(0.3, 0.9, 5),
        0x8aa16b,
        x,
        kit.height(x, z) + 0.45,
        z,
      );
      plants.add(sprig);
    }
    kit.group.add(plants);

    const gate = ruinGate(def.spawn);
    gates.set(def.id, gate);
    const [gateX, gateZ] = gate.at;
    kit.floor(
      gateX,
      gateZ,
      gate.axis === "x" ? 8 : 22,
      gate.axis === "x" ? 22 : 8,
      def.accent,
    );
    if (entryHeight > 1 && gate.axis === "z")
      kit.ramp(gateX, gateZ, 18, 12, -entryHeight, "z", entryHeight);
    kit.arch(gateX, gateZ, 16, 8, gate.rotation);
    const destination = def.id < LEVELS.length ? defFor(def.id + 1) : null;
    kit.sign(
      gateX,
      gateZ,
      destination
        ? `PASSAGE ${String(destination.id).padStart(2, "0")} / ${destination.title.toUpperCase()}`
        : "THE CITY RESTORED",
      15,
      7.4,
    );

    const seal = new THREE.Group();
    seal.name = copyName("gate-seal", def.id);
    seal.userData.dynamic = true;
    for (let offset = -7; offset <= 7; offset += 2) {
      const bar = kit.box(
        gate.axis === "x" ? gateX : gateX + offset,
        0,
        gate.axis === "x" ? gateZ + offset : gateZ,
        0.16,
        5.6,
        0.16,
        0x71989a,
        false,
      );
      bar.material = kit.material(0x71989a, 0.45);
      seal.add(bar);
    }
    kit.group.add(seal);

    const portalMaterial = new THREE.MeshBasicMaterial({
      color: 0x8ae0c2,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });
    const portal = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 5.5),
      portalMaterial,
    );
    portal.name = copyName("gate-portal", def.id);
    portal.userData.dynamic = true;
    portal.position.set(gateX, 2.8, gateZ);
    portal.rotation.y = gate.rotation;
    portal.visible = false;
    kit.group.add(portal);

    kit.sign(
      def.spawn[0] || -28,
      def.spawn[1] || 49,
      `${String(def.id).padStart(2, "0")} / ${def.title.toUpperCase()}`,
      11,
      3,
    );
    kit.optimize();
    kits.set(def.id, kit);

    const coreMat = new THREE.MeshStandardMaterial({
      color: 0xffb34c,
      emissive: 0xff9f36,
      emissiveIntensity: 2,
    });
    cores.set(def.id, coreMat);
    const archive = new THREE.Group();
    archive.name = copyName("archive", def.id);
    archive.userData.dynamic = true;
    archive.position.set(
      def.archive[0],
      kit.height(...def.archive),
      def.archive[1],
    );
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
    const beacon = new THREE.Mesh(beaconGeo, coreMat);
    beacon.position.y = 8;
    archive.add(beacon);

    buildRestorationFeature(def, kit);

    const source = new THREE.Group();
    source.add(kit.group, archive);
    const ruinWorld = new THREE.Group();
    ruinWorld.name = copyName("ruin-world", def.id);
    const archiveCopies: THREE.Group[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dz = -1; dz <= 1; dz++) {
        const copy = dx === 0 && dz === 0 ? source : source.clone(true);
        copy.position.set(dx * CELL, 0, dz * CELL);
        ruinWorld.add(copy);
        const archiveCopy = copy.getObjectByName(copyName("archive", def.id));
        if (archiveCopy instanceof THREE.Group) archiveCopies.push(archiveCopy);
      }
    ruinWorld.visible = false;
    worlds.set(def.id, ruinWorld);
    archives.set(def.id, archiveCopies);
    group.add(ruinWorld);
  };

  const ensureWorld = (id: number) => {
    const def = defFor(id);
    if (!worlds.has(def.id)) buildWorld(def);
  };

  const setLocation = (id: number) => {
    activeId = defFor(id).id;
    // Construct a ruin only when the player first enters it. Previously all twenty
    // 3x3 worlds were built at startup even though nineteen were invisible.
    ensureWorld(activeId);
    for (const [worldId, world] of worlds) world.visible = worldId === activeId;
    updateGateState(activeId);
  };

  const updateGateState = (id: number) => {
    const open = cleared.includes(id);
    worlds.get(id)?.traverse((object) => {
      if (object.name === copyName("gate-seal", id)) object.visible = !open;
      if (object.name === copyName("gate-portal", id)) object.visible = open;
      if (object.name === copyName("regrowth", id)) object.visible = open;
      if (object.name === copyName("restoration", id)) object.visible = open;
    });
  };

  const setProgress = (next: readonly number[]) => {
    const previous = cleared;
    cleared = next;
    for (const [id, material] of cores) {
      const done = cleared.includes(id);
      if (done && !previous.includes(id))
        restorationStartedAt.set(id, lastElapsed);
      material.color.setHex(done ? 0x80d9bc : 0xffb34c);
      material.emissive.copy(material.color);
      material.emissiveIntensity = 2;
      updateGateState(id);
    }
  };

  const height = (x: number, z: number) => heightFor(activeId, x, z);
  const gateBarrierBlocks = (x: number, z: number) => {
    if (cleared.includes(activeId)) return false;
    const gate = gates.get(activeId)!;
    const localX = wrapRuinCoordinate(x);
    const localZ = wrapRuinCoordinate(z);
    const normal = gate.axis === "x" ? localX : localZ;
    const across = gate.axis === "x" ? localZ : localX;
    const gateNormal = gate.axis === "x" ? gate.at[0] : gate.at[1];
    const gateAcross = gate.axis === "x" ? gate.at[1] : gate.at[0];
    return (
      Math.abs(normal - gateNormal) < 0.8 && Math.abs(across - gateAcross) < 8
    );
  };
  const blocked = (x: number, z: number) => {
    if (gateBarrierBlocks(x, z)) return true;
    return kits
      .get(activeId)!
      .blocked(wrapRuinCoordinate(x), wrapRuinCoordinate(z));
  };
  const position = (
    id: number,
    kind: "spawn" | "archive" | "gate",
  ): THREE.Vector3 => {
    const def = defFor(id);
    const gate = gates.get(def.id)!;
    const point: Point =
      kind === "gate"
        ? gate.at
        : kind === "archive"
          ? def.archive
          : gate.axis === "x"
            ? [def.spawn[0] - gate.direction * 18, def.spawn[1]]
            : [def.spawn[0], def.spawn[1] - gate.direction * 18];
    return new THREE.Vector3(point[0], heightFor(def.id, ...point), point[1]);
  };
  const periodicTarget = (point: Point, from: THREE.Vector3) => {
    const nearest = nearestRuinCopy(point, [from.x, from.z]);
    return new THREE.Vector3(
      nearest[0],
      heightFor(activeId, ...point),
      nearest[1],
    );
  };
  setProgress([]);
  setLocation(1);

  return {
    group,
    tile: CELL,
    blocked,
    height,
    position,
    setProgress,
    setLocation,
    location: () => activeId,
    canWalk: (from: Point, to: Point) => {
      const steps = Math.max(
        1,
        Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 0.3),
      );
      let y = height(...from);
      for (let i = 1; i <= steps; i++) {
        const x = from[0] + ((to[0] - from[0]) * i) / steps;
        const z = from[1] + ((to[1] - from[1]) * i) / steps;
        const next = height(x, z);
        if (blocked(x, z) || Math.abs(next - y) > 0.7) return false;
        y = next;
      }
      return true;
    },
    target: () =>
      position(activeId, cleared.includes(activeId) ? "gate" : "archive"),
    targetFor: (
      _from: THREE.Vector3,
      requested: "archive" | "gate",
    ): THREE.Vector3 => {
      if (requested === "gate" && cleared.includes(activeId))
        return position(activeId, "gate");
      return position(activeId, "archive");
    },
    walkTargetFor: (
      _from: THREE.Vector3,
      requested: "archive" | "gate",
    ): THREE.Vector3 => {
      if (requested === "archive" || !cleared.includes(activeId))
        return position(activeId, "archive");
      const gate = gates.get(activeId)!;
      const target = position(activeId, "gate");
      if (gate.axis === "x") target.x += gate.direction * 8;
      else target.z += gate.direction * 8;
      return target;
    },
    portalDestination: (point: THREE.Vector3): number | null => {
      if (!cleared.includes(activeId) || activeId >= LEVELS.length) return null;
      return crossedRuinGate([point.x, point.z], gates.get(activeId)!)
        ? activeId + 1
        : null;
    },
    definition: (id: number): LevelDefinition => defFor(id),
    nearArchive: (point: THREE.Vector3): number | null => {
      const archive = periodicTarget(defFor(activeId).archive, point);
      return point.distanceTo(archive) < 4.6 ? activeId : null;
    },
    discovery: (point: THREE.Vector3) => {
      const def = defFor(activeId);
      const at = nearestRuinCopy(def.discovery.at, [point.x, point.z]);
      return Math.hypot(point.x - at[0], point.z - at[1]) < 5
        ? { id: activeId, ...def.discovery }
        : null;
    },
    update: (elapsed: number, point: THREE.Vector3) => {
      lastElapsed = elapsed;
      const kit = kits.get(activeId)!;
      for (const asset of kit.assets)
        if (asset.userData.roof)
          asset.visible =
            Math.hypot(asset.position.x - point.x, asset.position.z - point.z) >
            35;
      for (const archive of archives.get(activeId) ?? []) {
        archive.children[1].rotation.y = elapsed * 0.5;
        archive.children[1].position.y = 2 + Math.sin(elapsed * 1.6) * 0.15;
      }
      const started = restorationStartedAt.get(activeId);
      const progress =
        started === undefined ? 1 : Math.min(1, (elapsed - started) / 2.4);
      const eased = 1 - Math.pow(1 - Math.max(0, progress), 3);
      worlds.get(activeId)?.traverse((object) => {
        if (object.name === copyName("restoration", activeId))
          object.scale.setScalar(Math.max(0.001, eased));
        if (object.userData.restorationPart !== undefined) {
          object.userData.restorationBaseY ??= object.position.y;
          object.position.y =
            object.userData.restorationBaseY +
            Math.sin(elapsed * 1.7 + object.userData.restorationPart) *
              0.06 *
              eased;
        }
      });
      if (progress >= 1) restorationStartedAt.delete(activeId);
    },
    dispose: () => {
      kits.forEach((kit) => kit.dispose());
      cores.forEach((material) => material.dispose());
      stone.dispose();
      ground.dispose();
      ringGeo.dispose();
      coreGeo.dispose();
      baseGeo.dispose();
      beaconGeo.dispose();
      baseMat.dispose();
    },
  };
}
