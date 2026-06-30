import * as THREE from 'three';
import { shapedFalloff, getShapeOpts } from './shapeFalloff.js';

const DEFAULT_ROCK = new THREE.Color(0x8a7a6a);

export function parseColorHex(value, fallback = DEFAULT_ROCK) {
  if (value == null) return fallback.clone();
  if (typeof value === 'number') return new THREE.Color(value);
  const s = String(value).replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return new THREE.Color(`#${s}`);
  return fallback.clone();
}

/** Sample mountain tint weight + color at world XZ */
export function sampleMountainTint(x, z, world) {
  let best = 0;
  const out = new THREE.Color(0, 0, 0);

  for (const island of world?.islands ?? []) {
    for (const m of island.mountains ?? []) {
      const wx = island.centerX + m.x;
      const wz = island.centerZ + m.z;
      const falloff = shapedFalloff(
        x - wx, z - wz,
        m.sizeX, m.sizeZ,
        getShapeOpts(m)
      );
      const steep = m.steepness ?? 2.5;
      const weight = falloff * (0.35 + Math.min(steep, 5) * 0.12);
      if (weight > best) {
        best = weight;
        out.copy(parseColorHex(m.color, DEFAULT_ROCK));
      }
    }
  }

  return { weight: Math.min(1, best), color: out };
}

export function createMountainColorFn(world) {
  return (x, z) => sampleMountainTint(x, z, world);
}

export function bakeTerrainVertexColors(geometry, colorFn) {
  const positions = geometry.attributes.position;
  const colors = new Float32Array(positions.count * 3);

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const { weight, color } = colorFn(x, z);
    const i3 = i * 3;
    colors[i3] = color.r * weight;
    colors[i3 + 1] = color.g * weight;
    colors[i3 + 2] = color.b * weight;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/** Zero tint attribute — required by terrain shader even when no mountains */
export function bakeEmptyVertexColors(geometry) {
  const count = geometry.attributes.position.count;
  geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(count * 3), 3));
}

export function applyTerrainColors(geometry, colorFn) {
  if (colorFn) bakeTerrainVertexColors(geometry, colorFn);
  else bakeEmptyVertexColors(geometry);
}
