import * as THREE from 'three';
import { SEA_LEVEL } from './terrain.js';

export const MAP_BOUNDS = {
  min: -250,
  max: 250,
  size: 500,
  step: 10,
  labelStep: 50,
};

/** 3D coordinate grid overlay for map editing */
export function createWorldGrid(getHeight, options = {}) {
  const {
    step = MAP_BOUNDS.step,
    yOffset = 0.15,
    visible = true,
  } = options;

  const group = new THREE.Group();
  group.name = 'coordinateGrid';
  group.visible = visible;

  const half = MAP_BOUNDS.size / 2;
  const divisions = MAP_BOUNDS.size / step;

  // Main grid at plateau height sample
  const gridY = getHeight(0, 35) + yOffset;
  const grid = new THREE.GridHelper(MAP_BOUNDS.size, divisions, 0x9aa8b8, 0x5a6878);
  grid.position.y = gridY;
  grid.material.transparent = true;
  grid.material.opacity = 0.55;
  group.add(grid);

  // Sea-level reference grid (fainter)
  const seaGrid = new THREE.GridHelper(MAP_BOUNDS.size, divisions / 2, 0x4a6878, 0x3a5060);
  seaGrid.position.y = SEA_LEVEL + 0.05;
  seaGrid.material.transparent = true;
  seaGrid.material.opacity = 0.2;
  group.add(seaGrid);

  // Axis lines — X (red), Z (blue)
  const axisMat = (color) =>
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.85 });

  const xAxis = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-half, gridY + 0.02, 0),
    new THREE.Vector3(half, gridY + 0.02, 0),
  ]);
  const zAxis = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(0, gridY + 0.02, -half),
    new THREE.Vector3(0, gridY + 0.02, half),
  ]);
  group.add(new THREE.Line(xAxis, axisMat(0xe06060)));
  group.add(new THREE.Line(zAxis, axisMat(0x6090e0)));

  // Origin marker
  const originRing = new THREE.Mesh(
    new THREE.RingGeometry(1.5, 2, 32),
    new THREE.MeshBasicMaterial({ color: 0xf0e0a0, side: THREE.DoubleSide, transparent: true, opacity: 0.7 })
  );
  originRing.rotation.x = -Math.PI / 2;
  originRing.position.set(0, gridY + 0.03, 0);
  group.add(originRing);

  // Numeric labels as sprites every labelStep units
  const labelStep = MAP_BOUNDS.labelStep;
  for (let v = -half; v <= half; v += labelStep) {
    if (v === 0) continue;
    group.add(makeLabelSprite(`${v}`, 0xc0c8d0));
    group.children[group.children.length - 1].position.set(v, gridY + 1.5, -half + 8);

    const zLabel = makeLabelSprite(`${v}`, 0xc0c8d0);
    zLabel.position.set(-half + 8, gridY + 1.5, v);
    group.add(zLabel);
  }
  const originLabel = makeLabelSprite('0,0', 0xf0e0a0);
  originLabel.position.set(0, gridY + 2, 0);
  group.add(originLabel);

  // Landmark markers (editable reference points)
  const landmarks = [
    { x: 0, z: 38, label: 'Spawn', color: 0x60c0ff },
    { x: 0, z: -60, label: 'Cliff', color: 0xffa060 },
    { x: -30, z: -140, label: 'Golden Tree', color: 0xffd060 },
    { x: -40, z: 30, label: 'Water', color: 0x60b0d0 },
    { x: 143, z: 12, label: '扶桑', color: 0xff9040 },
  ];

  landmarks.forEach(({ x, z, label, color }) => {
    const y = getHeight(x, z) + 0.5;
    const pin = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1.8, 6),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.8 })
    );
    pin.position.set(x, y, z);
    group.add(pin);

    const lbl = makeLabelSprite(label, color);
    lbl.position.set(x, y + 2.5, z);
    group.add(lbl);
  });

  return group;
}

