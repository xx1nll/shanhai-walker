import * as THREE from 'three';
import { createPBR } from './materials.js';

export const FUSANG_POS = { x: 143, z: 12 };

const TRUNK_HEIGHT = 72;
const TRUNK_RADIUS = 6.5;

function makeStrandTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  const g = ctx.createLinearGradient(8, 0, 8, 64);
  g.addColorStop(0, 'rgba(180,220,120,0)');
  g.addColorStop(0.15, 'rgba(160,200,100,0.9)');
  g.addColorStop(0.7, 'rgba(120,180,80,0.85)');
  g.addColorStop(1, 'rgba(80,140,60,0.3)');
  ctx.fillStyle = g;
  ctx.fillRect(4, 0, 8, 64);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addWeepingBranch(group, startY, angle, reach, drop, mats, strandMat) {
  const { bark, glowBark } = mats;
  const sx = Math.sin(angle) * 2;
  const sz = Math.cos(angle) * 2;
  const ex = Math.sin(angle) * reach;
  const ez = Math.cos(angle) * reach;
  const endY = startY - drop;

  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(sx, startY, sz),
    new THREE.Vector3(ex * 0.35, startY - drop * 0.15, ez * 0.35),
    new THREE.Vector3(ex * 0.7, startY - drop * 0.45, ez * 0.7),
    new THREE.Vector3(ex, endY, ez),
  ]);

  const tube = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 24, 0.55, 8, false),
    Math.random() > 0.5 ? bark : glowBark
  );
  tube.castShadow = true;
  group.add(tube);

  // Hanging strands along branch
  const strandCount = 18 + Math.floor(reach * 0.8);
  for (let i = 0; i < strandCount; i++) {
    const t = 0.35 + Math.random() * 0.65;
    const pt = curve.getPoint(t);
    const len = 6 + Math.random() * 14;
    const strand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.12 + Math.random() * 0.08, len),
      strandMat
    );
    strand.position.copy(pt);
    strand.position.x += (Math.random() - 0.5) * 1.5;
    strand.position.z += (Math.random() - 0.5) * 1.5;
    strand.rotation.x = (Math.random() - 0.5) * 0.3 + 0.15;
    strand.rotation.y = angle + (Math.random() - 0.5) * 0.5;
    strand.userData.phase = Math.random() * Math.PI * 2;
    strand.userData.amp = 0.04 + Math.random() * 0.06;
    group.add(strand);
  }

  return { endX: ex, endY, endZ: ez, midX: ex * 0.5, midY: startY - drop * 0.35, midZ: ez * 0.5 };
}

/**
 * 扶桑 — divine weeping willow where the sun rests.
 * 《大荒东经》汤谷扶木，百丈其枝，下垂如盖。
 */
