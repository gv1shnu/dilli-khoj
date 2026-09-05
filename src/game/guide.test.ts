import { describe, it, expect, afterEach } from "vitest";
import * as THREE from "three";
import { createGuideArrows } from "./guide";

// Regression guard for the collapsed amber trail: the chevrons must stream out toward
// the amber, sized by the real distance to it — not by the (possibly tiny) next-waypoint
// hop that sets only their direction.

const from = new THREE.Vector3(0, 0, 0);
// Waypoint one step ahead (north, -z): sets direction only.
const waypoint = new THREE.Vector3(0, 0, -2);

let guide: ReturnType<typeof createGuideArrows> | null = null;
afterEach(() => {
  guide?.dispose();
  guide = null;
});

const spanAlongZ = (g: THREE.Group) => {
  const zs = g.children.map((c) => c.position.z);
  return Math.max(...zs) - Math.min(...zs);
};

describe("amber guide trail", () => {
  it("streams the full trail toward a far amber even when the next waypoint is close", () => {
    guide = createGuideArrows();
    guide.update(from, waypoint, 0, false, 70); // amber is ~70 units away
    // Five chevrons must spread well beyond the 2-unit waypoint hop.
    expect(spanAlongZ(guide.group)).toBeGreaterThan(3);
    // And they point toward the amber (north, -z): every chevron sits ahead of the player.
    expect(guide.group.children.every((c) => c.position.z < 0)).toBe(true);
    for (const c of guide.group.children) expect(c.rotation.y).toBeCloseTo(Math.PI, 2);
  });

  it("shortens the trail as the player nears the amber", () => {
    guide = createGuideArrows();
    guide.update(from, waypoint, 0, false, 2); // amber is close
    expect(spanAlongZ(guide.group)).toBeLessThan(3);
  });

  it("fades out when hidden (at the archive)", () => {
    guide = createGuideArrows();
    guide.update(from, waypoint, 0, false, 70);
    for (let i = 0; i < 40; i++) guide.update(from, waypoint, i, true, 70);
    expect(guide.group.visible).toBe(false);
  });
});