function makeLabelSprite(text, color = 0xffffff) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'rgba(20,25,35,0.75)';
  ctx.fillRect(4, 4, 120, 24);
  ctx.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  ctx.font = 'bold 14px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 64, 16);

  const tex = new THREE.CanvasTexture(canvas);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(8, 2, 1);
  return sprite;
}

/** Top-down minimap rendered to a 2D canvas */
export class Minimap {
  constructor(getHeight, containerEl) {
    this.getHeight = getHeight;
    this.worldMin = MAP_BOUNDS.min;
    this.worldMax = MAP_BOUNDS.max;
    this.resolution = 128;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.resolution;
    this.canvas.height = this.resolution;
    this.canvas.className = 'minimap-canvas';
    this.ctx = this.canvas.getContext('2d');

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'minimap-wrapper panel';
    this.wrapper.innerHTML = `
      <div class="minimap-header">地图 <span class="minimap-toggle-hint">M 放大</span></div>
    `;
    this.wrapper.appendChild(this.canvas);

    this.coordEl = document.createElement('div');
    this.coordEl.className = 'coord-readout';
    this.coordEl.innerHTML = 'X: 0 &nbsp; Z: 0 &nbsp; Y: 0';
    this.wrapper.appendChild(this.coordEl);

    containerEl.appendChild(this.wrapper);

    this.expanded = false;
    this.terrainImage = null;
    this._ready = false;
  }

  setGetHeight(fn) {
    this.getHeight = fn;
    this._ready = false;
  }

  async rebakeAsync(onProgress) {
    await this.precomputeAsync(onProgress);
  }

  /** Async terrain bake — avoids blocking main thread on startup */
  async precomputeAsync(onProgress) {
    this.terrainImage = this.ctx.createImageData(this.resolution, this.resolution);
    const { data } = this.terrainImage;
    const range = this.worldMax - this.worldMin;
    const rowsPerBatch = 8;

    for (let py = 0; py < this.resolution; py += rowsPerBatch) {
      const endY = Math.min(py + rowsPerBatch, this.resolution);
      for (let y = py; y < endY; y++) {
        for (let px = 0; px < this.resolution; px++) {
          const x = this.worldMin + (px / this.resolution) * range;
          const z = this.worldMin + (y / this.resolution) * range;
          const h = this.getHeight(x, z);
          const i = (y * this.resolution + px) * 4;

          if (h < SEA_LEVEL) {
            data[i] = 40; data[i + 1] = 70; data[i + 2] = 95; data[i + 3] = 255;
          } else if (h < 6) {
            data[i] = 70; data[i + 1] = 95; data[i + 2] = 60; data[i + 3] = 255;
          } else if (h < 12) {
            data[i] = 55; data[i + 1] = 85; data[i + 2] = 50; data[i + 3] = 255;
          } else if (h < 18) {
            data[i] = 80; data[i + 1] = 100; data[i + 2] = 55; data[i + 3] = 255;
          } else {
            data[i] = 110; data[i + 1] = 100; data[i + 2] = 80; data[i + 3] = 255;
          }
        }
      }
      onProgress?.(endY / this.resolution);
      await new Promise((r) => requestAnimationFrame(r));
    }
    this._ready = true;
  }

  _precomputeTerrain() {
    this.terrainImage = this.ctx.createImageData(this.resolution, this.resolution);
    const { data } = this.terrainImage;
    const range = this.worldMax - this.worldMin;

    for (let py = 0; py < this.resolution; py++) {
      for (let px = 0; px < this.resolution; px++) {
        const x = this.worldMin + (px / this.resolution) * range;
        const z = this.worldMin + (py / this.resolution) * range;
        const h = this.getHeight(x, z);
        const i = (py * this.resolution + px) * 4;

        if (h < SEA_LEVEL) {
          data[i] = 40; data[i + 1] = 70; data[i + 2] = 95; data[i + 3] = 255;
        } else if (h < 6) {
          data[i] = 70; data[i + 1] = 95; data[i + 2] = 60; data[i + 3] = 255;
        } else if (h < 12) {
          data[i] = 55; data[i + 1] = 85; data[i + 2] = 50; data[i + 3] = 255;
        } else if (h < 18) {
          data[i] = 80; data[i + 1] = 100; data[i + 2] = 55; data[i + 3] = 255;
        } else {
          data[i] = 110; data[i + 1] = 100; data[i + 2] = 80; data[i + 3] = 255;
        }
      }
    }
    this._ready = true;
  }

