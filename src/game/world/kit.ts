import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { LevelDefinition } from "./types";
import type { Point } from "./layout";

export interface Surface {
  x: number;
  z: number;
  w: number;
  d: number;
  y: number;
  slope?: number;
  axis?: "x" | "z";
}
/** Original modular architecture and props. Coordinates are local to each place. */
export class LevelKit {
  group = new THREE.Group();
  obstacles: THREE.Box3[] = [];
  surfaces: Surface[] = [];
  waterZones: {
    x: number;
    z: number;
    w: number;
    d: number;
    y: number;
    surfaceStart: number;
  }[] = [];
  assets: THREE.Object3D[] = [];
  private geometries = new Set<THREE.BufferGeometry>();
  private materials = new Map<string, THREE.MeshStandardMaterial>();
  private textures: THREE.Texture[] = [];
  constructor(
    public definition: LevelDefinition,
    private stoneTexture?: THREE.Texture,
    private groundTexture?: THREE.Texture,
  ) {}
  material(color: number, glow = 0, floor = false) {
    const key = `${color}:${glow}:${floor}`;
    if (!this.materials.has(key))
      this.materials.set(
        key,
        new THREE.MeshStandardMaterial({
          color,
          roughness: 0.88,
          map: glow
            ? null
            : floor
              ? (this.groundTexture ?? null)
              : color === this.definition.stone
                ? (this.stoneTexture ?? null)
                : null,
          emissive: glow ? color : 0,
          emissiveIntensity: glow,
        }),
      );
    return this.materials.get(key)!;
  }
  mesh(
    geometry: THREE.BufferGeometry,
    color: number,
    x: number,
    y: number,
    z: number,
    solid = false,
    rotation = 0,
  ) {
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, this.material(color));
    mesh.position.set(x, y, z);
    mesh.rotation.y = rotation;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.group.add(mesh);
    this.assets.push(mesh);
    if (solid) {
      mesh.updateMatrixWorld(true);
      this.obstacles.push(new THREE.Box3().setFromObject(mesh));
    }
    return mesh;
  }
  box(
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
    color = this.definition.stone,
    solid = true,
    rotation = 0,
  ) {
    const geometry = new THREE.BoxGeometry(w, h, d),
      uv = geometry.getAttribute("uv"),
      normal = geometry.getAttribute("normal");
    for (let i = 0; i < uv.count; i++) {
      const nx = Math.abs(normal.getX(i)),
        ny = Math.abs(normal.getY(i));
      uv.setXY(
        i,
        (uv.getX(i) * (nx > 0.5 ? d : w)) / 4,
        (uv.getY(i) * (ny > 0.5 ? d : h)) / 4,
      );
    }
    const mesh = this.mesh(geometry, color, x, y + h / 2, z, solid, rotation);
    if (!solid && y >= 5 && h < 1 && w > 5 && d > 4) mesh.userData.roof = true;
    return mesh;
  }
  cylinder(
    x: number,
    y: number,
    z: number,
    r: number,
    h: number,
    color = this.definition.stone,
    solid = true,
    top = r,
  ) {
    return this.mesh(
      new THREE.CylinderGeometry(top, r, h, 12),
      color,
      x,
      y + h / 2,
      z,
      solid,
    );
  }
  floor(
    x: number,
    z: number,
    w: number,
    d: number,
    color = this.definition.ground,
    y = 0,
  ) {
    const mesh = this.box(
      x,
      y - 0.15 + this.surfaces.length * 0.008,
      z,
      w,
      0.15,
      d,
      color,
      false,
    );
    mesh.material = this.material(color, 0, true);
    mesh.userData.roof = false;
    this.surfaces.push({ x, z, w, d, y });
  }
  ramp(
    x: number,
    z: number,
    w: number,
    d: number,
    height: number,
    axis: "x" | "z" = "z",
    base = 0,
  ) {
    const count = Math.ceil(Math.abs(height) / 0.35);
    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count - 0.5,
        h = base + (height * (i + 1)) / count;
      this.box(
        x + (axis === "x" ? t * w : 0),
        0,
        z + (axis === "z" ? t * d : 0),
        axis === "x" ? w / count : w,
        Math.max(0.1, h),
        axis === "z" ? d / count : d,
        this.definition.stone,
        false,
      );
    }
    this.surfaces.push({
      x,
      z,
      w,
      d,
      y: base + height / 2,
      slope: height,
      axis,
    });
  }
  wall(
    x: number,
    z: number,
    w: number,
    d: number,
    h = 7,
    color = this.definition.stone,
  ) {
    this.box(x, 0, z, w, h, d, color);
    for (let i = 0; i < Math.floor(w / 2); i++)
      this.box(x - w / 2 + i * 2 + 1, h, z, 1, 0.8, d, color, false);
  }
  arch(x: number, z: number, width = 10, height = 10, rotation = 0) {
    const dx = Math.cos(rotation),
      dz = -Math.sin(rotation);
    for (const side of [-1, 1])
      this.box(
        x + side * (width / 2 + 1) * dx,
        0,
        z + side * (width / 2 + 1) * dz,
        2,
        height,
        2.8,
        this.definition.stone,
        true,
        rotation,
      );
    const shape = new THREE.Shape();
    const r = width / 2;
    shape.absarc(0, 0, r + 2, 0, Math.PI, false);
    shape.absarc(0, 0, r, Math.PI, 0, true);
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 2.8,
      bevelEnabled: false,
      curveSegments: 12,
    });
    geo.translate(0, 0, -1.4);
    this.mesh(geo, this.definition.stone, x, height - r, z, false, rotation);
    this.box(
      x,
      height,
      z,
      width + 4,
      1.5,
      3.4,
      this.definition.accent,
      false,
      rotation,
    );
  }
  column(x: number, z: number, height = 7, r = 0.7, y = 0) {
    this.cylinder(x, y, z, r, height);
    this.box(x, y, z, r * 2.8, 0.4, r * 2.8);
    this.box(
      x,
      y + height - 0.3,
      z,
      r * 2.8,
      0.5,
      r * 2.8,
      this.definition.accent,
      false,
    );
  }
  dome(x: number, z: number, r = 7, y = 8) {
    this.mesh(
      new THREE.SphereGeometry(r, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      this.definition.accent,
      x,
      y,
      z,
      false,
    );
    this.cylinder(x, y + r, z, 0.2, 2, 0xc5a456, false, 0.05);
  }
  building(
    x: number,
    z: number,
    w: number,
    d: number,
    h = 9,
    color = this.definition.stone,
  ) {
    this.box(x, 0, z, w, h, d, color);
    this.box(x, h, z, w + 1, 0.5, d + 1, this.definition.accent, false);
    for (let px = x - w / 2 + 2; px < x + w / 2 - 1; px += 3.4)
      for (let y = 2; y < h - 1; y += 3) {
        this.box(px, y, z + d / 2 + 0.03, 1.3, 1.8, 0.1, 0x203338, false);
        this.box(
          px,
          y - 0.2,
          z + d / 2 + 0.35,
          1.7,
          0.2,
          0.6,
          this.definition.accent,
          false,
        );
      }
  }
  tree(x: number, z: number, h = 9) {
    this.cylinder(x, 0, z, 0.45, h * 0.62, 0x514239);
    this.mesh(
      new THREE.IcosahedronGeometry(h * 0.34, 1),
      0x425d47,
      x,
      h * 0.75,
      z,
      false,
    );
    this.mesh(
      new THREE.IcosahedronGeometry(h * 0.23, 1),
      0x68805b,
      x + h * 0.17,
      h * 0.86,
      z,
      false,
    );
  }
  lamp(x: number, z: number, y = 0) {
    this.cylinder(x, y, z, 0.12, 4, 0x384342);
    const m = this.box(x, y + 3.6, z, 0.7, 0.8, 0.7, 0xffcf80, false);
    m.material = this.material(0xffcc78, 1.6);
  }
  crate(x: number, z: number, size = 1.8, color = 0x90714b, y = 0) {
    this.box(x, y, z, size, size, size, color);
    for (const offset of [-0.32, 0.32])
      this.box(
        x + offset * size,
        y,
        z + size / 2 + 0.03,
        0.12,
        size,
        0.12,
        0x483c30,
        false,
      );
    this.box(
      x,
      y + size * 0.48,
      z + size / 2 + 0.05,
      size,
      0.1,
      0.12,
      0x483c30,
      false,
    );
  }
  stall(x: number, z: number, color = this.definition.accent, rotation = 0) {
    this.box(x, 0, z, 5, 1.3, 2, 0x775c43, true, rotation);
    const group = new THREE.Group();
    for (const dx of [-2.8, 2.8])
      for (const dz of [-1.8, 1.8])
        this.box(x + dx, 0, z + dz, 0.15, 4, 0.15, 0x605748);
    for (let i = 0; i < 6; i++)
      this.box(x - 2.5 + i, 4, z, 1, 0.18, 4, i % 2 ? 0xd6c8a3 : color, false);
    this.group.add(group);
  }
  bus(x: number, z: number, color = 0x678974, rotation = 0) {
    const root = new THREE.Group();
    root.position.set(x, 0, z);
    root.rotation.y = rotation;
    const part = (
      w: number,
      h: number,
      d: number,
      px: number,
      py: number,
      pz: number,
      c: number,
    ) => {
      const g = new THREE.BoxGeometry(w, h, d);
      this.geometries.add(g);
      const m = new THREE.Mesh(g, this.material(c));
      m.position.set(px, py, pz);
      m.castShadow = true;
      root.add(m);
    };
    part(3.4, 3.1, 11, 0, 2.25, 0, color);
    part(3.5, 0.35, 11.2, 0, 3.95, 0, 0xb5b9a6);
    part(3, 0.95, 0.1, 0, 2.8, -5.55, 0x253f47);
    for (let i = 0; i < 5; i++)
      for (const side of [-1, 1])
        part(0.08, 1.05, 1.4, side * 1.73, 2.95, -3.6 + i * 1.8, 0x253f47);
    for (const dx of [-1.7, 1.7])
      for (const dz of [-3.4, 3.4]) {
        const g = new THREE.CylinderGeometry(0.72, 0.72, 0.35, 12);
        this.geometries.add(g);
        const wheel = new THREE.Mesh(g, this.material(0x262a2b));
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(dx, 0.8, dz);
        root.add(wheel);
      }
    this.group.add(root);
    this.assets.push(root);
    root.updateMatrixWorld(true);
    this.obstacles.push(new THREE.Box3().setFromObject(root));
  }
  water(x: number, z: number, w: number, d: number, y = 0.04) {
    const m = this.box(x, y, z, w, 0.1, d, 0x397b80, false);
    m.material = this.material(0x397b80);
    m.material.roughness = 0.3;
    m.material.metalness = 0.25;
    // Water is visible but impassable; bridges and raised walks can cross above it.
    this.waterZones.push({ x, z, w, d, y, surfaceStart: this.surfaces.length });
    for (let i = 0; i < 6; i++)
      this.box(
        x - w * 0.4 + i * w * 0.15,
        y + 0.13,
        z + ((i % 3) - 1) * d * 0.2,
        w * 0.07,
        0.025,
        0.12,
        0x91b8ae,
        false,
      );
  }
  pipe(
    x: number,
    y: number,
    z: number,
    length: number,
    r = 0.5,
    axis: "x" | "z" = "x",
  ) {
    const g = new THREE.CylinderGeometry(r, r, length, 12);
    g.rotateZ(Math.PI / 2);
    if (axis === "z") g.rotateY(Math.PI / 2);
    this.mesh(g, 0x657f7a, x, y, z, true);
    for (const side of [-1, 1])
      this.box(
        x + (axis === "x" ? side * length * 0.35 : 0),
        0,
        z + (axis === "z" ? side * length * 0.35 : 0),
        1,
        y - 0.3,
        1,
        0x8e8980,
      );
  }
  sign(x: number, z: number, text: string, width = 8, y = 4) {
    if (typeof document === "undefined") return;
    if (Math.abs(x) < 6 && z > 30) {
      x = -22;
      width = Math.min(width, 9);
      y = this.height(x, z) + 3;
    }
    const canvas = document.createElement("canvas");
    canvas.width = 768;
    canvas.height = 192;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#233d3b";
    ctx.fillRect(0, 0, 768, 192);
    ctx.strokeStyle = "#c4ac78";
    ctx.lineWidth = 7;
    ctx.strokeRect(10, 10, 748, 172);
    ctx.fillStyle = "#f3e2b8";
    ctx.font = "bold 48px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 384, 96, 710);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(texture);
    const mat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.8,
      side: THREE.DoubleSide,
    });
    this.materials.set(`sign:${this.materials.size}`, mat);
    const geometry = new THREE.PlaneGeometry(width, width / 4);
    this.geometries.add(geometry);
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    this.group.add(mesh);
  }
  scatter(seed: number, count: number, color = 0x777b60) {
    let state = seed;
    const random = () => {
      state = (state * 1664525 + 1013904223) >>> 0;
      return state / 4294967296;
    };
    for (let i = 0; i < count; i++) {
      const x = (random() - 0.5) * 96,
        z = (random() - 0.5) * 96;
      if (Math.abs(x) < 10 || Math.abs(z) < 10) continue;
      this.mesh(
        new THREE.DodecahedronGeometry(0.3 + random() * 0.5),
        color,
        x,
        0.2,
        z,
        false,
      );
    }
  }
  height(x: number, z: number) {
    let height = 0;
    for (const s of this.surfaces)
      if (Math.abs(x - s.x) <= s.w / 2 && Math.abs(z - s.z) <= s.d / 2)
        height =
          s.y +
          (s.slope ?? 0) * (s.axis === "x" ? (x - s.x) / s.w : (z - s.z) / s.d);
    return height;
  }
  blocked(x: number, z: number, radius = 0.65) {
    const y = this.height(x, z);
    if (
      this.waterZones.some(
        (w) =>
          Math.abs(x - w.x) < w.w / 2 &&
          Math.abs(z - w.z) < w.d / 2 &&
          !this.surfaces
            .slice(w.surfaceStart)
            .some(
              (s) =>
                Math.abs(x - s.x) <= s.w / 2 &&
                Math.abs(z - s.z) <= s.d / 2 &&
                y >= w.y - 0.2,
            ),
      )
    )
      return true;
    return this.obstacles.some(
      (b) =>
        x + radius > b.min.x &&
        x - radius < b.max.x &&
        z + radius > b.min.z &&
        z - radius < b.max.z &&
        b.max.y > y + 0.25 &&
        b.min.y < y + 1.9,
    );
  }
  optimize() {
    this.group.updateMatrixWorld(true);
    const inverse = this.group.matrixWorld.clone().invert();
    const batches = new Map<THREE.Material, THREE.Mesh[]>();
    this.group.traverse((object) => {
      if (
        !(object instanceof THREE.Mesh) ||
        Array.isArray(object.material) ||
        object.userData.roof
      )
        return;
      for (
        let p: THREE.Object3D | null = object.parent;
        p && p !== this.group;
        p = p.parent
      )
        if (p.userData.dynamic) return;
      const list = batches.get(object.material) ?? [];
      list.push(object);
      batches.set(object.material, list);
    });
    for (const [material, meshes] of batches) {
      if (meshes.length < 3) continue;
      const geometries = meshes.map((m) => {
        let g = m.geometry.clone();
        if (g.index) {
          const original = g;
          g = g.toNonIndexed();
          original.dispose();
        }
        return g.applyMatrix4(inverse.clone().multiply(m.matrixWorld));
      });
      const geometry = mergeGeometries(geometries, false);
      geometries.forEach((g) => g.dispose());
      if (!geometry) continue;
      this.geometries.add(geometry);
      const merged = new THREE.Mesh(geometry, material);
      merged.castShadow = true;
      merged.receiveShadow = true;
      this.group.add(merged);
      meshes.forEach((m) => m.removeFromParent());
    }
  }
  canWalk(from: Point, to: Point) {
    const distance = Math.hypot(to[0] - from[0], to[1] - from[1]);
    const steps = Math.max(1, Math.ceil(distance / 0.3));
    let y = this.height(...from);
    for (let i = 1; i <= steps; i++) {
      const x = from[0] + ((to[0] - from[0]) * i) / steps,
        z = from[1] + ((to[1] - from[1]) * i) / steps,
        next = this.height(x, z);
      if (this.blocked(x, z) || Math.abs(next - y) > 0.7) return false;
      y = next;
    }
    return true;
  }
  dispose() {
    this.geometries.forEach((g) => g.dispose());
    this.materials.forEach((m) => m.dispose());
    this.textures.forEach((t) => t.dispose());
  }
}
