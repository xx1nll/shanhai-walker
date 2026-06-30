import * as THREE from 'three';

function paintTexture(width, height, drawFn) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  drawFn(ctx, width, height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Muted painterly grass — desaturated, natural */
export function createGrassTexture() {
  return paintTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#5a7050';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      const hue = 85 + Math.random() * 25;
      const sat = 18 + Math.random() * 15;
      const lit = 32 + Math.random() * 18;
      ctx.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, 0.25)`;
      ctx.fillRect(x, y, 3 + Math.random() * 6, 2 + Math.random() * 4);
    }
    for (let i = 0; i < 200; i++) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      ctx.strokeStyle = `hsla(${75 + Math.random() * 20}, 20%, ${28 + Math.random() * 12}%, 0.2)`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (Math.random() - 0.5) * 2, y - 3 - Math.random() * 6);
      ctx.stroke();
    }
  });
}

export function createCliffTexture() {
  return paintTexture(512, 512, (ctx, w, h) => {
    ctx.fillStyle = '#7a7268';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 300; i++) {
      ctx.fillStyle = `rgba(${90 + Math.random() * 30}, ${82 + Math.random() * 25}, ${70 + Math.random() * 20}, ${0.08 + Math.random() * 0.15})`;
      ctx.beginPath();
      ctx.ellipse(Math.random() * w, Math.random() * h, 6 + Math.random() * 20, 4 + Math.random() * 12, Math.random() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 0.04;
    for (let i = 0; i < 40; i++) {
      ctx.strokeStyle = '#d0c8b8';
      ctx.lineWidth = 0.5 + Math.random();
      ctx.beginPath();
      ctx.moveTo(Math.random() * w, Math.random() * h);
      ctx.lineTo(Math.random() * w, Math.random() * h);
      ctx.stroke();
    }
  });
}

export function createDirtTexture() {
  return paintTexture(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#6a5a48';
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      ctx.fillStyle = `rgba(${80 + Math.random() * 40}, ${65 + Math.random() * 30}, ${45 + Math.random() * 25}, 0.15)`;
      ctx.fillRect(Math.random() * w, Math.random() * h, 2 + Math.random() * 4, 2 + Math.random() * 4);
    }
  });
}

export function createGrassBladeTexture() {
  return paintTexture(32, 64, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const grad = ctx.createLinearGradient(w / 2, h, w / 2, 0);
    grad.addColorStop(0, 'rgba(70,90,55,0)');
    grad.addColorStop(0.4, 'rgba(80,100,65,0.85)');
    grad.addColorStop(1, 'rgba(100,120,80,0.95)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(w / 2, 1);
    ctx.quadraticCurveTo(w / 2 + 6, h * 0.45, w / 2 + 1, h - 1);
    ctx.quadraticCurveTo(w / 2 - 4, h * 0.45, w / 2, 1);
    ctx.fill();
  });
}
