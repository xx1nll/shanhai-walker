import * as THREE from 'three';
import { createPBR, PALETTE } from './materials.js';
import { createGrassBladeTexture } from './textures.js';
import { SEA_LEVEL } from './terrain.js';

/** Natural cypress-like tree — muted, not fluffy spheres */
export function createCoastalTree(variant = 0) {
  const tree = new THREE.Group();
  const trunkMat = createPBR(PALETTE.wood, { roughness: 0.9 });
  const leafMat = createPBR(variant === 1 ? PALETTE.foliageGold : PALETTE.foliage, { roughness: 0.88 });

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 2.5, 8), trunkMat);
  trunk.position.y = 1.25;
  trunk.castShadow = true;
  tree.add(trunk);

  // Layered conical foliage — softer than sphere clusters
  [2.8, 3.8, 4.6].forEach((y, i) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(1.6 - i * 0.35, 1.8, 10),
      leafMat
    );
    cone.position.y = y;
    cone.castShadow = true;
    tree.add(cone);
  });

  return tree;
}

export function scatterCoastalTrees(scene, getHeight, count = 45) {
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 200;
    const z = 10 + Math.random() * 80;
    const y = getHeight(x, z);
    if (y < SEA_LEVEL + 2 || y > 18) continue;

    const tree = createCoastalTree(Math.random() > 0.92 ? 1 : 0);
    tree.position.set(x, y, z);
    tree.rotation.y = Math.random() * Math.PI * 2;
    tree.scale.setScalar(0.8 + Math.random() * 0.6);
    scene.add(tree);
  }
}

export function scatterCliffRocks(scene, getHeight, count = 35) {
  const rockMat = createPBR(PALETTE.rock, { roughness: 0.95 });
  const geo = new THREE.DodecahedronGeometry(1, 1);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 220;
    const z = -30 + Math.random() * 50;
    const y = getHeight(x, z);
    if (y > SEA_LEVEL + 6) continue;

    const rock = new THREE.Mesh(geo, rockMat);
    const s = 0.5 + Math.random() * 2.5;
    rock.scale.set(s * 1.3, s, s * 0.9);
    rock.position.set(x, y + s * 0.2, z);
    rock.rotation.set(Math.random(), Math.random(), Math.random());
    rock.castShadow = true;
    scene.add(rock);
  }
}

/** Dense foreground grass — muted, natural (async batched version) */
export async function createGrassFieldAsync(scene, getHeight, onProgress) {
  const tex = createGrassBladeTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaMap: tex,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
    color: 0x6a8058,
    depthWrite: false,
  });

  const bladeGeo = new THREE.PlaneGeometry(0.45, 0.9);
  bladeGeo.translate(0, 0.45, 0);
  const maxCount = 2200;
  const mesh = new THREE.InstancedMesh(bladeGeo, mat, maxCount);
  const dummy = new THREE.Object3D();
  let idx = 0;
  const attempts = maxCount * 2;
  const batchSize = 400;

  for (let start = 0; start < attempts && idx < maxCount; start += batchSize) {
    const end = Math.min(start + batchSize, attempts);
    for (let i = start; i < end && idx < maxCount; i++) {
      const x = (Math.random() - 0.5) * 180;
      const z = 5 + Math.random() * 70;
      const y = getHeight(x, z);
      if (y < SEA_LEVEL + 1.5 || y > 16) continue;

      dummy.position.set(x, y, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.rotation.x = (Math.random() - 0.5) * 0.12;
      dummy.scale.set(0.5 + Math.random() * 0.6, 0.7 + Math.random() * 0.9, 1);
      dummy.updateMatrix();
      mesh.setMatrixAt(idx++, dummy.matrix);
    }
    onProgress?.(end / attempts);
    await new Promise((r) => requestAnimationFrame(r));
  }

  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}

/** Sync fallback */
export function createGrassField(scene, getHeight) {
  const tex = createGrassBladeTexture();
  const mat = new THREE.MeshStandardMaterial({
    map: tex,
    alphaMap: tex,
    transparent: true,
    alphaTest: 0.4,
    side: THREE.DoubleSide,
    roughness: 0.95,
    metalness: 0,
    color: 0x6a8058,
    depthWrite: false,
  });

  const bladeGeo = new THREE.PlaneGeometry(0.45, 0.9);
  bladeGeo.translate(0, 0.45, 0);
  const count = 2200;
  const mesh = new THREE.InstancedMesh(bladeGeo, mat, count);
  const dummy = new THREE.Object3D();
  let idx = 0;

  for (let i = 0; i < count * 2 && idx < count; i++) {
    const x = (Math.random() - 0.5) * 180;
    const z = 5 + Math.random() * 70;
    const y = getHeight(x, z);
    if (y < SEA_LEVEL + 1.5 || y > 16) continue;

    dummy.position.set(x, y, z);
    dummy.rotation.y = Math.random() * Math.PI * 2;
    dummy.rotation.x = (Math.random() - 0.5) * 0.12;
    dummy.scale.set(0.5 + Math.random() * 0.6, 0.7 + Math.random() * 0.9, 1);
    dummy.updateMatrix();
    mesh.setMatrixAt(idx++, dummy.matrix);
  }

  mesh.count = idx;
  mesh.instanceMatrix.needsUpdate = true;
  scene.add(mesh);
  return mesh;
}
