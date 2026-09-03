import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export interface Character {
  /** Root object the scene positions and rotates. */
  object: THREE.Group;
  /** Resolves once the model and its clips are loaded. */
  ready: Promise<void>;
  /** Drive locomotion blend: 0 = idle, up to 1 = full run. */
  setLocomotion: (speed01: number) => void;
  update: (delta: number) => void;
  dispose: () => void;
}

const MODEL_URL = `${import.meta.env.BASE_URL}models/soldier.glb`;
const TARGET_HEIGHT = 1.9;

export function createCharacter(): Character {
  const object = new THREE.Group();
  let mixer: THREE.AnimationMixer | null = null;
  const actions: Partial<Record<"idle" | "walk" | "run", THREE.AnimationAction>> = {};
  let target = { idle: 1, walk: 0, run: 0 };
  const current = { idle: 1, walk: 0, run: 0 };

  const loader = new GLTFLoader();
  const ready = new Promise<void>((resolve) => {
    loader.load(
      MODEL_URL,
      (gltf) => {
        const model = gltf.scene;
        model.traverse((node) => {
          if ((node as THREE.Mesh).isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
            const mesh = node as THREE.Mesh;
            const mat = mesh.material as THREE.MeshStandardMaterial;
            if (mat) mat.metalness = Math.min(mat.metalness ?? 0, 0.1);
          }
        });

        // Normalize height so the character stands ~1.9m regardless of source scale.
        const box = new THREE.Box3().setFromObject(model);
        const size = new THREE.Vector3();
        box.getSize(size);
        const scale = size.y > 0 ? TARGET_HEIGHT / size.y : 1;
        model.scale.setScalar(scale);
        model.position.y = 0;

        object.add(model);

        mixer = new THREE.AnimationMixer(model);
        const byName = (name: string) =>
          gltf.animations.find((clip) => clip.name.toLowerCase() === name);
        const idleClip = byName("idle") ?? gltf.animations[0];
        const walkClip = byName("walk") ?? gltf.animations[1] ?? idleClip;
        const runClip = byName("run") ?? gltf.animations[2] ?? walkClip;

        if (idleClip) actions.idle = mixer.clipAction(idleClip);
        if (walkClip) actions.walk = mixer.clipAction(walkClip);
        if (runClip) actions.run = mixer.clipAction(runClip);
        for (const action of Object.values(actions)) {
          action.play();
          action.enabled = true;
          action.setEffectiveWeight(0);
        }
        if (actions.idle) actions.idle.setEffectiveWeight(1);
        resolve();
      },
      undefined,
      (error) => {
        // Fall back to a simple stand-in so the game still runs offline.
        console.error("Character model failed to load; using placeholder.", error);
        const stand = new THREE.Mesh(
          new THREE.CapsuleGeometry(0.32, 1.1, 4, 8),
          new THREE.MeshStandardMaterial({ color: 0x8a9a5b, roughness: 0.8 }),
        );
        stand.position.y = 0.9;
        stand.castShadow = true;
        object.add(stand);
        resolve();
      },
    );
  });

  const setLocomotion = (speed01: number) => {
    const s = THREE.MathUtils.clamp(speed01, 0, 1);
    if (s < 0.02) target = { idle: 1, walk: 0, run: 0 };
    else if (s < 0.6) target = { idle: 0, walk: 1 - (s / 0.6) * 0.5, run: 0 };
    else target = { idle: 0, walk: 1 - (s - 0.6) / 0.4, run: (s - 0.6) / 0.4 };
  };

  const update = (delta: number) => {
    if (!mixer) return;
    // Smoothly approach target weights for seamless blends.
    const k = 1 - Math.pow(0.001, delta);
    current.idle += (target.idle - current.idle) * k;
    current.walk += (target.walk - current.walk) * k;
    current.run += (target.run - current.run) * k;
    actions.idle?.setEffectiveWeight(current.idle);
    actions.walk?.setEffectiveWeight(current.walk);
    actions.run?.setEffectiveWeight(current.run);
    mixer.update(delta);
  };

  const dispose = () => {
    mixer?.stopAllAction();
    object.traverse((node) => {
      const mesh = node as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.geometry?.dispose();
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => mat?.dispose());
      }
    });
  };

  return { object, ready, setLocomotion, update, dispose };
}
