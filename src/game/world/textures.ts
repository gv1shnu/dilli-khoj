import * as THREE from "three";
/** Neutral original texture sheets preserve the authored material palette. */
export function cityTexture(kind: "stone" | "ground") {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = kind === "stone" ? "#c7c4b7" : "#c9c8b9";
  ctx.fillRect(0, 0, 256, 256);
  let seed = kind === "stone" ? 17 : 43;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < 4200; i++) {
    const grey = 100 + Math.floor(random() * 150);
    ctx.fillStyle = `rgba(${grey},${grey},${grey},.12)`;
    ctx.fillRect(
      random() * 256,
      random() * 256,
      1 + random() * 3,
      1 + random() * 3,
    );
  }
  if (kind === "stone")
    for (let row = 0; row < 4; row++)
      for (let col = -1; col < 4; col++) {
        ctx.strokeStyle = "#817f7270";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(col * 86 + (row % 2) * 43 + 1, row * 64 + 1, 84, 62);
      }
  else
    for (let i = 0; i < 12; i++) {
      const x = random() * 256,
        y = random() * 256;
      ctx.strokeStyle = "#72756322";
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 25, y + random() * 15);
      ctx.lineTo(x + random() * 40, y + random() * 32);
      ctx.stroke();
    }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 4;
  return texture;
}
