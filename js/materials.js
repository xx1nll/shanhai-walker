import * as THREE from 'three';

/** Soft stylized PBR — painterly, desaturated, no cel bands */
export function createPBR(color, options = {}) {
  const {
    roughness = 0.82,
    metalness = 0.0,
    emissive = 0x000000,
    emissiveIntensity = 0,
    map = null,
    normalScale = 1,
    transparent = false,
    opacity = 1,
    side = THREE.FrontSide,
  } = options;

  return new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness,
    metalness,
    emissive: new THREE.Color(emissive),
    emissiveIntensity,
    map,
    transparent,
    opacity,
    side,
  });
}

export const PALETTE = {
  grass: 0x5a7a48,
  grassLight: 0x6d8f58,
  grassDark: 0x4a6340,
  cliff: 0x8a8070,
  cliffDark: 0x6a6058,
  rock: 0x7a7570,
  wood: 0x5c4a38,
  foliage: 0x4a6a42,
  foliageGold: 0xc8a850,
  skin: 0xd4b8a0,
  robe: 0x3a4a5a,
  water: 0x3a6a8a,
};
