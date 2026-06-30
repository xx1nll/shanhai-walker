import * as THREE from 'three';
import { SEA_LEVEL } from './constants.js';

/**
 * Creative terrain editor — paints height deltas onto the heightmap mesh.
 * Base procedural terrain + user edits stored in a vertex delta grid.
 */
export class TerrainEditor {
  constructor({ mesh, baseGetHeight, size, segments, material }) {
    this.mesh = mesh;
    this.geometry = mesh.geometry;
    this.baseGetHeight = baseGetHeight;
    this.size = size;
    this.segments = segments;
    this.half = size / 2;
    this.material = material;
    this.gridVerts = segments + 1;
    this.deltas = new Float32Array(this.gridVerts * this.gridVerts);

    this.active = false;
    this.brushRadius = 14;
    this.brushStrength = 10;
    this.isPainting = false;
    this.paintDirection = 1;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.lastHit = null;

    this.brushRing = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1, 40),
      new THREE.MeshBasicMaterial({
        color: 0x80c0ff,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      })
    );
    this.brushRing.rotation.x = -Math.PI / 2;
    this.brushRing.visible = false;
  }

  getHeight(x, z) {
    return this.baseGetHeight(x, z) + this.sampleDelta(x, z);
  }

  sampleDelta(x, z) {
    const fx = ((x + this.half) / this.size) * this.segments;
    const fz = ((z + this.half) / this.size) * this.segments;
    const x0 = Math.floor(fx);
    const z0 = Math.floor(fz);
    const x1 = Math.min(x0 + 1, this.segments);
    const z1 = Math.min(z0 + 1, this.segments);
    const tx = fx - x0;
    const tz = fz - z0;

    const d00 = this._deltaAt(x0, z0);
    const d10 = this._deltaAt(x1, z0);
    const d01 = this._deltaAt(x0, z1);
    const d11 = this._deltaAt(x1, z1);

    const a = d00 * (1 - tx) + d10 * tx;
    const b = d01 * (1 - tx) + d11 * tx;
    return a * (1 - tz) + b * tz;
  }

  _deltaAt(gx, gz) {
    gx = THREE.MathUtils.clamp(gx, 0, this.segments);
    gz = THREE.MathUtils.clamp(gz, 0, this.segments);
    return this.deltas[gz * this.gridVerts + gx];
  }

  toggle() {
    this.active = !this.active;
    this.isPainting = false;
    this.brushRing.visible = this.active && !!this.lastHit;
    return this.active;
  }

  setBrushRadius(r) {
    this.brushRadius = THREE.MathUtils.clamp(r, 2, 60);
  }

  setBrushStrength(s) {
    this.brushStrength = THREE.MathUtils.clamp(s, 1, 40);
  }

  attachBrushRing(scene) {
    scene.add(this.brushRing);
  }

  raycast(camera, clientX, clientY, canvas) {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, camera);
    const hits = this.raycaster.intersectObject(this.mesh);
    return hits[0] || null;
  }

  updatePointer(camera, clientX, clientY, canvas) {
    if (!this.active) return null;
    const hit = this.raycast(camera, clientX, clientY, canvas);
    this.lastHit = hit;
    if (hit) {
      this.brushRing.visible = true;
      this.brushRing.position.set(hit.point.x, hit.point.y + 0.2, hit.point.z);
      this.brushRing.scale.setScalar(this.brushRadius);
    } else {
      this.brushRing.visible = false;
    }
    return hit;
  }

  paintAt(hit, dt) {
    if (!hit) return;
    const wx = hit.point.x;
    const wz = hit.point.z;
    const cx = ((wx + this.half) / this.size) * this.segments;
    const cz = ((wz + this.half) / this.size) * this.segments;
    const brushCells = (this.brushRadius / this.size) * this.segments;
    const amount = this.brushStrength * dt * this.paintDirection;

    const minGx = Math.max(0, Math.floor(cx - brushCells));
    const maxGx = Math.min(this.segments, Math.ceil(cx + brushCells));
    const minGz = Math.max(0, Math.floor(cz - brushCells));
    const maxGz = Math.min(this.segments, Math.ceil(cz + brushCells));

    let changed = false;
    for (let gz = minGz; gz <= maxGz; gz++) {
      for (let gx = minGx; gx <= maxGx; gx++) {
        const cellWorld = this.size / this.segments;
        const px = -this.half + gx * cellWorld;
        const pz = -this.half + gz * cellWorld;
        const dist = Math.sqrt((px - wx) ** 2 + (pz - wz) ** 2);
        if (dist > this.brushRadius) continue;

        const falloff = 1 - dist / this.brushRadius;
        const idx = gz * this.gridVerts + gx;
        this.deltas[idx] += amount * falloff * falloff;
        changed = true;
      }
    }

    if (changed) this._rebuildMesh();
  }

  setBaseGetHeight(fn, { skipRebuild = false } = {}) {
    this.baseGetHeight = fn;
    if (!skipRebuild) this._rebuildMesh();
  }

  /** Replace procedural base and clear paint edits in one pass */
  regenerateBase(fn) {
    this.baseGetHeight = fn;
    this.deltas.fill(0);
    this._rebuildMesh();
  }

  async applyBaseAsync(fn, onProgress, { clearPaint = false } = {}) {
    this.baseGetHeight = fn;
    if (clearPaint) this.deltas.fill(0);
    await this._rebuildMeshAsync(onProgress);
  }

  async regenerateBaseAsync(fn, onProgress) {
    return this.applyBaseAsync(fn, onProgress, { clearPaint: true });
  }

  hasPaintEdits() {
    for (let i = 0; i < this.deltas.length; i++) {
      if (Math.abs(this.deltas[i]) > 0.01) return true;
    }
    return false;
  }

  countPaintCells() {
    let n = 0;
    for (let i = 0; i < this.deltas.length; i++) {
      if (Math.abs(this.deltas[i]) > 0.01) n++;
    }
    return n;
  }

  async _rebuildMeshAsync(onProgress) {
    const positions = this.geometry.attributes.position;
    const count = positions.count;
    let maxHeight = 0;
    const batch = 2048;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const gx = Math.round(((x + this.half) / this.size) * this.segments);
      const gz = Math.round(((z + this.half) / this.size) * this.segments);
      const delta = this._deltaAt(gx, gz);
      const y = this.baseGetHeight(x, z) + delta;
      positions.setY(i, y);
      maxHeight = Math.max(maxHeight, y);

      if (i > 0 && i % batch === 0) {
        onProgress?.(i / count);
        await new Promise((r) => requestAnimationFrame(r));
      }
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();

    if (this.material.uniforms?.uMaxHeight) {
      this.material.uniforms.uMaxHeight.value = maxHeight - SEA_LEVEL;
    }
    onProgress?.(1);
  }

  rebuildFromBase() {
    this._rebuildMesh();
  }

  _rebuildMesh() {
    const positions = this.geometry.attributes.position;
    let maxHeight = 0;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const gx = Math.round(((x + this.half) / this.size) * this.segments);
      const gz = Math.round(((z + this.half) / this.size) * this.segments);
      const delta = this._deltaAt(gx, gz);
      const y = this.baseGetHeight(x, z) + delta;
      positions.setY(i, y);
      maxHeight = Math.max(maxHeight, y);
    }

    positions.needsUpdate = true;
    this.geometry.computeVertexNormals();

    if (this.material.uniforms?.uMaxHeight) {
      this.material.uniforms.uMaxHeight.value = maxHeight - SEA_LEVEL;
    }
  }

  exportEdits() {
    return {
      version: 1,
      segments: this.segments,
      size: this.size,
      deltas: Array.from(this.deltas),
    };
  }

  importEdits(data) {
    if (!data?.deltas || data.segments !== this.segments) return false;
    if (data.deltas.length !== this.deltas.length) return false;
    try {
      this.deltas.set(data.deltas);
      this._rebuildMesh();
      return true;
    } catch (e) {
      console.warn('[TerrainEditor] importEdits failed', e);
      return false;
    }
  }

  resetEdits() {
    this.deltas.fill(0);
    this._rebuildMesh();
  }

  setupInput(canvas, camera, getExitPointerLock) {
    const onDown = (e) => {
      if (!this.active) return;
      e.preventDefault();
      if (e.button === 0) this.paintDirection = 1;
      else if (e.button === 2) this.paintDirection = -1;
      else return;

      this.isPainting = true;
      getExitPointerLock?.();
      const hit = this.updatePointer(camera, e.clientX, e.clientY, canvas);
      if (hit) this.paintAt(hit, 0.05);
    };

    const onMove = (e) => {
      if (!this.active) return;
      const hit = this.updatePointer(camera, e.clientX, e.clientY, canvas);
      if (this.isPainting && hit) this.paintAt(hit, 0.032);
    };

    const onUp = () => {
      this.isPainting = false;
    };

    const onContext = (e) => {
      if (this.active) e.preventDefault();
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    canvas.addEventListener('contextmenu', onContext);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('contextmenu', onContext);
    };
  }
}
