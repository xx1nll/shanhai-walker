import * as THREE from 'three';

export function createOcean(sunDir, seaLevel = -1.5, colors = {}) {
  const geo = new THREE.PlaneGeometry(800, 800, 128, 128);
  geo.rotateX(-Math.PI / 2);

  const deep = colors.deep ?? 0x2a5a7a;
  const shallow = colors.shallow ?? 0x4a8aa8;

  const mat = new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uSeaLevel: { value: seaLevel },
      uDeepColor: { value: new THREE.Color(deep) },
      uShallowColor: { value: new THREE.Color(shallow) },
      uSunDir: { value: sunDir.clone() },
      uSunColor: { value: new THREE.Color(0xffe8c0) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying float vWave;
      void main() {
        vec3 pos = position;
        float wave = sin(pos.x * 0.08 + uTime * 0.8) * 0.15
                   + sin(pos.z * 0.06 + uTime * 0.6) * 0.12
                   + sin((pos.x + pos.z) * 0.04 + uTime * 0.5) * 0.08;
        pos.y += wave;
        vWave = wave;
        vec4 wp = modelMatrix * vec4(pos, 1.0);
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uSunDir;
      uniform vec3 uSunColor;
      varying vec3 vWorldPos;
      varying float vWave;

      void main() {
        vec3 N = normalize(vec3(
          sin(vWorldPos.x * 0.08) * 0.3,
          1.0,
          sin(vWorldPos.z * 0.06) * 0.3
        ));

        float fresnel = pow(1.0 - max(dot(N, vec3(0,1,0)), 0.0), 2.0);
        vec3 waterCol = mix(uDeepColor, uShallowColor, fresnel * 0.4 + 0.25);

        // Sun specular path on water
        vec3 H = normalize(uSunDir + vec3(0, 1, 0));
        float spec = pow(max(dot(N, H), 0.0), 128.0) * 0.6;
        float specBroad = pow(max(dot(N, H), 0.0), 16.0) * 0.15;
        waterCol += uSunColor * (spec + specBroad);

        // Distance haze
        float dist = length(vWorldPos.xz);
        waterCol = mix(waterCol, vec3(0.65, 0.75, 0.85), smoothstep(100.0, 350.0, dist) * 0.5);

        gl_FragColor = vec4(waterCol, 0.92);
      }
    `,
  });

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = seaLevel;
  mesh.userData.animate = (t) => {
    mat.uniforms.uTime.value = t;
  };
  mesh.userData.setColors = (deep, shallow) => {
    mat.uniforms.uDeepColor.value.set(deep);
    mat.uniforms.uShallowColor.value.set(shallow);
  };
  return mesh;
}