export function createFusang(getHeight, colliders) {
  const { x, z } = FUSANG_POS;
  const baseY = getHeight(x, z);
  const group = new THREE.Group();
  group.name = 'fusang';
  group.position.set(x, baseY, z);

  const mats = {
    bark: createPBR(0x3a2818, { roughness: 0.95 }),
    glowBark: createPBR(0x4a3828, { roughness: 0.9, emissive: 0x1a1008, emissiveIntensity: 0.08 }),
    root: createPBR(0x2a1a10, { roughness: 0.98 }),
    sun: createPBR(0xfff0c0, { roughness: 0.2, emissive: 0xffb040, emissiveIntensity: 1.0 }),
    sunCorona: createPBR(0xffe080, {
      roughness: 0.1,
      emissive: 0xff9020,
      emissiveIntensity: 0.6,
      transparent: true,
      opacity: 0.45,
    }),
  };

  const strandTex = makeStrandTexture();
  const strandMat = new THREE.MeshStandardMaterial({
    map: strandTex,
    alphaMap: strandTex,
    transparent: true,
    alphaTest: 0.15,
    side: THREE.DoubleSide,
    roughness: 0.9,
    metalness: 0,
    color: 0xa8d878,
    emissive: 0x406020,
    emissiveIntensity: 0.15,
    depthWrite: false,
  });

  // Buttress roots — massive, spreading
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    const root = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 3.5, 8, 8),
      mats.root
    );
    root.position.set(Math.sin(angle) * 10, 3, Math.cos(angle) * 10);
    root.rotation.z = Math.cos(angle) * 0.55;
    root.rotation.x = Math.sin(angle) * 0.55;
    root.castShadow = true;
    group.add(root);
  }

  // Main trunk — colossal
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(TRUNK_RADIUS * 0.55, TRUNK_RADIUS, TRUNK_HEIGHT, 20),
    mats.bark
  );
  trunk.position.y = TRUNK_HEIGHT / 2;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  group.add(trunk);

  // Trunk buttress flutes
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * Math.PI * 2;
    const flute = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, TRUNK_HEIGHT * 0.85, 2.5),
      mats.glowBark
    );
    flute.position.set(Math.sin(angle) * (TRUNK_RADIUS - 0.5), TRUNK_HEIGHT * 0.42, Math.cos(angle) * (TRUNK_RADIUS - 0.5));
    flute.rotation.y = angle;
    group.add(flute);
  }

  // Upper crown hub where branches radiate
  const crownY = TRUNK_HEIGHT - 4;
  const hub = new THREE.Mesh(new THREE.SphereGeometry(5, 14, 12), mats.glowBark);
  hub.position.y = crownY;
  hub.scale.y = 0.7;
  group.add(hub);

  // Weeping branches — 14 massive limbs
  const branchEnds = [];
  const branchCount = 14;
  for (let i = 0; i < branchCount; i++) {
    const angle = (i / branchCount) * Math.PI * 2 + 0.2;
    const reach = 22 + Math.random() * 16;
    const drop = 18 + Math.random() * 22;
    const end = addWeepingBranch(group, crownY, angle, reach, drop, mats, strandMat);
    branchEnds.push(end);
  }

  // Inner curtain of strands from crown
  for (let i = 0; i < 120; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 3 + Math.random() * 12;
    const len = 12 + Math.random() * 28;
    const strand = new THREE.Mesh(
      new THREE.PlaneGeometry(0.1, len),
      strandMat
    );
    strand.position.set(Math.sin(angle) * dist, crownY - Math.random() * 8, Math.cos(angle) * dist);
    strand.rotation.y = angle;
    strand.userData.phase = Math.random() * Math.PI * 2;
    strand.userData.amp = 0.03 + Math.random() * 0.05;
    group.add(strand);
  }

  // Sun orb — nested in crown
  const sunY = crownY + 6;
  const sunOrb = new THREE.Mesh(new THREE.SphereGeometry(4, 24, 20), mats.sun);
  sunOrb.position.y = sunY;
  group.add(sunOrb);

  const corona = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), mats.sunCorona);
  corona.position.y = sunY;
  group.add(corona);

  const sunLight = new THREE.PointLight(0xffc870, 8, 120);
  sunLight.position.y = sunY;
  group.add(sunLight);

  const fillLight = new THREE.PointLight(0x80c060, 2, 60);
  fillLight.position.y = crownY;
  group.add(fillLight);

  // Ground mist ring
  const mist = new THREE.Mesh(
    new THREE.RingGeometry(14, 28, 32),
    new THREE.MeshBasicMaterial({ color: 0xc8e8c0, transparent: true, opacity: 0.12, side: THREE.DoubleSide })
  );
  mist.rotation.x = -Math.PI / 2;
  mist.position.y = 0.3;
  group.add(mist);

  // 金乌 silhouettes among branches
  const crowMat = createPBR(0x100810, { roughness: 0.9 });
  for (let i = 0; i < 6; i++) {
    const b = branchEnds[i * 2];
    if (!b) continue;
    const crow = new THREE.Mesh(new THREE.SphereGeometry(0.5, 6, 6), crowMat);
    crow.scale.set(1.4, 0.9, 1.2);
    crow.position.set(b.midX, b.midY + 2, b.midZ);
    group.add(crow);
  }

  // Platforms — only on 2 thick mid-branch knots (must jump/climb to reach)
  const platformSpots = [
    { bx: branchEnds[1]?.midX ?? 12, by: branchEnds[1]?.midY ?? 50, bz: branchEnds[1]?.midZ ?? 8, r: 4 },
    { bx: branchEnds[5]?.midX ?? -10, by: branchEnds[5]?.midY ?? 48, bz: branchEnds[5]?.midZ ?? -12, r: 4 },
  ];
  platformSpots.forEach((spot, i) => {
    colliders.registerPlatform({
      id: `fusang_branch_${i}`,
      x: x + spot.bx,
      z: z + spot.bz,
      y: baseY + spot.by,
      radius: spot.r,
      label: '扶桑枝',
    });
  });

  colliders.registerPlatform({
    id: 'fusang_crown',
    x,
    z,
    y: baseY + sunY - 2,
    radius: 6,
    label: '扶桑冠',
  });

  const climbable = colliders.registerClimbable({
    id: 'fusang',
    x,
    z,
    baseY,
    radius: TRUNK_RADIUS + 1,
    height: TRUNK_HEIGHT,
    mesh: group,
    label: '扶桑',
  });

  // Solid hitboxes — cannot walk through trunk or root mass
  colliders.registerSolid({
    id: 'fusang_trunk',
    x,
    z,
    minY: baseY,
    maxY: baseY + TRUNK_HEIGHT,
    radius: TRUNK_RADIUS + 0.8,
    label: '扶桑干',
  });

  colliders.registerSolid({
    id: 'fusang_root_bowl',
    x,
    z,
    minY: baseY,
    maxY: baseY + 14,
    radius: 13,
    label: '扶桑根',
  });

  // Crown mass — blocks entering canopy hub from above when gliding/falling
  colliders.registerSolid({
    id: 'fusang_crown_mass',
    x,
    z,
    minY: baseY + crownY - 3,
    maxY: baseY + sunY + 5,
    radius: 8,
    label: '扶桑冠',
  });

  // Label
  const labelCanvas = document.createElement('canvas');
  labelCanvas.width = 256;
  labelCanvas.height = 64;
  const ctx = labelCanvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,30,15,0.75)';
  ctx.fillRect(0, 0, 256, 64);
  ctx.fillStyle = '#d8f0a0';
  ctx.font = 'bold 32px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('扶桑', 128, 32);
  const label = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(labelCanvas), transparent: true })
  );
  label.scale.set(16, 4, 1);
  label.position.y = sunY + 10;
  group.add(label);

  // Collect strands for wind animation
  const strands = [];
  group.traverse((child) => {
    if (child.userData?.phase !== undefined) strands.push(child);
  });

  group.userData.climbable = climbable;
  group.userData.animate = (t) => {
    sunOrb.scale.setScalar(1 + Math.sin(t * 1.2) * 0.035);
    corona.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);
    corona.rotation.y = t * 0.05;
    sunLight.intensity = 8 + Math.sin(t * 1.5) * 1;
    mist.scale.setScalar(1 + Math.sin(t * 0.4) * 0.04);
    strands.forEach((s) => {
      s.rotation.z = Math.sin(t * 1.2 + s.userData.phase) * s.userData.amp;
    });
  };

  return { group, climbable, baseY, trunkHeight: TRUNK_HEIGHT };
}
