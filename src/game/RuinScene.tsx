import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { buildCity } from "./world/city";
import { currentRuinId, isUnlocked } from "./progression";
import { createCharacter } from "./character";
import { createAmbience } from "./ambience";
import { createGuideArrows } from "./guide";
import { findRoute, type Point } from "./world/layout";

export type TrailTarget = "archive" | "gate";

interface RuinSceneProps {
  onProximityChange: (nearTerminal: boolean) => void;
  inputPaused?: boolean;
  cleared?: readonly number[];
  initialLocation?: number;
  autoWalk?: boolean;
  trailTarget?: TrailTarget;
  xpAnchor?: RefObject<HTMLDivElement | null>;
  onFrameStats?: (stats: {
    fps: number;
    calls: number;
    triangles: number;
    x: number;
    z: number;
    location: number;
  }) => void;
  storageKey?: string;
  travel?: { id: number; nonce: number } | null;
  onArchiveNear?: (id: number | null) => void;
  onLocationChange?: (id: number) => void;
  onPortalEnter?: (id: number) => void;
  onDiscovery?: (
    value: { id: number; title: string; text: string } | null,
  ) => void;
}

const EMPTY_PROGRESS: readonly number[] = [];
const WALK_SPEED = 4.2;
const RUN_SPEED = 8.4;

