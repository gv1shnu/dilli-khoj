import { useEffect, useRef } from "react";
import * as THREE from "three";

interface RuinSceneProps {
  onProximityChange: (nearTerminal: boolean) => void;
}

const TERMINAL = new THREE.Vector3(0, 0, 0);

export function RuinScene({ onProximityChange }: RuinSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const proximityCallback = useRef(onProximityChange);

  useEffect(() => {
    proximityCallback.current = onProximityChange;
  }, [onProximityChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0d0c);
    scene.fog = new THREE.FogExp2(0x101614, 0.025);

    const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 120);
    camera.position.set(0, 11, 18);

    const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    host.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight(0x9bd5c8, 0x3b2618, 1.25));
    const moon = new THREE.DirectionalLight(0xffd7a0, 2.8);
    moon.position.set(-8, 14, 10);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    scene.add(moon);

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(52, 52),
      new THREE.MeshStandardMaterial({ color: 0x25241f, roughness: 0.98, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const lane = new THREE.Mesh(
      new THREE.PlaneGeometry(7, 48),
      new THREE.MeshStandardMaterial({ color: 0x3a3027, roughness: 1 }),
    );
    lane.rotation.x = -Math.PI / 2;
    lane.position.y = 0.012;
    scene.add(lane);

    const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x6a5843, roughness: 0.95 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: 0x725844, roughness: 0.9 });
    const obstacles: THREE.Box3[] = [];

    const addBuilding = (x: number, z: number, width: number, height: number, depth: number) => {
      const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), wallMaterial);
      building.position.set(x, height / 2, z);
      building.castShadow = true;
      building.receiveShadow = true;
      scene.add(building);
      obstacles.push(new THREE.Box3().setFromObject(building).expandByScalar(0.35));

      const missingCorner = new THREE.Mesh(
        new THREE.BoxGeometry(width * 0.34, 0.35, depth * 0.4),
        rubbleMaterial,
      );
      missingCorner.position.set(x + width * 0.25, 0.18, z + depth * 0.4);
      missingCorner.rotation.y = 0.35;
      missingCorner.castShadow = true;
      scene.add(missingCorner);
    };

    addBuilding(-7.2, -7, 6, 4.8, 6);
    addBuilding(7.5, -6, 6.5, 6.2, 5.5);
    addBuilding(-7.8, 5.5, 7, 7.5, 6);
    addBuilding(7.7, 7.5, 6.8, 4.2, 7);
    addBuilding(-8.8, 15.2, 7.5, 5.5, 5);
    addBuilding(8.8, 16.5, 7.5, 7.8, 6);

    const beacon = new THREE.Group();
    const beaconBase = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.5, 0.7, 8),
      new THREE.MeshStandardMaterial({ color: 0x222824, metalness: 0.7, roughness: 0.3 }),
    );
    beaconBase.position.y = 0.35;
    beaconBase.castShadow = true;
    beacon.add(beaconBase);
    const beaconCore = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.7),
      new THREE.MeshStandardMaterial({ color: 0xf5c26b, emissive: 0xe88324, emissiveIntensity: 2.5 }),
    );
    beaconCore.position.y = 1.55;
    beacon.add(beaconCore);
    const beaconLight = new THREE.PointLight(0xffa342, 14, 16, 2);
    beaconLight.position.y = 2;
    beacon.add(beaconLight);
    beacon.position.copy(TERMINAL);
    scene.add(beacon);

    const player = new THREE.Group();
    const cloak = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.42, 0.8, 5, 10),
      new THREE.MeshStandardMaterial({ color: 0x36b798, roughness: 0.7 }),
    );
    cloak.position.y = 0.8;
    cloak.castShadow = true;
    player.add(cloak);
    const lamp = new THREE.PointLight(0x78ffe0, 4, 5);
    lamp.position.set(0, 1.2, 0.5);
    player.add(lamp);
    player.position.set(0, 0, 12);
    scene.add(player);

    const keys = new Set<string>();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLTextAreaElement || event.target instanceof HTMLInputElement) return;
      keys.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const timer = new THREE.Timer();
    timer.connect(document);
    let animationFrame = 0;
    let wasNear = false;
    const direction = new THREE.Vector3();
    const nextPosition = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();

    const resize = () => {
      const width = host.clientWidth;
      const height = host.clientHeight;
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    const animate = (timestamp?: number) => {
      timer.update(timestamp);
      const delta = Math.min(timer.getDelta(), 0.04);
      direction.set(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp")) direction.z -= 1;
      if (keys.has("KeyS") || keys.has("ArrowDown")) direction.z += 1;
      if (keys.has("KeyA") || keys.has("ArrowLeft")) direction.x -= 1;
      if (keys.has("KeyD") || keys.has("ArrowRight")) direction.x += 1;

      if (direction.lengthSq() > 0) {
        direction.normalize();
        nextPosition.copy(player.position).addScaledVector(direction, delta * 6.2);
        nextPosition.x = THREE.MathUtils.clamp(nextPosition.x, -12.5, 12.5);
        nextPosition.z = THREE.MathUtils.clamp(nextPosition.z, -18, 20);
        const playerBox = new THREE.Box3(
          new THREE.Vector3(nextPosition.x - 0.45, 0, nextPosition.z - 0.45),
          new THREE.Vector3(nextPosition.x + 0.45, 1.7, nextPosition.z + 0.45),
        );
        if (!obstacles.some((obstacle) => obstacle.intersectsBox(playerBox))) {
          player.position.copy(nextPosition);
        }
        player.rotation.y = Math.atan2(direction.x, direction.z);
      }

      const isNear = player.position.distanceTo(TERMINAL) < 4.4;
      if (isNear !== wasNear) {
        wasNear = isNear;
        proximityCallback.current(isNear);
      }

      beaconCore.rotation.y += delta * 1.2;
      beaconCore.position.y = 1.55 + Math.sin(timer.getElapsed() * 2.2) * 0.12;

      cameraTarget.set(player.position.x, player.position.y + 10.5, player.position.z + 15);
      camera.position.lerp(cameraTarget, 1 - Math.pow(0.002, delta));
      camera.lookAt(player.position.x, 0.8, player.position.z - 2.5);

      renderer.render(scene, camera);
      animationFrame = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      timer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, []);

  return <div ref={hostRef} className="ruin-scene" aria-label="Explorable Chandni Chowk ruin" />;
}
