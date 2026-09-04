import * as THREE from "three";
import { barkTexture, groundTexture, leafTexture, stoneTexture } from "./textures";

export interface World {
  group: THREE.Group;
  /** Solid collision volumes for the central tile (the player is wrapped into it). */
  obstacles: THREE.Box3[];
  /** Size of one repeating tile; the player wraps modulo this so the world loops. */
  tile: number;
  /** Per-frame update; pass the player position so the ground and motes follow it. */
  update: (delta: number, elapsed: number, player: THREE.Vector3) => void;
  dispose: () => void;
}

// The world is one tile repeated in a 3x3 grid, with the player wrapped into the
// central tile. That makes the landscape feel infinite (walk any direction and the
// scenery — and the amber archive — repeat) while all gameplay logic still happens in
// the single central tile around the origin.
const TILE = 150;
const HALF = TILE / 2;
const CLEAR_RADIUS = 6;

const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];
function track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(item: T): T {
  disposables.push(item);
  return item;
}

/** Offsets of the 3x3 tile grid around the centre. */
const TILE_OFFSETS: Array<[number, number]> = [];
for (let i = -1; i <= 1; i += 1) for (let j = -1; j <= 1; j += 1) TILE_OFFSETS.push([i * TILE, j * TILE]);

export function buildWorld(): World {
  disposables.length = 0;
  const group = new THREE.Group();
  const obstacles: THREE.Box3[] = [];
  const windUniform = { value: 0 };

  const stone = track(stoneTexture());
  const groundTex = track(groundTexture());
  const bark = track(barkTexture());
  const leaf = track(leafTexture());

  const stoneMat = track(new THREE.MeshStandardMaterial({ map: stone, roughness: 0.92, metalness: 0.02, color: 0xb8987f }));
  const darkStoneMat = track(new THREE.MeshStandardMaterial({ map: stone, roughness: 0.96, color: 0x6f5a49 }));
  const domeMat = track(new THREE.MeshStandardMaterial({ map: stone, color: 0xcaa98a, roughness: 0.8 }));
  const finialMat = track(new THREE.MeshStandardMaterial({ color: 0xf3c979, metalness: 0.6, roughness: 0.3 }));
  const coreMat = track(new THREE.MeshStandardMaterial({ color: 0xf7d9a0, emissive: 0xffa62e, emissiveIntensity: 3.2 }));
  const bulbMat = track(new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa23c, emissiveIntensity: 3 }));

  // ---- Ground (follows the player so there is never a visible edge) ---------
  const groundMesh = new THREE.Mesh(
    track(new THREE.CircleGeometry(TILE * 1.4, 64)),
    track(new THREE.MeshStandardMaterial({ map: groundTex, roughness: 1, metalness: 0 })),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // ---- Reusable ruin builders ----------------------------------------------
  const buildColumn = (height: number, broken: boolean) => {
    const col = new THREE.Group();
    const shaft = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.42, height, 12, 1)), stoneMat);
    shaft.position.y = height / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    col.add(shaft);
    const base = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 0.4, 1.1)), darkStoneMat);
    base.position.y = 0.2;
    base.castShadow = true;
    col.add(base);
    if (!broken) {
      const capital = new THREE.Mesh(track(new THREE.BoxGeometry(1.0, 0.5, 1.0)), stoneMat);
      capital.position.y = height + 0.2;
      capital.castShadow = true;
      col.add(capital);
    } else {
      const jag = new THREE.Mesh(track(new THREE.ConeGeometry(0.42, 0.6, 6)), stoneMat);
      jag.position.y = height + 0.2;
      jag.rotation.z = Math.random() * 0.4 - 0.2;
      col.add(jag);
    }
    return col;
  };

  const buildArchway = (width: number, height: number, depth: number) => {
    const shape = new THREE.Shape();
    const w = width / 2;
    shape.moveTo(-w, 0);
    shape.lineTo(-w, height * 0.62);
    shape.quadraticCurveTo(-w * 0.5, height, 0, height);
    shape.quadraticCurveTo(w * 0.5, height, w, height * 0.62);
    shape.lineTo(w, 0);
    shape.lineTo(w - 0.9, 0);
    shape.lineTo(w - 0.9, height * 0.55);
    shape.quadraticCurveTo(w * 0.42, height * 0.82, 0, height * 0.82);
    shape.quadraticCurveTo(-w * 0.42, height * 0.82, -(w - 0.9), height * 0.55);
    shape.lineTo(-(w - 0.9), 0);
    shape.lineTo(-w, 0);
    const geo = track(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 }));
    geo.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  const buildChhatri = (scale: number) => {
    const pav = new THREE.Group();
    const legH = 3.2 * scale;
    const span = 1.7 * scale;
    for (const [dx, dz] of [[-span, -span], [span, -span], [-span, span], [span, span]]) {
      const leg = buildColumn(legH, false);
      leg.position.set(dx, 0, dz);
      leg.scale.setScalar(scale);
      pav.add(leg);
    }
    const roof = new THREE.Mesh(track(new THREE.BoxGeometry(span * 2 + 1.2, 0.4, span * 2 + 1.2)), stoneMat);
    roof.position.y = legH + 0.4;
    roof.castShadow = true;
    pav.add(roof);
    const points: THREE.Vector2[] = [];
    const domeR = span * 1.05;
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const y = t * domeR * 1.7;
      const bulge = Math.sin(t * Math.PI) * 0.55 + (1 - t) * 0.5;
      points.push(new THREE.Vector2(Math.max(0.02, domeR * bulge), y));
    }
    const dome = new THREE.Mesh(track(new THREE.LatheGeometry(points, 16)), domeMat);
    dome.position.y = legH + 0.6;
    dome.castShadow = true;
    pav.add(dome);
    const finial = new THREE.Mesh(track(new THREE.SphereGeometry(0.18 * scale, 8, 8)), finialMat);
    finial.position.y = legH + 0.6 + domeR * 1.7 + 0.2;
    pav.add(finial);
    return pav;
  };

  const buildWall = (length: number, height: number, tilt = 0) => {
    const parent = new THREE.Group();
    const wall = new THREE.Mesh(track(new THREE.BoxGeometry(length, height, 0.7)), stoneMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.rotation.z = tilt;
    parent.add(wall);
    const notches = Math.floor(length / 1.2);
    for (let i = 0; i < notches; i += 1) {
      if (Math.random() < 0.5) continue;
      const merlon = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 0.6 + Math.random() * 0.5, 0.72)), stoneMat);
      merlon.position.set(-length / 2 + 0.6 + i * 1.2, height / 2 + 0.3, 0);
      merlon.castShadow = true;
      parent.add(merlon);
    }
    return parent;
  };

  // ---- One tile of ruins (the amber archive + its plaza) --------------------
  // Built once, then cloned across the 3x3 grid so the world repeats seamlessly.
  const ruinTile = new THREE.Group();

  // Amber archive: pedestal + glowing core (the emissive cores glow in every tile
  // via bloom; only the central tile gets a real light, added below).
  const amber = new THREE.Group();
  const pedestal = new THREE.Mesh(
    track(new THREE.CylinderGeometry(1.1, 1.5, 1.1, 8)),
    track(new THREE.MeshStandardMaterial({ color: 0x2a2620, metalness: 0.6, roughness: 0.4 })),
  );
  pedestal.position.y = 0.55;
  pedestal.castShadow = true;
  pedestal.receiveShadow = true;
  amber.add(pedestal);
  const core = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.8)), coreMat);
  core.position.y = 2.1;
  amber.add(core);
  ruinTile.add(amber);

  // Gateway piers flanking the archive.
  const leftPier = buildArchway(7, 9, 2.4);
  leftPier.position.set(-6.5, 0, -7.5);
  ruinTile.add(leftPier);
  const rightPier = buildArchway(7, 9, 2.4);
  rightPier.position.set(6.5, 0, -7.5);
  ruinTile.add(rightPier);

  // Colonnade flanking the lane (kept within the tile).
  for (let i = 0; i < 6; i += 1) {
    const z = -16 - i * 8;
    for (const side of [-7.5, 7.5]) {
      const broken = Math.random() < 0.4;
      const col = buildColumn(broken ? 2 + Math.random() * 2 : 4.5, broken);
      col.position.set(side + (Math.random() - 0.5), 0, z + (Math.random() - 0.5) * 2);
      col.rotation.y = Math.random() * 0.3;
      ruinTile.add(col);
    }
  }

  // Scattered pavilions and walls, all within the tile bounds.
  const placements: Array<[number, number]> = [
    [-22, -10], [24, -16], [-30, 12], [28, 18], [-16, 26], [20, 34], [-34, -24], [34, -30], [-40, 34], [40, 40],
  ];
  for (const [x, z] of placements) {
    if (Math.random() < 0.5) {
      const pav = buildChhatri(0.9 + Math.random() * 0.6);
      pav.position.set(x, 0, z);
      pav.rotation.y = Math.random() * Math.PI;
      ruinTile.add(pav);
    } else {
      const wall = buildWall(6 + Math.random() * 6, 3 + Math.random() * 2, (Math.random() - 0.5) * 0.15);
      wall.position.set(x, 1.6, z);
      wall.rotation.y = Math.random() * Math.PI;
      ruinTile.add(wall);
    }
  }

  // Lantern bulbs (emissive; the actual point lights are central-only, below).
  const lanternSpots: Array<[number, number]> = [[-6.5, -6.5], [6.5, -6.5], [-8, -22], [8, -30]];
  for (const [x, z] of lanternSpots) {
    const bulb = new THREE.Mesh(track(new THREE.SphereGeometry(0.16, 8, 8)), bulbMat);
    bulb.position.set(x, 3.4, z);
    ruinTile.add(bulb);
  }

  // Place the 3x3 grid of ruin tiles; register collision for the central tile only.
  for (const [ox, oz] of TILE_OFFSETS) {
    const clone = ox === 0 && oz === 0 ? ruinTile : ruinTile.clone();
    clone.position.set(ox, 0, oz);
    group.add(clone);
    if (ox === 0 && oz === 0) {
      clone.updateMatrixWorld(true);
      // Register the piers, columns, chhatris and walls as obstacles (skip the amber).
      for (const child of clone.children) {
        if (child === amber) continue;
        obstacles.push(new THREE.Box3().setFromObject(child).expandByScalar(0.25));
      }
    }
  }

  // Central lights: one beacon light at the amber + the four lanterns.
  const beaconLight = new THREE.PointLight(0xffb454, 16, 22, 2);
  beaconLight.position.set(0, 2.4, 0);
  group.add(beaconLight);
  const lanterns: Array<{ light: THREE.PointLight; base: number; seed: number }> = [];
  for (const [x, z] of lanternSpots) {
    const light = new THREE.PointLight(0xffb457, 6, 18, 2);
    light.position.set(x, 3.4, z);
    group.add(light);
    lanterns.push({ light, base: 6, seed: Math.random() * 10 });
  }

  // ---- Instanced fields, tiled across the 3x3 grid --------------------------
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  const inTile = () => {
    // A random point in the central tile, avoiding the clear zone around the amber.
    let x = 0, z = 0;
    do {
      x = (Math.random() - 0.5) * TILE;
      z = (Math.random() - 0.5) * TILE;
    } while (Math.hypot(x, z) < CLEAR_RADIUS);
    return [x, z] as const;
  };

  // Rubble.
  const rubbleBase = 120;
  const rubble = new THREE.InstancedMesh(
    track(new THREE.IcosahedronGeometry(0.5, 0)),
    track(new THREE.MeshStandardMaterial({ map: stone, color: 0x7a6350, roughness: 1 })),
    rubbleBase * 9,
  );
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  let ri = 0;
  for (let b = 0; b < rubbleBase; b += 1) {
    const [x, z] = inTile();
    const scale = 0.25 + Math.random() * 0.9;
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
    s.set(scale, scale * (0.6 + Math.random() * 0.6), scale);
    for (const [ox, oz] of TILE_OFFSETS) {
      p.set(x + ox, scale * 0.3, z + oz);
      m.compose(p, q, s);
      rubble.setMatrixAt(ri, m);
      ri += 1;
    }
  }
  rubble.instanceMatrix.needsUpdate = true;
  group.add(rubble);

  // Trees (trunk + canopy blobs).
  const treeBase = 34;
  const trees: Array<[number, number, number]> = [];
  for (let i = 0; i < treeBase; i += 1) {
    const [x, z] = inTile();
    if (Math.abs(x) < 7 && z < 0 && z > -60) continue; // keep the lane vista open
    trees.push([x, z, 0.8 + Math.random() * 1.1]);
  }
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.34, 5, 7));
  trunkGeo.translate(0, 2.5, 0);
  const trunks = new THREE.InstancedMesh(trunkGeo, track(new THREE.MeshStandardMaterial({ map: bark, roughness: 1 })), trees.length * 9);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  const canopyGeo = track(new THREE.IcosahedronGeometry(1.9, 1));
  const canopyMat = track(new THREE.MeshStandardMaterial({ map: leaf, color: 0x5f7a3c, roughness: 1, flatShading: true }));
  const canopyPerTree = 3;
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, trees.length * canopyPerTree * 9);
  canopies.castShadow = true;
  let ti = 0, ci = 0;
  for (const [x, z, scale] of trees) {
    q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    s.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    const canopy = Array.from({ length: canopyPerTree }, () => ({
      dx: (Math.random() - 0.5) * 1.8 * scale,
      dz: (Math.random() - 0.5) * 1.8 * scale,
      cy: (4.4 + Math.random() * 1.4) * scale,
      cs: scale * (0.8 + Math.random() * 0.5),
      rot: new THREE.Euler(Math.random(), Math.random(), Math.random()),
    }));
    for (const [ox, oz] of TILE_OFFSETS) {
      p.set(x + ox, 0, z + oz);
      m.compose(p, q, s);
      trunks.setMatrixAt(ti, m);
      ti += 1;
      for (const c of canopy) {
        p.set(x + ox + c.dx, c.cy, z + oz + c.dz);
        s.set(c.cs, c.cs * 0.9, c.cs);
        q.setFromEuler(c.rot);
        m.compose(p, q, s);
        canopies.setMatrixAt(ci, m);
        ci += 1;
      }
      q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
      s.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    }
  }
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  canopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
         float ph = instanceMatrix[3][0] + instanceMatrix[3][2];
         transformed.x += sin(uTime * 0.9 + ph) * 0.18;
         transformed.z += cos(uTime * 0.7 + ph) * 0.14;`);
  };
  group.add(trunks, canopies);

  // Wind-swept grass.
  const bladeGeo = track(new THREE.PlaneGeometry(0.11, 0.85, 1, 4));
  bladeGeo.translate(0, 0.425, 0);
  const grassMat = track(new THREE.MeshStandardMaterial({ color: 0x6f8a3e, roughness: 1, side: THREE.DoubleSide, alphaTest: 0.1 }));
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace("#include <begin_vertex>", `#include <begin_vertex>
         float bh = uv.y;
         float ph = instanceMatrix[3][0] * 0.6 + instanceMatrix[3][2] * 0.6;
         float gust = sin(uTime * 1.7 + ph) * 0.35 + sin(uTime * 3.3 + ph) * 0.12;
         transformed.x += gust * bh * bh * 0.6;
         transformed.z += cos(uTime * 1.3 + ph) * bh * bh * 0.28;`);
  };
  const grassBase = 9000;
  const grass = new THREE.InstancedMesh(bladeGeo, grassMat, grassBase * 9);
  grass.receiveShadow = true;
  const grassColor = new THREE.Color();
  let gi = 0;
  for (let b = 0; b < grassBase; b += 1) {
    const [x, z] = inTile();
    const scale = 0.7 + Math.random() * 0.9;
    q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    s.set(1, scale, 1);
    grassColor.setHSL(0.24 + Math.random() * 0.08, 0.45, 0.32 + Math.random() * 0.16);
    for (const [ox, oz] of TILE_OFFSETS) {
      p.set(x + ox, 0, z + oz);
      m.compose(p, q, s);
      grass.setMatrixAt(gi, m);
      grass.setColorAt(gi, grassColor);
      gi += 1;
    }
  }
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  group.add(grass);

  // ---- Drifting dust motes (kept around the player) -------------------------
  const MOTES = 400;
  const moteGeo = track(new THREE.BufferGeometry());
  const motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i += 1) {
    motePos[i * 3] = (Math.random() - 0.5) * TILE;
    motePos[i * 3 + 1] = Math.random() * 12 + 0.5;
    motePos[i * 3 + 2] = (Math.random() - 0.5) * TILE;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const motes = new THREE.Points(moteGeo, track(new THREE.PointsMaterial({
    color: 0xffe4b0, size: 0.08, transparent: true, opacity: 0.5, depthWrite: false, blending: THREE.AdditiveBlending,
  })));
  group.add(motes);

  // ---- Update / dispose -----------------------------------------------------
  const update = (delta: number, elapsed: number, player: THREE.Vector3) => {
    windUniform.value = elapsed;
    // Ground and motes ride along with the player so the world feels endless.
    groundMesh.position.set(player.x, 0, player.z);
    (groundMesh.material as THREE.MeshStandardMaterial).map!.offset.set(player.x * 0.04, -player.z * 0.04);
    motes.position.set(player.x, 0, player.z);
    core.position.y = 2.1 + Math.sin(elapsed * 2.1) * 0.14;
    coreMat.emissiveIntensity = 3.0 + Math.sin(elapsed * 2.4) * 0.5;
    beaconLight.intensity = 14 + Math.sin(elapsed * 3.2) * 3;
    for (const { light, base, seed } of lanterns) {
      light.intensity = base + Math.sin(elapsed * 9 + seed) * 0.9 + Math.sin(elapsed * 21 + seed) * 0.4;
    }
    const arr = moteGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i += 1) {
      let y = arr.getY(i) + delta * 0.25;
      if (y > 13) y = 0.5;
      arr.setY(i, y);
    }
    arr.needsUpdate = true;
  };

  const dispose = () => {
    for (const item of disposables) item.dispose();
    disposables.length = 0;
  };

  return { group, obstacles, tile: TILE, update, dispose };
}