export function RuinScene({
  onProximityChange,
  inputPaused = false,
  cleared = EMPTY_PROGRESS,
  storageKey,
  travel,
  onArchiveNear,
  onLocationChange,
  onPortalEnter,
  onDiscovery,
  initialLocation,
  onFrameStats,
  autoWalk = false,
  trailTarget = "archive",
  xpAnchor,
}: RuinSceneProps) {
  const autoWalkRef = useRef(autoWalk);
  autoWalkRef.current = autoWalk;
  const trailTargetRef = useRef(trailTarget);
  trailTargetRef.current = trailTarget;
  const progressRef = useRef(cleared);
  const travelRef = useRef(travel);
  const events = useRef({
    onArchiveNear,
    onLocationChange,
    onPortalEnter,
    onDiscovery,
    onFrameStats,
  });
  progressRef.current = cleared;
  travelRef.current = travel;
  events.current = {
    onArchiveNear,
    onLocationChange,
    onPortalEnter,
    onDiscovery,
    onFrameStats,
  };
  const hostRef = useRef<HTMLDivElement>(null);
  const proximityCallback = useRef(onProximityChange);
  const paused = useRef(inputPaused);
  useEffect(() => {
    paused.current = inputPaused;
  }, [inputPaused]);

  useEffect(() => {
    proximityCallback.current = onProximityChange;
  }, [onProximityChange]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    // ---- Renderer -----------------------------------------------------------
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.info.autoReset = false;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    host.appendChild(renderer.domElement);

    // ---- Scene, dusk sky & fog ---------------------------------------------
    const scene = new THREE.Scene();
    const horizon = new THREE.Color(0xd98a4e);
    scene.fog = new THREE.Fog(0xcaa06a, 46, 190);

    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        uniforms: {
          top: { value: new THREE.Color(0x243a63) },
          mid: { value: new THREE.Color(0x8f6a8c) },
          bottom: { value: new THREE.Color(0xe0a35c) },
        },
        vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bottom;
          void main(){ float h = normalize(vP).y; vec3 c = h > 0.0 ? mix(mid, top, pow(h,0.7)) : mix(mid, bottom, pow(-h,0.5)); gl_FragColor = vec4(c,1.0); }`,
      }),
    );
    scene.add(sky);

    // ---- Camera & third-person orbit controls -------------------------------
    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 500);
    camera.position.set(0, 6, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 6;
    controls.maxDistance = 26;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.minPolarAngle = Math.PI * 0.12;
    controls.target.set(0, 1.4, 12);

    // ---- Lighting -----------------------------------------------------------
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x6a4a2c, 1.45));
    const sun = new THREE.DirectionalLight(0xffcf92, 3.4);
    sun.position.set(38, 44, 26);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 160;
    sun.shadow.camera.left = -60;
    sun.shadow.camera.right = 60;
    sun.shadow.camera.top = 60;
    sun.shadow.camera.bottom = -60;
    sun.shadow.bias = -0.0004;
    scene.add(sun);
    const sunTarget = new THREE.Object3D();
    scene.add(sunTarget);
    sun.target = sunTarget;

    // ---- World & character --------------------------------------------------
    const world = buildCity();
    const startingLocation =
      initialLocation ?? currentRuinId(progressRef.current);
    world.setLocation(startingLocation);
    world.setProgress(progressRef.current);
    scene.add(world.group);

    // The Soldier model's front is its -Z axis, so faced-direction yaw is offset by PI.
    const MODEL_YAW_OFFSET = Math.PI;
    const character = createCharacter();
    character.object.position.copy(world.position(startingLocation, "spawn"));
    try {
      const saved = JSON.parse(
        localStorage.getItem(`${storageKey}:position-v3`) ?? "null",
      );
      if (
        storageKey &&
        saved &&
        typeof saved === "object" &&
        typeof saved.id === "number" &&
        isUnlocked(saved.id, progressRef.current) &&
        Array.isArray(saved.position) &&
        saved.position.length === 3 &&
        saved.position.every(
          (n: unknown) => typeof n === "number" && Number.isFinite(n),
        ) &&
        Math.abs(saved.position[0]) < world.tile / 2 &&
        Math.abs(saved.position[2]) < world.tile / 2
      ) {
        world.setLocation(saved.id);
        if (!world.blocked(saved.position[0], saved.position[2]))
          character.object.position.set(
            saved.position[0],
            world.height(saved.position[0], saved.position[2]),
            saved.position[2],
          );
      }
    } catch {
      /* Position persistence is optional. */
    }
    controls.target
      .copy(character.object.position)
      .add(new THREE.Vector3(0, 1.4, 0));
    const arrival = world
      .position(world.location(), "archive")
      .sub(character.object.position);
    arrival.y = 0;
    arrival.normalize();
    camera.position
      .copy(character.object.position)
      .add(new THREE.Vector3(-arrival.x * 16, 10, -arrival.z * 16));
    character.object.rotation.y =
      Math.atan2(arrival.x, arrival.z) + MODEL_YAW_OFFSET;
    scene.add(character.object);

    // Warm lantern the character carries.
    const playerLamp = new THREE.PointLight(0xffcf8a, 3.2, 8, 2);
    playerLamp.position.set(0, 1.6, 0);
    character.object.add(playerLamp);

    // The current ruin is mirrored across a looping 3x3 grid. Ordinary edges return
    // to the same place; only an opened archive gate advances to another ruin.
    const TILE = world.tile;
    const HALF = TILE / 2;

    let lastProgress = progressRef.current;
    let lastTravel = travelRef.current;
    let lastLocation = 0;
    let lastArchive: number | null = null;
    let lastDiscovery: number | null = null;
    let lastSave = 0;
    let lastStep = 0;
    let autoRoute: Point[] = [];
    let autoRouteAt = -10;
    let autoRouteLocation = 0;
    let autoRouteRestored = false;
    let statsAt = 0,
      statsFrames = 0;
    const guide = createGuideArrows();
    scene.add(guide.group);

    // ---- Postprocessing (bloom) --------------------------------------------
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.55, 0.5, 0.86);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    // ---- Input --------------------------------------------------------------
    const ambience = createAmbience();
    const keys = new Set<string>();
    const isTyping = (target: EventTarget | null) =>
      target instanceof HTMLElement &&
      !!target.closest("textarea,input,select,[contenteditable=true]");
    const onKeyDown = (event: KeyboardEvent) => {
      if (paused.current || isTyping(event.target)) return;
      if (event.code.startsWith("Arrow")) event.preventDefault();
      keys.add(event.code);
      if (event.code === "KeyM") ambience.setEnabled(!ambience.enabled());
      ambience.resume();
    };
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    const clearKeys = () => keys.clear();
    window.addEventListener("blur", clearKeys);

    const onFirstPointer = () => ambience.resume();
    renderer.domElement.addEventListener("pointerdown", onFirstPointer);

    // ---- Resize -------------------------------------------------------------
    const resize = () => {
      const width = host.clientWidth;
      const height = Math.max(host.clientHeight, 1);
      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      bloom.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // ---- Frame loop ---------------------------------------------------------
    const clock = new THREE.Clock();
    let frame = 0;
    let wasNear = false;
    const forward = new THREE.Vector3();
    const right = new THREE.Vector3();
    const move = new THREE.Vector3();
    const nextPos = new THREE.Vector3();
    const prevTarget = new THREE.Vector3().copy(controls.target);
    const desiredTarget = new THREE.Vector3();
    const blocked = (x: number, z: number): boolean => world.blocked(x, z);
    const enterRuin = (id: number) => {
      world.setLocation(id);
      const destination = world.position(id, "spawn");
      const shift = destination.clone().sub(character.object.position);
      character.object.position.copy(destination);
      camera.position.add(shift);
      controls.target.add(shift);
      prevTarget.add(shift);
      lastLocation = 0;
      lastArchive = null;
      lastDiscovery = null;
      wasNear = false;
      autoRoute = [];
      autoRouteAt = -10;
      proximityCallback.current(false);
      events.current.onArchiveNear?.(null);
      events.current.onDiscovery?.(null);
    };

    const animate = () => {
      const delta = Math.min(clock.getDelta(), 0.05);
      const elapsed = clock.elapsedTime;
      if (lastProgress !== progressRef.current) {
        world.setProgress(progressRef.current);
        lastProgress = progressRef.current;
      }
      if (lastTravel !== travelRef.current) {
        lastTravel = travelRef.current;
        if (lastTravel && isUnlocked(lastTravel.id, progressRef.current))
          enterRuin(lastTravel.id);
      }
      if (paused.current) keys.clear();
      ambience.setQuiet(paused.current);
      controls.enabled = !paused.current;

      // Camera-relative movement basis (flattened to ground plane).
      camera.getWorldDirection(forward);
      forward.y = 0;
      forward.normalize();
      // Screen-right = forward x worldUp, so D strafes right, A strafes left.
      right.set(-forward.z, 0, forward.x);

      move.set(0, 0, 0);
      if (keys.has("KeyW") || keys.has("ArrowUp")) move.add(forward);
      if (keys.has("KeyS") || keys.has("ArrowDown")) move.sub(forward);
      if (keys.has("KeyD") || keys.has("ArrowRight")) move.add(right);
      if (keys.has("KeyA") || keys.has("ArrowLeft")) move.sub(right);

      const autoTarget = world.walkTargetFor(character.object.position);
      const autoStopDistance = progressRef.current.includes(world.location())
        ? 0.5
        : 4.6;
      const auto =
        import.meta.env.DEV &&
        autoWalkRef.current &&
        !paused.current &&
        character.object.position.distanceTo(autoTarget) >= autoStopDistance;
      if (auto) {
        const location = world.location();
        const restored = progressRef.current.includes(location);
        if (
          elapsed - autoRouteAt > 1 ||
          autoRouteLocation !== location ||
          autoRouteRestored !== restored ||
          autoRoute.length === 0
        ) {
          autoRoute = findRoute(
            [character.object.position.x, character.object.position.z],
            [autoTarget.x, autoTarget.z],
            blocked,
            3,
            world.canWalk,
          );
          autoRouteAt = elapsed;
          autoRouteLocation = location;
          autoRouteRestored = restored;
        }
        while (
          autoRoute.length > 1 &&
          Math.hypot(
            autoRoute[0][0] - character.object.position.x,
            autoRoute[0][1] - character.object.position.z,
          ) < 1.2
        )
          autoRoute.shift();
        const waypoint = autoRoute[0] ?? [autoTarget.x, autoTarget.z];
        move.set(
          waypoint[0] - character.object.position.x,
          0,
          waypoint[1] - character.object.position.z,
        );
      }
      // Movement is decisive by default; holding Shift gives precise walking.
      // Development auto-walk remains slow enough for visual walkthroughs.
      const walking = keys.has("ShiftLeft") || keys.has("ShiftRight") || auto;
      let speed01 = 0;
      if (move.lengthSq() > 0) {
        move.normalize();
        const speed = walking ? WALK_SPEED : RUN_SPEED;
        speed01 = walking ? 0.5 : 1;
        const pos = character.object.position;
        let nx = pos.x + move.x * speed * delta;
        let nz = pos.z + move.z * speed * delta;
        // Axis-separated sliding collision.
        if (
          blocked(nx, pos.z) ||
          Math.abs(world.height(nx, pos.z) - pos.y) > 0.7
        )
          nx = pos.x;
        if (blocked(nx, nz) || Math.abs(world.height(nx, nz) - pos.y) > 0.7)
          nz = pos.z;
        nextPos.set(nx, world.height(nx, nz), nz);
        pos.copy(nextPos);

        const portal = world.portalDestination(pos);
        if (portal && isUnlocked(portal, progressRef.current)) {
          enterRuin(portal);
          events.current.onPortalEnter?.(portal);
        } else {
          // Keep the player in the central copy. The same ruin continues on every
          // side, so roaming never exposes a future level or an invisible wall.
          const wrapX = pos.x > HALF ? -TILE : pos.x < -HALF ? TILE : 0;
          const wrapZ = pos.z > HALF ? -TILE : pos.z < -HALF ? TILE : 0;
          if (wrapX !== 0 || wrapZ !== 0) {
            pos.x += wrapX;
            pos.z += wrapZ;
            pos.y = world.height(pos.x, pos.z);
            camera.position.x += wrapX;
            camera.position.z += wrapZ;
            controls.target.x += wrapX;
            controls.target.z += wrapZ;
            prevTarget.x += wrapX;
            prevTarget.z += wrapZ;
          }
        }
        // Face travel direction, smoothly (accounting for the model's -Z front).
        const targetYaw = Math.atan2(move.x, move.z) + MODEL_YAW_OFFSET;
        const cur = character.object.rotation.y;
        let diff = targetYaw - cur;
        diff = Math.atan2(Math.sin(diff), Math.cos(diff));
        character.object.rotation.y = cur + diff * Math.min(1, delta * 12);
      }

      character.setLocomotion(speed01);
      character.update(delta);
      const position = character.object.position;
      world.update(elapsed, position);
      sky.position.copy(position);
      const location = world.location();
      if (location !== lastLocation) {
        lastLocation = location;
        ambience.setProfile(world.definition(location).sound);
        events.current.onLocationChange?.(location);
      }
      const archiveId = world.nearArchive(position);
      const near = archiveId !== null;
      if (near !== wasNear) {
        wasNear = near;
        proximityCallback.current(near);
      }
      if (archiveId !== lastArchive) {
        lastArchive = archiveId;
        events.current.onArchiveNear?.(archiveId);
      }
      const discovery = world.discovery(position);
      if ((discovery?.id ?? null) !== lastDiscovery) {
        lastDiscovery = discovery?.id ?? null;
        events.current.onDiscovery?.(discovery);
      }
      const guideTarget = world.targetFor(position, trailTargetRef.current);
      const guideDistance = Math.hypot(
        position.x - guideTarget.x,
        position.z - guideTarget.z,
      );
      guide.update(
        position,
        guideTarget,
        elapsed,
        guideDistance < 4.6,
        guideDistance,
      );
      if (
        !paused.current &&
        speed01 > 0 &&
        elapsed - lastStep > (walking ? 0.45 : 0.28)
      ) {
        ambience.footstep(true);
        lastStep = elapsed;
      }
      if (storageKey && elapsed - lastSave > 2) {
        try {
          localStorage.setItem(
            `${storageKey}:position-v3`,
            JSON.stringify({
              id: world.location(),
              position: position.toArray(),
            }),
          );
        } catch {
          /* Storage is optional. */
        }
        lastSave = elapsed;
      }

      // Keep the shadow frustum centred on the player.
      sunTarget.position.copy(character.object.position);
      sun.position.set(
        character.object.position.x + 38,
        44,
        character.object.position.z + 26,
      );

      // Third-person follow: translate camera & target by the player's move.
      desiredTarget.set(
        character.object.position.x,
        character.object.position.y + 1.5,
        character.object.position.z,
      );
      const shift = desiredTarget.clone().sub(prevTarget);
      camera.position.add(shift);
      controls.target.add(shift);
      prevTarget.copy(controls.target);
      controls.update();

      // Keep score feedback physically attached to the avatar even after the
      // player rotates or zooms the camera.
      const xpElement = xpAnchor?.current;
      if (xpElement) {
        const head = character.object.position
          .clone()
          .add(new THREE.Vector3(0, 2.35, 0))
          .project(camera);
        xpElement.style.left = `${(head.x * 0.5 + 0.5) * host.clientWidth}px`;
        xpElement.style.top = `${(-head.y * 0.5 + 0.5) * host.clientHeight}px`;
      }

      renderer.info.reset();
      composer.render();
      statsFrames++;
      if (elapsed - statsAt >= 2) {
        events.current.onFrameStats?.({
          fps: Math.round(statsFrames / (elapsed - statsAt)),
          calls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
          x: character.object.position.x,
          z: character.object.position.z,
          location: world.location(),
        });
        statsFrames = 0;
        statsAt = elapsed;
      }
      frame = requestAnimationFrame(animate);
    };
    animate();

    // ---- Cleanup ------------------------------------------------------------
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearKeys);
      renderer.domElement.removeEventListener("pointerdown", onFirstPointer);
      controls.dispose();
      ambience.dispose();
      guide.dispose();
      character.dispose();
      world.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const materials = Array.isArray(object.material)
            ? object.material
            : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
    };
  }, []);

  return (
    <div
      ref={hostRef}
      className="ruin-scene"
      aria-label="Explorable repeating ruin with an archive and exit gate"
    />
  );
}
