import { SEA_LEVEL } from '../constants.js';
import { mountainBump, holeBump, shapedFlatten, shapedFalloff } from './shapeFalloff.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Elliptical dome/bump — legacy helper; prefer shapedBump */
function ellipticalBump(x, z, cx, cz, sizeX, sizeZ, amount, power) {
  const sx = Math.max(sizeX, 1);
  const sz = Math.max(sizeZ, 1);
  const dx = x - cx;
  const dz = z - cz;
  const t = (dx / sx) ** 2 + (dz / sz) ** 2;
  if (t >= 1) return 0;
  const falloff = 1 - Math.sqrt(t);
  return amount * Math.pow(falloff, power);
}

function islandLocalXZ(x, z, island) {
  const dx = x - island.centerX;
  const dz = z - island.centerZ;
  const ang = ((island.shapeAngle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(-ang);
  const sin = Math.sin(-ang);
  return {
    lx: dx * cos - dz * sin,
    lz: dx * sin + dz * cos,
  };
}

function islandOutlineOpts(island) {
  const sides = Math.round(island.sides ?? 0);
  let shapeKind = island.shapeKind ?? 'circle';
  if (sides <= 0) shapeKind = 'circle';
  return {
    shapeKind,
    sides,
    ringThickness: island.ringThickness ?? 0.35,
    shapeAngle: 0,
  };
}

function applyCrescentCuts(x, z, mask, island) {
  const crescents = island.crescents ?? [];
  for (const c of crescents) {
    if (c.biteRadius <= 0) continue;
    const ang = (c.biteAngle * Math.PI) / 180;
    const biteCx = island.centerX + Math.sin(ang) * c.biteOffset;
    const biteCz = island.centerZ + Math.cos(ang) * c.biteOffset;
    const bdx = x - biteCx;
    const bdz = z - biteCz;
    const biteDist = Math.sqrt(bdx * bdx + bdz * bdz);
    const biteT = biteDist / c.biteRadius;
    if (biteT < 1) {
      mask = Math.max(0, mask - (1 - biteT * biteT));
    }
  }
  return mask;
}

export function islandMask(x, z, island) {
  const { lx, lz } = islandLocalXZ(x, z, island);
  const stretch = Math.max(1, island.shapeStretch ?? 1);
  const r = island.radius ?? 120;
  let mask = shapedFalloff(lx, lz, r * stretch, r, islandOutlineOpts(island));
  if (mask <= 0) return 0;

  const soft = Math.max(0.02, island.coastSoftness ?? 0.38);
  if (mask < soft) mask = (mask / soft) * (mask / soft) * (3 - 2 * (mask / soft));

  mask = applyCrescentCuts(x, z, mask, island);
  return mask;
}

function oceanDirection(island) {
  const ang = (island.coastAngle * Math.PI) / 180;
  return { x: Math.sin(ang), z: Math.cos(ang) };
}

function baseRolling(x, z, island) {
  const f = island.noiseFrequency;
  return (
    Math.sin(x * f * 1.2) * Math.cos(z * f) * island.noiseAmplitude +
    Math.sin((x + z) * f * 0.7) * island.noiseAmplitude * 0.6
  );
}

function applyCliff(x, z, h, island) {
  const ocean = oceanDirection(island);
  const relX = x - island.centerX;
  const relZ = z - island.centerZ;
  const towardOcean = relX * ocean.x + relZ * ocean.z;
  if (towardOcean <= island.cliffStart) return h;

  const span = island.radius * 0.45;
  const t = smoothstep(island.cliffStart, island.cliffStart + span, towardOcean);
  return h - t * island.cliffDrop - Math.sin(x * 0.06 + z * 0.04) * t * island.cliffRugged;
}

function applyClearings(x, z, h, island) {
  let out = h;
  for (const c of island.clearings) {
    const wx = island.centerX + c.x;
    const wz = island.centerZ + c.z;
    const flat = shapedFlatten(x, z, wx, wz, c);
    if (!flat) continue;
    out = out * flat.blend + flat.target * (1 - flat.blend);
    if (flat.blend < 0.15) out = Math.min(out, flat.target);
  }
  return out;
}

function applyHoles(x, z, h, island) {
  let out = h;
  for (const hole of island.holes ?? []) {
    out -= holeBump(
      x, z,
      island.centerX + hole.x,
      island.centerZ + hole.z,
      hole
    );
  }
  return out;
}

function globalUnderwater(x, z, depth) {
  return SEA_LEVEL - depth + Math.sin(x * 0.05) * 0.5;
}

export function sampleIslandHeight(x, z, island) {
  const mask = islandMask(x, z, island);
  if (mask <= 0.001) return -Infinity;

  let h = island.baseHeight + baseRolling(x, z, island);

  for (const hill of island.hills) {
    h += ellipticalBump(
      x, z,
      island.centerX + hill.x,
      island.centerZ + hill.z,
      hill.sizeX, hill.sizeZ,
      hill.height,
      hill.softness ?? 0.85
    );
  }

  for (const m of island.mountains) {
    h += mountainBump(
      x, z,
      island.centerX + m.x,
      island.centerZ + m.z,
      m
    );
  }

  h = applyCliff(x, z, h, island);
  h = applyHoles(x, z, h, island);
  h = applyClearings(x, z, h, island);
  return h;
}

export function createWorldHeightFn(world) {
  const depth = world.underwaterDepth ?? 10;
  const islands = world.islands ?? [];

  return function getWorldHeight(x, z) {
    let h = -Infinity;
    for (const island of islands) {
      h = Math.max(h, sampleIslandHeight(x, z, island));
    }
    if (h === -Infinity) return globalUnderwater(x, z, depth);
    return h;
  };
}

export function createIslandHeightFn(params) {
  if (params.islands) return createWorldHeightFn(params);
  return createWorldHeightFn({ underwaterDepth: params.underwaterDepth ?? 10, islands: [params] });
}

export function sampleMaxHeight(getHeight, size, segments) {
  const half = size / 2;
  let maxH = SEA_LEVEL;
  const step = size / segments;
  for (let gz = 0; gz <= segments; gz++) {
    for (let gx = 0; gx <= segments; gx++) {
      const x = -half + gx * step;
      const z = -half + gz * step;
      maxH = Math.max(maxH, getHeight(x, z));
    }
  }
  return maxH;
}
