import { SEA_LEVEL } from '../constants.js';

function smoothstep(edge0, edge1, x) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Elliptical dome/bump — power <1 = gentle hill, power >2 = sharp peak */
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

function ellipseDistance(x, z, island) {
  const dx = x - island.centerX;
  const dz = z - island.centerZ;
  const ang = (island.shapeAngle * Math.PI) / 180;
  const rx = dx * Math.cos(ang) + dz * Math.sin(ang);
  const rz = -dx * Math.sin(ang) + dz * Math.cos(ang);
  const stretch = Math.max(1, island.shapeStretch);
  return Math.sqrt((rx / stretch) ** 2 + rz ** 2);
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
  const dist = ellipseDistance(x, z, island);
  const t = dist / island.radius;
  if (t >= 1) return 0;

  const soft = Math.max(0.02, island.coastSoftness);
  let mask = t > 1 - soft ? (1 - t) / soft : 1;
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
    const dx = x - wx;
    const dz = z - wz;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < c.radius) {
      const edge = dist > c.radius - 3 ? smoothstep(c.radius - 3, c.radius, dist) : 0;
      out = out * edge + c.maxHeight * (1 - edge);
      if (dist <= c.radius - 3) out = Math.min(out, c.maxHeight);
    }
  }
  return out;
}

function applyHoles(x, z, h, island) {
  let out = h;
  for (const hole of island.holes ?? []) {
    const wx = island.centerX + hole.x;
    const wz = island.centerZ + hole.z;
    const cut = ellipticalBump(
      x, z, wx, wz,
      hole.sizeX, hole.sizeZ,
      hole.depth,
      hole.steepness ?? 2
    );
    out -= cut;
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
    h += ellipticalBump(
      x, z,
      island.centerX + m.x,
      island.centerZ + m.z,
      m.sizeX, m.sizeZ,
      m.height,
      m.steepness ?? 2.5
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
