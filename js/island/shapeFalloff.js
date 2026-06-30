/** 2D shape masks + mountain mesa profiles */

function smooth01(t) {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

function polygonRadius(theta, sides) {
  const n = Math.max(3, sides);
  const sector = (2 * Math.PI) / n;
  let a = theta;
  a = ((a % sector) + sector) % sector;
  if (a > sector / 2) a = sector - a;
  return Math.cos(Math.PI / n) / Math.cos(a);
}

function starRadius(theta, points) {
  const n = Math.max(3, points);
  const inner = 0.42;
  const wave = (Math.cos(theta * n) + 1) * 0.5;
  return inner + (1 - inner) * wave;
}

/**
 * @returns 0..1 falloff inside shape (1 = center)
 */
export function shapedFalloff(localX, localZ, sizeX, sizeZ, opts = {}) {
  const sx = Math.max(sizeX, 1);
  const sz = Math.max(sizeZ, 1);
  let dx = localX / sx;
  let dz = localZ / sz;

  const rot = ((opts.shapeAngle ?? 0) * Math.PI) / 180;
  const cos = Math.cos(-rot);
  const sin = Math.sin(-rot);
  const rx = dx * cos - dz * sin;
  const rz = dx * sin + dz * cos;
  dx = rx;
  dz = rz;

  const r = Math.sqrt(dx * dx + dz * dz);
  const sides = Math.round(opts.sides ?? 0);
  let kind = opts.shapeKind ?? 'circle';

  if (r < 1e-5) {
    if (kind === 'ring' && sides > 0) return 0;
    return 1;
  }

  if (kind === 'circle' || sides <= 0) {
    const t = dx * dx + dz * dz;
    if (t >= 1) return 0;
    return 1 - Math.sqrt(t);
  }

  const theta = Math.atan2(dz, dx);

  if (kind === 'polygon') {
    const edge = polygonRadius(theta, sides);
    if (r >= edge) return 0;
    return 1 - r / edge;
  }

  if (kind === 'star') {
    const edge = starRadius(theta, sides);
    if (r >= edge) return 0;
    return 1 - r / edge;
  }

  if (kind === 'ring') {
    const outer = polygonRadius(theta, sides);
    const thick = Math.max(0.08, Math.min(0.85, opts.ringThickness ?? 0.35));
    const inner = outer * (1 - thick);
    if (r > outer || r < inner) return 0;
    const edgeW = Math.max(0.04, thick * 0.2);
    const outerEdge = smooth01((outer - r) / edgeW);
    const innerEdge = smooth01((r - inner) / edgeW);
    return outerEdge * innerEdge;
  }

  const t = dx * dx + dz * dz;
  if (t >= 1) return 0;
  return 1 - Math.sqrt(t);
}

export function getShapeOpts(feature) {
  return {
    shapeKind: feature.shapeKind ?? 'circle',
    sides: feature.sides ?? 0,
    ringThickness: feature.ringThickness ?? 0.35,
    shapeAngle: feature.shapeAngle ?? 0,
  };
}

/** Dig / subtract shaped depression */
export function shapedBump(x, z, cx, cz, sizeX, sizeZ, amount, power, shapeOpts) {
  const falloff = shapedFalloff(x - cx, z - cz, sizeX, sizeZ, shapeOpts);
  if (falloff <= 0) return 0;
  return amount * Math.pow(falloff, Math.max(0.3, power));
}

/**
 * Mountain with 尖頭 (0) → 圓頭平地 (1).
 * Shape fields define the flat top footprint; slopes rise outside the plateau.
 */
export function mountainBump(x, z, cx, cz, m) {
  const falloff = shapedFalloff(
    x - cx, z - cz,
    m.sizeX, m.sizeZ,
    getShapeOpts(m)
  );
  if (falloff <= 0) return 0;

  const round = Math.max(0, Math.min(1, m.peakRoundness ?? 0));
  const steep = Math.max(0.3, m.steepness ?? 2.5);
  const sharp = Math.pow(falloff, steep);

  if (round < 0.001) return m.height * sharp;

  const flatFrac = 0.06 + round * 0.84;
  const plateauEdge = 1 - flatFrac;

  let mesa;
  if (falloff >= plateauEdge) {
    mesa = 1;
  } else {
    const t = falloff / Math.max(plateauEdge, 0.001);
    const wallPower = steep * (1 - round * 0.45) + 0.35;
    mesa = Math.pow(t, wallPower);
  }

  const profile = sharp * (1 - round) + mesa * round;
  return m.height * profile;
}

/** Inverted mountain profile — bowl / crater (defaults to rounded floor). */
export function holeBump(x, z, cx, cz, hole) {
  return mountainBump(x, z, cx, cz, {
    height: hole.depth,
    sizeX: hole.sizeX,
    sizeZ: hole.sizeZ,
    peakRoundness: hole.peakRoundness ?? 0.7,
    steepness: hole.steepness ?? 1.5,
    shapeKind: hole.shapeKind,
    sides: hole.sides,
    ringThickness: hole.ringThickness,
    shapeAngle: hole.shapeAngle,
  });
}

/** Flatten terrain to maxHeight inside shaped footprint */
export function shapedFlatten(x, z, cx, cz, c) {
  const mask = shapedFalloff(x - cx, z - cz, c.sizeX, c.sizeZ, getShapeOpts(c));
  if (mask <= 0) return null;
  const edge = mask < 0.18 ? smooth01(mask / 0.18) : 1;
  return { blend: 1 - edge, target: c.maxHeight };
}