  _worldToMap(x, z) {
    const range = this.worldMax - this.worldMin;
    return {
      px: ((x - this.worldMin) / range) * this.resolution,
      py: ((z - this.worldMin) / range) * this.resolution,
    };
  }

  toggleExpanded() {
    this.expanded = !this.expanded;
    this.wrapper.classList.toggle('expanded', this.expanded);
    const size = this.expanded ? 320 : 160;
    // Keep terrain cache, just scale display via CSS
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
  }

  update(playerPos, cameraYaw, animState) {
    if (!this._ready || !this.terrainImage) return;
    const { ctx, resolution } = this;
    ctx.putImageData(this.terrainImage, 0, 0);

    // Grid lines on minimap
    ctx.strokeStyle = 'rgba(200,210,220,0.25)';
    ctx.lineWidth = 1;
    const range = this.worldMax - this.worldMin;
    const gridStep = MAP_BOUNDS.step;
    for (let v = this.worldMin; v <= this.worldMax; v += gridStep) {
      const { px, py } = this._worldToMap(v, this.worldMin);
      const { px: px2 } = this._worldToMap(v, this.worldMax);
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px2, resolution);
      ctx.stroke();

      const { py: py2 } = this._worldToMap(this.worldMin, v);
      const { px: px3 } = this._worldToMap(this.worldMax, v);
      ctx.beginPath();
      ctx.moveTo(0, py2);
      ctx.lineTo(px3, py2);
      ctx.stroke();
    }

    // Axis lines
    ctx.strokeStyle = 'rgba(220,100,100,0.5)';
    const origin = this._worldToMap(0, 0);
    ctx.beginPath();
    ctx.moveTo(0, origin.py);
    ctx.lineTo(resolution, origin.py);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(100,140,220,0.5)';
    ctx.beginPath();
    ctx.moveTo(origin.px, 0);
    ctx.lineTo(origin.px, resolution);
    ctx.stroke();

    // Landmark dots
    const landmarks = [
      { x: -30, z: -140, color: '#ffd060' },
      { x: 0, z: -60, color: '#ffa060' },
      { x: 143, z: 12, color: '#ff8030' },
    ];
    landmarks.forEach(({ x, z, color }) => {
      const { px, py } = this._worldToMap(x, z);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Player arrow
    const { px, py } = this._worldToMap(playerPos.x, playerPos.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(-cameraYaw + Math.PI);
    ctx.fillStyle = '#60c0ff';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-5, 5);
    ctx.lineTo(0, 3);
    ctx.lineTo(5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();

    // Coordinate readout
    this.coordEl.innerHTML =
      `X: <b>${playerPos.x.toFixed(1)}</b> &nbsp; ` +
      `Z: <b>${playerPos.z.toFixed(1)}</b> &nbsp; ` +
      `Y: <b>${playerPos.y.toFixed(1)}</b> &nbsp; ` +
      `<span class="state-tag ${animState}">${animState}</span>`;
  }
}

/** Coordinate HUD helper — logs position on C key */
export function setupCoordinateLogger(player, input) {
  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyC' && e.ctrlKey) {
      const p = player.position;
      const msg = `{ x: ${p.x.toFixed(1)}, z: ${p.z.toFixed(1)}, y: ${p.y.toFixed(1)} }`;
      navigator.clipboard?.writeText(msg);
      console.log('[Coord]', msg);
    }
  });
}
