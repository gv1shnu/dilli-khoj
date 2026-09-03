import * as THREE from "three";

// Procedural canvas textures so the world ships no image files.
// Every texture is generated once and cached.

type CanvasCtx = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function makeCanvas(size: number): CanvasCtx {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas context unavailable for texture generation.");
  return { canvas, ctx };
}

function grain(ctx: CanvasRenderingContext2D, size: number, amount: number, alpha: number) {
  for (let i = 0; i < amount; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = Math.random() * 2 + 0.4;
    const shade = Math.random() < 0.5 ? 0 : 255;
    ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function finish(canvas: HTMLCanvasElement, repeat: number): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeat, repeat);
  texture.anisotropy = 8;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

let groundCache: THREE.CanvasTexture | null = null;
let stoneCache: THREE.CanvasTexture | null = null;
let barkCache: THREE.CanvasTexture | null = null;
let leafCache: THREE.CanvasTexture | null = null;

/** Cracked dry earth with mossy patches and scattered cobble. */
export function groundTexture(): THREE.CanvasTexture {
  if (groundCache) return groundCache;
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);

  const base = ctx.createLinearGradient(0, 0, size, size);
  base.addColorStop(0, "#39322690");
  base.addColorStop(0.5, "#4a3f2d");
  base.addColorStop(1, "#332b20");
  ctx.fillStyle = "#3d3324";
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Mossy overgrowth patches (the ruins are reclaimed by nature).
  for (let i = 0; i < 26; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 18 + Math.random() * 60;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, r);
    glow.addColorStop(0, `rgba(74,96,48,${0.18 + Math.random() * 0.22})`);
    glow.addColorStop(1, "rgba(74,96,48,0)");
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Dry cracks.
  ctx.strokeStyle = "rgba(24,18,12,0.5)";
  for (let i = 0; i < 40; i += 1) {
    ctx.lineWidth = Math.random() * 1.6 + 0.3;
    ctx.beginPath();
    let x = Math.random() * size;
    let y = Math.random() * size;
    ctx.moveTo(x, y);
    const segs = 3 + Math.floor(Math.random() * 4);
    for (let s = 0; s < segs; s += 1) {
      x += (Math.random() - 0.5) * 60;
      y += (Math.random() - 0.5) * 60;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  grain(ctx, size, 5200, 0.16);
  groundCache = finish(canvas, 26);
  return groundCache;
}

/** Weathered red-sandstone masonry for the Mughal ruins. */
export function stoneTexture(): THREE.CanvasTexture {
  if (stoneCache) return stoneCache;
  const size = 512;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#9c6746";
  ctx.fillRect(0, 0, size, size);

  // Ashlar block courses.
  const rows = 8;
  const rh = size / rows;
  for (let r = 0; r < rows; r += 1) {
    const cols = 5 + (r % 2);
    const cw = size / cols;
    const offset = (r % 2) * cw * 0.5;
    for (let c = -1; c < cols + 1; c += 1) {
      const x = c * cw + offset;
      const y = r * rh;
      const tone = 0.72 + Math.random() * 0.35;
      ctx.fillStyle = `rgba(${Math.floor(150 * tone)},${Math.floor(96 * tone)},${Math.floor(64 * tone)},1)`;
      ctx.fillRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
      // mortar shadow
      ctx.strokeStyle = "rgba(40,26,18,0.55)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 1.5, y + 1.5, cw - 3, rh - 3);
    }
  }

  // Water stains + moss streaks.
  for (let i = 0; i < 60; i += 1) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const h = 20 + Math.random() * 90;
    const streak = ctx.createLinearGradient(x, y, x, y + h);
    const green = Math.random() < 0.4;
    streak.addColorStop(0, green ? "rgba(70,86,44,0.22)" : "rgba(30,20,14,0.28)");
    streak.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = streak;
    ctx.fillRect(x, y, 2 + Math.random() * 4, h);
  }

  grain(ctx, size, 4200, 0.12);
  stoneCache = finish(canvas, 3);
  return stoneCache;
}

/** Vertical bark grain for tree trunks. */
export function barkTexture(): THREE.CanvasTexture {
  if (barkCache) return barkCache;
  const size = 256;
  const { canvas, ctx } = makeCanvas(size);
  ctx.fillStyle = "#4a3826";
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 90; i += 1) {
    const x = Math.random() * size;
    const w = Math.random() * 3 + 0.5;
    const tone = Math.random() * 0.5;
    ctx.strokeStyle = `rgba(${Math.random() < 0.5 ? 20 : 90},${40 + tone * 30},${20 + tone * 20},${0.25 + Math.random() * 0.3})`;
    ctx.lineWidth = w;
    ctx.beginPath();
    let y = 0;
    let px = x;
    ctx.moveTo(px, y);
    while (y < size) {
      y += 16;
      px += (Math.random() - 0.5) * 8;
      ctx.lineTo(px, y);
    }
    ctx.stroke();
  }
  grain(ctx, size, 2000, 0.2);
  barkCache = finish(canvas, 1);
  return barkCache;
}

/** Soft mottled foliage disc used as a canopy alpha sprite. */
export function leafTexture(): THREE.CanvasTexture {
  if (leafCache) return leafCache;
  const size = 128;
  const { canvas, ctx } = makeCanvas(size);
  ctx.clearRect(0, 0, size, size);
  for (let i = 0; i < 220; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const rad = Math.pow(Math.random(), 0.6) * (size * 0.46);
    const x = size / 2 + Math.cos(a) * rad;
    const y = size / 2 + Math.sin(a) * rad;
    const g = 90 + Math.random() * 90;
    ctx.fillStyle = `rgba(${40 + Math.random() * 40},${g},${40 + Math.random() * 30},${0.5 + Math.random() * 0.4})`;
    ctx.beginPath();
    ctx.arc(x, y, 3 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  leafCache = tex;
  return leafCache;
}
