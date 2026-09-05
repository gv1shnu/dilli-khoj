import * as THREE from "three";

// A trail of glowing chevrons that marches from the player toward the nearest
// amber archive, pointing the way. The chevrons are emissive so the scene's bloom
// pass makes them glow. They fade out when the player is already at the archive.

export interface GuideArrows {
  group: THREE.Group;
  /**
   * Point the trail from `from` toward `target`; `hidden` fades it out (e.g. when close).
   * `target` sets the DIRECTION (usually the next route waypoint, which may be only a
   * step ahead). `reachDistance` — the straight-line distance to the actual amber — sets
   * how far the chevrons stream out, so a nearby waypoint never collapses the trail.
   */
  update: (
    from: THREE.Vector3,
    target: THREE.Vector3,
    elapsed: number,
    hidden: boolean,
    reachDistance?: number,
  ) => void;
  dispose: () => void;
}

const CHEVRON_COUNT = 5;
const NEAR_START = 2.2; // first chevron sits this far ahead of the player
const SPAN = 6.5; // chevrons march out to this distance, then loop

export function createGuideArrows(): GuideArrows {
  const group = new THREE.Group();

  // Chevron silhouette pointing +Y, extruded thin, then laid flat to point +Z.
  const shape = new THREE.Shape();
  shape.moveTo(-0.5, -0.2);
  shape.lineTo(0, 0.3);
  shape.lineTo(0.5, -0.2);
  shape.lineTo(0.5, -0.5);
  shape.lineTo(0, 0.0);
  shape.lineTo(-0.5, -0.5);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: false });
  geo.rotateX(-Math.PI / 2); // lay flat with the glowing face up (tip now points -Z)
  geo.rotateY(Math.PI); // flip the tip to +Z so yaw = atan2(dir.x, dir.z) aims it at the target
  geo.scale(0.85, 1, 0.85);

  const chevrons: THREE.Mesh[] = [];
  const materials: THREE.MeshStandardMaterial[] = [];
  for (let i = 0; i < CHEVRON_COUNT; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: 0xffb44a,
      emissive: 0xffa128,
      emissiveIntensity: 2.6,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    materials.push(material);
    const mesh = new THREE.Mesh(geo, material);
    mesh.renderOrder = 3;
    chevrons.push(mesh);
    group.add(mesh);
  }

  const dir = new THREE.Vector3();
  const flat = new THREE.Vector3();

  const update = (
    from: THREE.Vector3,
    target: THREE.Vector3,
    elapsed: number,
    hidden: boolean,
    reachDistance?: number,
  ) => {
    dir.subVectors(target, from);
    dir.y = 0;
    const distance = dir.length();
    if (distance < 0.001 || hidden) {
      for (const m of materials) m.opacity = Math.max(0, m.opacity - 0.08);
      group.visible = materials.some((m) => m.opacity > 0.01);
      return;
    }
    group.visible = true;
    flat.copy(dir).normalize();
    const yaw = Math.atan2(flat.x, flat.z);

    // How far along the trail the chevrons reach. Measured against the real amber
    // (reachDistance) — not the next waypoint — so the trail streams the full SPAN
    // when the archive is far and only shortens as the player nears it (never past it).
    const toAmber = reachDistance ?? distance;
    const reach = Math.min(SPAN, Math.max(0.5, toAmber - 1.0));
    const march = (elapsed * 1.6) % 1; // 0..1 marching phase

    for (let i = 0; i < CHEVRON_COUNT; i += 1) {
      const mesh = chevrons[i];
      const material = materials[i];
      // Position each chevron along the direction, marching forward and looping.
      const t = (i / CHEVRON_COUNT + march) % 1;
      const along = NEAR_START + t * reach;
      mesh.position.set(
        from.x + flat.x * along,
        from.y + 0.12 + Math.sin(elapsed * 4 + i) * 0.05,
        from.z + flat.z * along,
      );
      mesh.rotation.y = yaw;
      // Fade in near the player, fade out near the far end of the trail.
      const fade = Math.sin(t * Math.PI);
      material.opacity += (fade * 0.9 - material.opacity) * 0.2;
    }
  };

  const dispose = () => {
    geo.dispose();
    for (const m of materials) m.dispose();
  };

  return { group, update, dispose };
}
