import * as THREE from 'three';
import { SEA_LEVEL } from './constants.js';
import { shapedFalloff, getShapeOpts } from './island/shapeFalloff.js';

function parseColor(value, fallback = '#3a8aa8') {
  if (value == null) return new THREE.Color(fallback);
  if (typeof value === 'number') return new THREE.Color(value);
  const s = String(value).replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return new THREE.Color(`#${s}`);
  return new THREE.Color(fallback);
}

function buildShapedWaterGeometry(hole) {
  const sx = Math.max(hole.sizeX ?? 20, 2);
  const sz = Math.max(hole.sizeZ ?? 20, 2);
  const seg = 40;
  const opts = getShapeOpts(hole);
  const positions = [];
  const masks = [];
  const locals = [];

  for (let iz = 0; iz <= seg; iz++) {
    for (let ix = 0; ix <= seg; ix++) {
      const lx = (ix / seg - 0.5) * 2 * sx;
      const lz = (iz / seg - 0.5) * 2 * sz;
      const mask = shapedFalloff(lx, lz, sx, sz, opts);
      positions.push(lx, 0, lz);
      masks.push(mask);
      locals.push(lx, lz);
    }
  }

  const row = seg + 1;
  const indices = [];
  const minMask = 0.06;

  for (let iz = 0; iz < seg; iz++) {
    for (let ix = 0; ix < seg; ix++) {
      const a = iz * row + ix;
      const b = a + 1;
      const c = a + row;
      const d = c + 1;
      const ma = masks[a];
      const mb = masks[b];
      const mc = masks[c];
      const md = masks[d];
      const maxM = Math.max(ma, mb, mc, md);
      if (maxM < minMask) continue;
      if (ma > minMask || mc > minMask || mb > minMask) indices.push(a, c, b);
      if (mb > minMask || md > minMask || mc > minMask) indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('aMask', new THREE.Float32BufferAttribute(masks, 1));
  geo.setAttribute('aLocal', new THREE.Float32BufferAttribute(locals, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

function createShapedWaterMaterial(hole) {
  const col = parseColor(hole.waterColor, '#3a8aa8');
  const deep = col.clone().multiplyScalar(0.65);
  const sx = Math.max(hole.sizeX ?? 20, 2);
  const sz = Math.max(hole.sizeZ ?? 20, 2);
  const opts = getShapeOpts(hole);
  const sides = Math.round(opts.sides ?? 0);
  const kindMap = { circle: 0, polygon: 1, star: 2, ring: 3 };
  const kind = sides <= 0 ? 0 : (kindMap[opts.shapeKind] ?? 0);
  const ringThick = Math.max(0.08, Math.min(0.85, opts.ringThickness ?? 0.35));
  const shapeAngle = ((opts.shapeAngle ?? 0) * Math.PI) / 180;

  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: col },
      uDeepColor: { value: deep },
      uSize: { value: new THREE.Vector2(sx, sz) },
      uShapeKind: { value: kind },
      uSides: { value: Math.max(3, sides) },
      uRingThick: { value: ringThick },
      uShapeAngle: { value: shapeAngle },
    },
    vertexShader: `
      attribute float aMask;
      attribute vec2 aLocal;
      varying float vMask;
      varying vec2 vLocal;
      varying float vWave;
      uniform float uTime;
      void main() {
        vMask = aMask;
        vLocal = aLocal;
        vec3 pos = position;
        float wave = sin(pos.x * 0.3 + uTime) * 0.03 + sin(pos.z * 0.22 + uTime * 0.85) * 0.025;
        pos.y += wave;
        vWave = wave;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform vec3 uDeepColor;
      uniform vec2 uSize;
      uniform int uShapeKind;
      uniform float uSides;
      uniform float uRingThick;
      uniform float uShapeAngle;
      varying float vMask;
      varying vec2 vLocal;
      varying float vWave;

      float polyR(float theta, float sides) {
        float sector = 6.2831853 / sides;
        float a = mod(theta, sector);
        if (a > sector * 0.5) a = sector - a;
        return cos(3.14159265 / sides) / cos(a);
      }

      float starR(float theta, float points) {
        float inner = 0.42;
        float wave = (cos(theta * points) + 1.0) * 0.5;
        return inner + (1.0 - inner) * wave;
      }

      float shapeMask(vec2 local) {
        float sx = max(uSize.x, 1.0);
        float sz = max(uSize.y, 1.0);
        float c = cos(-uShapeAngle);
        float s = sin(-uShapeAngle);
        vec2 d = vec2(local.x / sx, local.y / sz);
        d = vec2(d.x * c - d.y * s, d.x * s + d.y * c);
        float r = length(d);
        if (r < 1e-5) return (uShapeKind == 3) ? 0.0 : 1.0;

        if (uShapeKind == 0) {
          float t = dot(d, d);
          if (t >= 1.0) return 0.0;
          return 1.0 - sqrt(t);
        }

        float theta = atan(d.y, d.x);
        float edge;
        if (uShapeKind == 1) edge = polyR(theta, uSides);
        else if (uShapeKind == 2) edge = starR(theta, uSides);
        else {
          float outer = polyR(theta, uSides);
          float inner = outer * (1.0 - uRingThick);
          if (r > outer || r < inner) return 0.0;
          float ew = max(0.04, uRingThick * 0.2);
          float oe = clamp((outer - r) / ew, 0.0, 1.0);
          float ie = clamp((r - inner) / ew, 0.0, 1.0);
          return oe * ie;
        }

        if (r >= edge) return 0.0;
        return 1.0 - r / edge;
      }

      void main() {
        float mask = shapeMask(vLocal);
        if (mask < 0.06) discard;
        float edge = smoothstep(0.06, 0.2, mask);
        vec3 col = mix(uDeepColor, uColor, 0.55 + vWave * 2.0);
        gl_FragColor = vec4(col, 0.9 * edge);
      }
    `,
  });
}

/** Water surfaces for holes with fillWater enabled — clipped to hole shape */
export function createHoleWaterGroup() {
  const group = new THREE.Group();
  group.name = 'holeWater';

  group.userData.rebuild = (world) => {
    while (group.children.length) {
      const child = group.children[0];
      group.remove(child);
      child.geometry?.dispose();
      child.material?.dispose();
    }

    for (const island of world?.islands ?? []) {
      for (const hole of island.holes ?? []) {
        if (!hole.fillWater) continue;

        const wx = island.centerX + hole.x;
        const wz = island.centerZ + hole.z;
        const y = hole.waterLevel ?? SEA_LEVEL;

        const geo = buildShapedWaterGeometry(hole);
        const mat = createShapedWaterMaterial(hole);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(wx, y, wz);
        mesh.userData.animate = (t) => { mat.uniforms.uTime.value = t; };
        group.add(mesh);
      }
    }
  };

  return group;
}
