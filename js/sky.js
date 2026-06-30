import * as THREE from 'three';

export function createStylizedSky(sunDir) {
  const geo = new THREE.SphereGeometry(480, 40, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x6a9ec8) },
      midColor: { value: new THREE.Color(0xa8c8e0) },
      horizonColor: { value: new THREE.Color(0xf0dcc0) },
      sunColor: { value: new THREE.Color(0xfff4e0) },
      sunDirection: { value: sunDir.clone() },
    },
    vertexShader: `
      varying vec3 vWorldPos;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      uniform vec3 sunDirection;
      varying vec3 vWorldPos;

      void main() {
        vec3 dir = normalize(vWorldPos);
        float h = dir.y * 0.5 + 0.5;

        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.35, h));
        col = mix(col, topColor, smoothstep(0.35, 1.0, h));

        float sunDot = max(dot(dir, sunDirection), 0.0);
        float sunDisc = smoothstep(0.998, 0.9995, sunDot);
        float sunGlow = pow(sunDot, 12.0) * 0.18;
        col += sunColor * (sunDisc * 0.8 + sunGlow);

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });

  return new THREE.Mesh(geo, mat);
}

export function createSoftClouds(count = 16) {
  const group = new THREE.Group();
  const geo = new THREE.PlaneGeometry(60, 25);

  for (let i = 0; i < count; i++) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    for (let j = 0; j < 4; j++) {
      const x = 40 + Math.random() * 120;
      const y = 20 + Math.random() * 20;
      const r = 20 + Math.random() * 30;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.7)');
      g.addColorStop(0.6, 'rgba(255,255,255,0.2)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    const mat = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      depthWrite: false,
      opacity: 0.35 + Math.random() * 0.2,
    });

    const cloud = new THREE.Mesh(geo, mat);
    cloud.position.set(
      (Math.random() - 0.5) * 400,
      45 + Math.random() * 25,
      -80 - Math.random() * 200
    );
    cloud.rotation.y = Math.random() * Math.PI;
    cloud.scale.setScalar(0.6 + Math.random() * 1.2);
    group.add(cloud);
  }

  return group;
}
