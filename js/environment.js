import * as THREE from 'three';
import { createPBR, PALETTE } from './materials.js';
import { SEA_LEVEL } from './terrain.js';

/** Distant island silhouettes in atmospheric haze */
export function createDistantIslands() {
  const group = new THREE.Group();
  const islandMat = createPBR(0x5a6a58, { roughness: 0.95 });

  const islands = [
    { x: -120, z: -180, r: 25, h: 12 },
    { x: 60, z: -220, r: 35, h: 18 },
    { x: -40, z: -280, r: 20, h: 8 },
    { x: 150, z: -200, r: 18, h: 10 },
  ];

  islands.forEach(({ x, z, r, h }) => {
    const geo = new THREE.ConeGeometry(r, h, 12);
    const island = new THREE.Mesh(geo, islandMat);
    island.position.set(x, SEA_LEVEL + h * 0.4, z);
    island.castShadow = false;
    island.receiveShadow = false;
    group.add(island);

    // Small tree silhouette on some islands
    if (r > 22) {
      const tree = createGoldenTree(0.6);
      tree.position.set(x, SEA_LEVEL + h * 0.75, z);
      group.add(tree);
    }
  });

  return group;
}

/** Sea stacks — vertical rock spires jutting from ocean */
export function createSeaStacks() {
  const group = new THREE.Group();
  const rockMat = createPBR(PALETTE.cliff, { roughness: 0.92 });

  const stacks = [
    { x: -50, z: -90, h: 22, w: 3 },
    { x: -30, z: -110, h: 35, w: 4 },
    { x: 20, z: -100, h: 28, w: 3.5 },
    { x: 70, z: -130, h: 18, w: 2.5 },
    { x: -80, z: -140, h: 15, w: 2 },
  ];

  stacks.forEach(({ x, z, h, w }) => {
    const geo = new THREE.CylinderGeometry(w * 0.6, w, h, 8);
    const stack = new THREE.Mesh(geo, rockMat);
    stack.position.set(x, SEA_LEVEL + h * 0.45, z);
    stack.castShadow = true;

    // Tapered top
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(w * 0.8, h * 0.2, 8),
      rockMat
    );
    top.position.set(x, SEA_LEVEL + h * 0.95, z);
    group.add(stack, top);
  });

  return group;
}

/** Golden-leaved sacred tree — distant landmark like Genshin's vista trees */
export function createGoldenTree(scale = 1) {
  const tree = new THREE.Group();
  const trunkMat = createPBR(0x4a3828, { roughness: 0.9 });
  const goldMat = createPBR(PALETTE.foliageGold, {
    roughness: 0.75,
    emissive: 0x8a6020,
    emissiveIntensity: 0.08,
  });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.5 * scale, 4 * scale, 8), trunkMat);
  trunk.position.y = 2 * scale;
  tree.add(trunk);

  [4.5, 6, 7.2].forEach((y, i) => {
    const crown = new THREE.Mesh(
      new THREE.SphereGeometry((2.2 - i * 0.4) * scale, 10, 8),
      goldMat
    );
    crown.position.y = y * scale;
    crown.scale.y = 0.7;
    tree.add(crown);
  });

  const glow = new THREE.PointLight(0xffcc66, 0.8, 30 * scale);
  glow.position.y = 6 * scale;
  tree.add(glow);

  return tree;
}

/** Place the hero golden tree on a mid-distance island */
export function createVistaLandmark() {
  const group = new THREE.Group();
  const islandMat = createPBR(0x5a6850, { roughness: 0.9 });

  const island = new THREE.Mesh(new THREE.CylinderGeometry(12, 16, 6, 16), islandMat);
  island.position.set(-30, SEA_LEVEL + 2, -140);
  group.add(island);

  const tree = createGoldenTree(1.4);
  tree.position.set(-30, SEA_LEVEL + 5, -140);
  group.add(tree);

  return group;
}
