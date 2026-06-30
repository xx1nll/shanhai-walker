import * as THREE from 'three';
import { createGrassTexture, createCliffTexture, createDirtTexture } from './textures.js';
import { createWorldHeightFn, sampleMaxHeight } from './island/islandGenerator.js';
import { PRESET_DEFAULT } from './island/islandParams.js';
import { SEA_LEVEL } from './constants.js';
import { yieldFrame } from './loading.js';

export { SEA_LEVEL };

export const TERRAIN_SIZE = 500;
export const TERRAIN_SEGMENTS = 112;

const terrainVertexShader = `
  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vSlope;

  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorldPos = wp.xyz;
    vNormal = normalize(mat3(modelMatrix) * normal);
    vHeight = wp.y;
    vSlope = 1.0 - abs(dot(vNormal, vec3(0.0, 1.0, 0.0)));
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const terrainFragmentShader = `
  uniform sampler2D uGrassTex;
  uniform sampler2D uCliffTex;
  uniform sampler2D uDirtTex;
  uniform float uMaxHeight;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uAmbientColor;
  uniform float uSeaLevel;

  varying vec3 vWorldPos;
  varying vec3 vNormal;
  varying float vHeight;
  varying float vSlope;

  void main() {
    float heightT = clamp((vHeight - uSeaLevel) / uMaxHeight, 0.0, 1.0);

    vec3 grass = texture2D(uGrassTex, vWorldPos.xz * 0.06).rgb;
    vec3 cliff = texture2D(uCliffTex, vWorldPos.xz * 0.04).rgb;
    vec3 dirt  = texture2D(uDirtTex,  vWorldPos.xz * 0.08).rgb;

    float grassW = smoothstep(0.5, 0.05, vSlope) * smoothstep(uSeaLevel + 1.0, uSeaLevel + 8.0, vHeight);
    float cliffW = smoothstep(0.2, 0.55, vSlope) + smoothstep(0.3, 0.0, heightT) * 0.6;
    float dirtW  = smoothstep(0.1, 0.3, vSlope) * grassW * 0.4;

    float total = grassW + cliffW + dirtW + 0.001;
    vec3 albedo = (grass * grassW + cliff * cliffW + dirt * dirtW) / total;

    float lum = dot(albedo, vec3(0.299, 0.587, 0.114));
    albedo = mix(vec3(lum), albedo, 0.72);

    vec3 N = normalize(vNormal);
    float NdotL = max(dot(N, uSunDir), 0.0);
    float wrap = max(dot(N, uSunDir) * 0.5 + 0.5, 0.0);
    float diffuse = mix(NdotL, wrap, 0.35);

    vec3 col = albedo * (uAmbientColor + uSunColor * diffuse);

    vec3 viewDir = normalize(cameraPosition - vWorldPos);
    float rim = pow(1.0 - max(dot(N, viewDir), 0.0), 3.0);
    col += vec3(1.0, 0.92, 0.82) * rim * 0.06;

    float dist = length(vWorldPos.xz);
    col = mix(col, vec3(0.72, 0.78, 0.88), smoothstep(120.0, 280.0, dist) * 0.35);

    gl_FragColor = vec4(col, 1.0);
  }
`;

function buildTerrainMaterial(maxHeight) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uGrassTex: { value: createGrassTexture() },
      uCliffTex: { value: createCliffTexture() },
      uDirtTex: { value: createDirtTexture() },
      uMaxHeight: { value: maxHeight - SEA_LEVEL },
      uSeaLevel: { value: SEA_LEVEL },
      uSunDir: { value: new THREE.Vector3(-0.3, 0.25, -0.9).normalize() },
      uSunColor: { value: new THREE.Color(0xffe8c8) },
      uAmbientColor: { value: new THREE.Color(0x6a7a8a) },
    },
    vertexShader: terrainVertexShader,
    fragmentShader: terrainFragmentShader,
  });
}

/** Fill mesh vertices from a height function (sync) */
export function rebuildTerrainMesh(geometry, material, getHeight) {
  const positions = geometry.attributes.position;
  let maxHeight = SEA_LEVEL;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = getHeight(x, z);
    positions.setY(i, y);
    maxHeight = Math.max(maxHeight, y);
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  if (material.uniforms?.uMaxHeight) {
    material.uniforms.uMaxHeight.value = maxHeight - SEA_LEVEL;
  }
  return maxHeight;
}

/** Async rebuild — yields every N rows so the game loop keeps running */
export async function rebuildTerrainMeshAsync(geometry, material, getHeight, onProgress) {
  const positions = geometry.attributes.position;
  const count = positions.count;
  let maxHeight = SEA_LEVEL;
  const batch = 2048;

  for (let i = 0; i < count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = getHeight(x, z);
    positions.setY(i, y);
    maxHeight = Math.max(maxHeight, y);

    if (i > 0 && i % batch === 0) {
      onProgress?.(i / count);
      await yieldFrame();
    }
  }

  positions.needsUpdate = true;
  geometry.computeVertexNormals();

  if (material.uniforms?.uMaxHeight) {
    material.uniforms.uMaxHeight.value = maxHeight - SEA_LEVEL;
  }
  onProgress?.(1);
  return maxHeight;
}

/**
 * Create terrain mesh from island parameters or a custom height function.
 */
export function createTerrain(
  size = TERRAIN_SIZE,
  segments = TERRAIN_SEGMENTS,
  worldParams = PRESET_DEFAULT
) {
  const getHeight = typeof worldParams === 'function'
    ? worldParams
    : createWorldHeightFn(worldParams);

  const geometry = new THREE.PlaneGeometry(size, size, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const maxHeight = sampleMaxHeight(getHeight, size, segments);
  const material = buildTerrainMaterial(maxHeight);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;

  rebuildTerrainMesh(geometry, material, getHeight);

  return {
    mesh,
    getHeight,
    maxHeight,
    material,
    size,
    segments,
    baseGetHeight: getHeight,
    islandParams: typeof worldParams === 'function' ? null : worldParams,
    rebuild(getHeightFn) {
      const fn = getHeightFn || this.getHeight;
      this.getHeight = fn;
      this.baseGetHeight = fn;
      this.maxHeight = rebuildTerrainMesh(geometry, material, fn);
      return this.maxHeight;
    },
    async rebuildAsync(getHeightFn, onProgress) {
      const fn = getHeightFn || this.getHeight;
      this.getHeight = fn;
      this.baseGetHeight = fn;
      this.maxHeight = await rebuildTerrainMeshAsync(geometry, material, fn, onProgress);
      return this.maxHeight;
    },
  };
}

/** @deprecated Use createIslandHeightFn */
export function getTerrainHeight(x, z) {
  return createWorldHeightFn(PRESET_DEFAULT)(x, z);
}
