import * as THREE from "three";
import { barkTexture, groundTexture, leafTexture, stoneTexture } from "./textures";

export interface World {
  group: THREE.Group;
  /** Solid collision volumes in world space. */
  obstacles: THREE.Box3[];
  /** Flickering lantern lights, updated each frame. */
  update: (delta: number, elapsed: number) => void;
  dispose: () => void;
}

/** Radius kept clear around the SQL archive so the player can always reach it. */
const CLEAR_RADIUS = 6;
const WORLD_RADIUS = 96;

const disposables: Array<THREE.BufferGeometry | THREE.Material | THREE.Texture> = [];
function track<T extends THREE.BufferGeometry | THREE.Material | THREE.Texture>(item: T): T {
  disposables.push(item);
  return item;
}

function inClearZone(x: number, z: number, pad = 0): boolean {
  return Math.hypot(x, z) < CLEAR_RADIUS + pad;
}

/** Builds the entire overgrown-ruins district. */
export function buildWorld(): World {
  disposables.length = 0;
  const group = new THREE.Group();
  const obstacles: THREE.Box3[] = [];
  const windUniform = { value: 0 };

  const stone = track(stoneTexture());
  const ground = track(groundTexture());
  const bark = track(barkTexture());
  const leaf = track(leafTexture());

  const stoneMat = track(
    new THREE.MeshStandardMaterial({ map: stone, roughness: 0.92, metalness: 0.02, color: 0xb8987f }),
  );
  const darkStoneMat = track(
    new THREE.MeshStandardMaterial({ map: stone, roughness: 0.96, color: 0x6f5a49 }),
  );

  // ---- Ground ---------------------------------------------------------------
  const groundMesh = new THREE.Mesh(
    track(new THREE.CircleGeometry(WORLD_RADIUS, 64)),
    track(new THREE.MeshStandardMaterial({ map: ground, roughness: 1, metalness: 0 })),
  );
  groundMesh.rotation.x = -Math.PI / 2;
  groundMesh.receiveShadow = true;
  group.add(groundMesh);

  // A worn processional lane running north from the archive.
  const laneMat = track(new THREE.MeshStandardMaterial({ map: ground, color: 0x8a7a5f, roughness: 1 }));
  const lane = new THREE.Mesh(track(new THREE.PlaneGeometry(9, 120)), laneMat);
  lane.rotation.x = -Math.PI / 2;
  lane.position.set(0, 0.015, -30);
  lane.receiveShadow = true;
  group.add(lane);

  const registerObstacle = (mesh: THREE.Object3D, pad = 0.3) => {
    mesh.updateMatrixWorld(true);
    obstacles.push(new THREE.Box3().setFromObject(mesh).expandByScalar(pad));
  };

  // ---- Reusable ruin builders ----------------------------------------------

  /** A fluted red-sandstone column with base and capital; broken variants supported. */
  const buildColumn = (height: number, broken: boolean) => {
    const col = new THREE.Group();
    const shaft = new THREE.Mesh(
      track(new THREE.CylinderGeometry(0.34, 0.42, height, 12, 1)),
      stoneMat,
    );
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
      // jagged broken top
      const jag = new THREE.Mesh(track(new THREE.ConeGeometry(0.42, 0.6, 6)), stoneMat);
      jag.position.y = height + 0.2;
      jag.rotation.z = Math.random() * 0.4 - 0.2;
      col.add(jag);
    }
    return col;
  };

  /** A pointed Mughal archway (extruded silhouette) forming a gateway pier. */
  const buildArchway = (width: number, height: number, depth: number) => {
    const shape = new THREE.Shape();
    const w = width / 2;
    shape.moveTo(-w, 0);
    shape.lineTo(-w, height * 0.62);
    // pointed arch apex
    shape.quadraticCurveTo(-w * 0.5, height, 0, height);
    shape.quadraticCurveTo(w * 0.5, height, w, height * 0.62);
    shape.lineTo(w, 0);
    shape.lineTo(w - 0.9, 0);
    shape.lineTo(w - 0.9, height * 0.55);
    shape.quadraticCurveTo(w * 0.42, height * 0.82, 0, height * 0.82);
    shape.quadraticCurveTo(-w * 0.42, height * 0.82, -(w - 0.9), height * 0.55);
    shape.lineTo(-(w - 0.9), 0);
    shape.lineTo(-w, 0);

    const geo = track(
      new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 16 }),
    );
    geo.translate(0, 0, -depth / 2);
    const mesh = new THREE.Mesh(geo, stoneMat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  };

  /** An onion-dome chhatri pavilion on four columns. */
  const buildChhatri = (scale: number) => {
    const pav = new THREE.Group();
    const legH = 3.2 * scale;
    const span = 1.7 * scale;
    for (const [dx, dz] of [
      [-span, -span],
      [span, -span],
      [-span, span],
      [span, span],
    ]) {
      const leg = buildColumn(legH, false);
      leg.position.set(dx, 0, dz);
      leg.scale.setScalar(scale);
      pav.add(leg);
    }
    // platform
    const roof = new THREE.Mesh(
      track(new THREE.BoxGeometry(span * 2 + 1.2, 0.4, span * 2 + 1.2)),
      stoneMat,
    );
    roof.position.y = legH + 0.4;
    roof.castShadow = true;
    pav.add(roof);

    // onion dome via lathe
    const points: THREE.Vector2[] = [];
    const domeR = span * 1.05;
    for (let i = 0; i <= 12; i += 1) {
      const t = i / 12;
      const y = t * domeR * 1.7;
      const bulge = Math.sin(t * Math.PI) * 0.55 + (1 - t) * 0.5;
      points.push(new THREE.Vector2(Math.max(0.02, domeR * bulge), y));
    }
    const dome = new THREE.Mesh(
      track(new THREE.LatheGeometry(points, 16)),
      track(new THREE.MeshStandardMaterial({ map: stone, color: 0xcaa98a, roughness: 0.8 })),
    );
    dome.position.y = legH + 0.6;
    dome.castShadow = true;
    pav.add(dome);

    const finial = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.18 * scale, 8, 8)),
      track(new THREE.MeshStandardMaterial({ color: 0xf3c979, metalness: 0.6, roughness: 0.3 })),
    );
    finial.position.y = legH + 0.6 + domeR * 1.7 + 0.2;
    pav.add(finial);
    return pav;
  };

  /** A crumbling wall segment, optionally tilted as if half-collapsed. */
  const buildWall = (length: number, height: number, tilt = 0) => {
    const wall = new THREE.Mesh(track(new THREE.BoxGeometry(length, height, 0.7)), stoneMat);
    wall.castShadow = true;
    wall.receiveShadow = true;
    wall.rotation.z = tilt;
    // crenellated broken top
    const notches = Math.floor(length / 1.2);
    const parent = new THREE.Group();
    parent.add(wall);
    for (let i = 0; i < notches; i += 1) {
      if (Math.random() < 0.5) continue;
      const merlon = new THREE.Mesh(
        track(new THREE.BoxGeometry(0.8, 0.6 + Math.random() * 0.5, 0.72)),
        stoneMat,
      );
      merlon.position.set(-length / 2 + 0.6 + i * 1.2, height / 2 + 0.3, 0);
      merlon.castShadow = true;
      parent.add(merlon);
    }
    return parent;
  };

  // ---- The grand archive gateway (the SQL beacon sits under it) -------------
  const gateway = new THREE.Group();
  const leftPier = buildArchway(7, 9, 2.4);
  leftPier.position.set(-6.5, 0, 0);
  gateway.add(leftPier);
  registerObstacle(leftPier, 0.2);
  const rightPier = buildArchway(7, 9, 2.4);
  rightPier.position.set(6.5, 0, 0);
  gateway.add(rightPier);
  registerObstacle(rightPier, 0.2);
  gateway.position.set(0, 0, -7.5);
  group.add(gateway);

  // Colonnade flanking the lane (arcade of columns, some broken).
  for (let i = 0; i < 9; i += 1) {
    const z = -14 - i * 8;
    for (const side of [-7.5, 7.5]) {
      const broken = Math.random() < 0.4;
      const col = buildColumn(broken ? 2 + Math.random() * 2 : 4.5, broken);
      col.position.set(side + (Math.random() - 0.5), 0, z + (Math.random() - 0.5) * 2);
      col.rotation.y = Math.random() * 0.3;
      group.add(col);
      registerObstacle(col, 0.1);
    }
  }

  // Scatter pavilions and walls around the plaza, avoiding the clear zone & lane.
  const props: THREE.Object3D[] = [];
  const placements: Array<[number, number]> = [
    [-22, -10],
    [24, -16],
    [-30, 12],
    [28, 18],
    [-16, 26],
    [18, 34],
    [-34, -22],
    [34, -30],
  ];
  for (const [x, z] of placements) {
    if (Math.random() < 0.5) {
      const pav = buildChhatri(0.9 + Math.random() * 0.6);
      pav.position.set(x, 0, z);
      pav.rotation.y = Math.random() * Math.PI;
      group.add(pav);
      props.push(pav);
      registerObstacle(pav, 0.2);
    } else {
      const wall = buildWall(6 + Math.random() * 6, 3 + Math.random() * 2, (Math.random() - 0.5) * 0.15);
      wall.position.set(x, 1.6, z);
      wall.rotation.y = Math.random() * Math.PI;
      group.add(wall);
      props.push(wall);
      registerObstacle(wall, 0.2);
    }
  }

  // ---- Rubble scatter (instanced) ------------------------------------------
  const rubbleGeo = track(new THREE.IcosahedronGeometry(0.5, 0));
  const rubbleMat = track(new THREE.MeshStandardMaterial({ map: stone, color: 0x7a6350, roughness: 1 }));
  const RUBBLE = 320;
  const rubble = new THREE.InstancedMesh(rubbleGeo, rubbleMat, RUBBLE);
  rubble.castShadow = true;
  rubble.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();
  let placed = 0;
  while (placed < RUBBLE) {
    const angle = Math.random() * Math.PI * 2;
    const dist = CLEAR_RADIUS + Math.random() * (WORLD_RADIUS - CLEAR_RADIUS - 4);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    const scale = 0.25 + Math.random() * 0.9;
    p.set(x, scale * 0.3, z);
    q.setFromEuler(new THREE.Euler(Math.random() * 3, Math.random() * 3, Math.random() * 3));
    s.set(scale, scale * (0.6 + Math.random() * 0.6), scale);
    m.compose(p, q, s);
    rubble.setMatrixAt(placed, m);
    placed += 1;
  }
  rubble.instanceMatrix.needsUpdate = true;
  group.add(rubble);

  // ---- Trees reclaiming the ruins (instanced trunk + canopy) ---------------
  const treePositions: Array<[number, number, number]> = [];
  const TREES = 90;
  for (let i = 0; i < TREES; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 14 + Math.random() * (WORLD_RADIUS - 20);
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.abs(x) < 6 && z < 0) continue; // keep the lane vista open
    treePositions.push([x, z, 0.8 + Math.random() * 1.1]);
  }
  const trunkGeo = track(new THREE.CylinderGeometry(0.18, 0.34, 5, 7));
  trunkGeo.translate(0, 2.5, 0);
  const trunkMat = track(new THREE.MeshStandardMaterial({ map: bark, roughness: 1 }));
  const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length);
  trunks.castShadow = true;
  trunks.receiveShadow = true;

  const canopyGeo = track(new THREE.IcosahedronGeometry(1.9, 1));
  const canopyMat = track(
    new THREE.MeshStandardMaterial({ map: leaf, color: 0x5f7a3c, roughness: 1, flatShading: true }),
  );
  const canopyPerTree = 3;
  const canopies = new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length * canopyPerTree);
  canopies.castShadow = true;

  let ci = 0;
  treePositions.forEach(([x, z, scale], ti) => {
    p.set(x, 0, z);
    q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    s.set(scale, scale * (0.9 + Math.random() * 0.4), scale);
    m.compose(p, q, s);
    trunks.setMatrixAt(ti, m);
    for (let c = 0; c < canopyPerTree; c += 1) {
      const cx = x + (Math.random() - 0.5) * 1.8 * scale;
      const cz = z + (Math.random() - 0.5) * 1.8 * scale;
      const cy = (4.4 + Math.random() * 1.4) * scale;
      p.set(cx, cy, cz);
      const cs = scale * (0.8 + Math.random() * 0.5);
      s.set(cs, cs * 0.9, cs);
      q.setFromEuler(new THREE.Euler(Math.random(), Math.random(), Math.random()));
      m.compose(p, q, s);
      canopies.setMatrixAt(ci, m);
      ci += 1;
    }
  });
  trunks.instanceMatrix.needsUpdate = true;
  canopies.instanceMatrix.needsUpdate = true;
  // gentle canopy sway
  canopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float ph = instanceMatrix[3][0] + instanceMatrix[3][2];
         transformed.x += sin(uTime * 0.9 + ph) * 0.18;
         transformed.z += cos(uTime * 0.7 + ph) * 0.14;`,
      );
  };
  group.add(trunks, canopies);

  // ---- Wind-swept grass (instanced blades with a vertex-shader sway) --------
  const bladeGeo = track(new THREE.PlaneGeometry(0.11, 0.85, 1, 4));
  bladeGeo.translate(0, 0.425, 0);
  const grassMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x6f8a3e,
      roughness: 1,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    }),
  );
  grassMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniform;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nuniform float uTime;")
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
         float bh = uv.y;
         float ph = instanceMatrix[3][0] * 0.6 + instanceMatrix[3][2] * 0.6;
         float gust = sin(uTime * 1.7 + ph) * 0.35 + sin(uTime * 3.3 + ph) * 0.12;
         transformed.x += gust * bh * bh * 0.6;
         transformed.z += cos(uTime * 1.3 + ph) * bh * bh * 0.28;`,
      );
  };
  const GRASS = 26000;
  const grass = new THREE.InstancedMesh(bladeGeo, grassMat, GRASS);
  grass.receiveShadow = true;
  const grassColor = new THREE.Color();
  let g = 0;
  let guard = 0;
  while (g < GRASS && guard < GRASS * 4) {
    guard += 1;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * (WORLD_RADIUS - 6);
    const x = Math.cos(angle) * dist + (Math.random() - 0.5) * 2;
    const z = Math.sin(angle) * dist + (Math.random() - 0.5) * 2;
    if (inClearZone(x, z, -1)) continue;
    const scale = 0.7 + Math.random() * 0.9;
    p.set(x, 0, z);
    q.setFromEuler(new THREE.Euler(0, Math.random() * Math.PI, 0));
    s.set(1, scale, 1);
    m.compose(p, q, s);
    grass.setMatrixAt(g, m);
    grassColor.setHSL(0.24 + Math.random() * 0.08, 0.45, 0.32 + Math.random() * 0.16);
    grass.setColorAt(g, grassColor);
    g += 1;
  }
  grass.count = g;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  group.add(grass);

  // ---- Lanterns: warm flickering points near the ruins ---------------------
  const lanterns: Array<{ light: THREE.PointLight; base: number; seed: number }> = [];
  const lanternSpots: Array<[number, number]> = [
    [-6.5, -6.5],
    [6.5, -6.5],
    [-8, -20],
    [8, -28],
  ];
  for (const [x, z] of lanternSpots) {
    const light = new THREE.PointLight(0xffb457, 6, 18, 2);
    light.position.set(x, 3.4, z);
    group.add(light);
    const bulb = new THREE.Mesh(
      track(new THREE.SphereGeometry(0.16, 8, 8)),
      track(new THREE.MeshStandardMaterial({ color: 0xffd08a, emissive: 0xffa23c, emissiveIntensity: 3 })),
    );
    bulb.position.copy(light.position);
    group.add(bulb);
    lanterns.push({ light, base: 6, seed: Math.random() * 10 });
  }

  // ---- Drifting dust motes --------------------------------------------------
  const MOTES = 500;
  const moteGeo = track(new THREE.BufferGeometry());
  const motePos = new Float32Array(MOTES * 3);
  for (let i = 0; i < MOTES; i += 1) {
    motePos[i * 3] = (Math.random() - 0.5) * WORLD_RADIUS * 1.4;
    motePos[i * 3 + 1] = Math.random() * 12 + 0.5;
    motePos[i * 3 + 2] = (Math.random() - 0.5) * WORLD_RADIUS * 1.4;
  }
  moteGeo.setAttribute("position", new THREE.BufferAttribute(motePos, 3));
  const moteMat = track(
    new THREE.PointsMaterial({
      color: 0xffe4b0,
      size: 0.08,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const motes = new THREE.Points(moteGeo, moteMat);
  group.add(motes);

  // ---- Update / dispose -----------------------------------------------------
  const update = (delta: number, elapsed: number) => {
    windUniform.value = elapsed;
    for (const { light, base, seed } of lanterns) {
      light.intensity = base + Math.sin(elapsed * 9 + seed) * 0.9 + Math.sin(elapsed * 21 + seed) * 0.4;
    }
    const arr = moteGeo.getAttribute("position") as THREE.BufferAttribute;
    for (let i = 0; i < MOTES; i += 1) {
      let y = arr.getY(i) + delta * 0.25;
      if (y > 13) y = 0.5;
      arr.setY(i, y);
      arr.setX(i, arr.getX(i) + Math.sin(elapsed * 0.3 + i) * delta * 0.15);
    }
    arr.needsUpdate = true;
  };

  const dispose = () => {
    for (const item of disposables) item.dispose();
    disposables.length = 0;
  };

  return { group, obstacles, update, dispose };
}
