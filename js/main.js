import * as THREE from 'three';
import { createTerrain, SEA_LEVEL, TERRAIN_SEGMENTS, TERRAIN_SIZE } from './terrain.js';
import { createWorldHeightFn } from './island/islandGenerator.js';
import { TerrainEditor } from './terrainEditor.js';
import { IslandParamUI } from './island/islandParamUI.js';
import {
  PRESET_DEFAULT,
  migrateWorld,
  ISLAND_PARAMS_STORAGE_KEY,
} from './island/islandParams.js';
import { buildWorldExport, worldToJSON } from './island/worldIO.js';
import { Player } from './player.js';
import { InputManager } from './input.js';
import { createStylizedSky, createSoftClouds } from './sky.js';
import { createOcean } from './water.js';
import { createPostProcessing } from './postprocessing.js';
import { createWorldGrid, Minimap, setupCoordinateLogger } from './mapTools.js';
import { LoadingScreen, yieldFrame } from './loading.js';
import { ColliderRegistry } from './collision/ColliderRegistry.js';

const loading = new LoadingScreen();

function updateEditorUI(editor, active) {
  const panel = document.getElementById('editor-panel');
  const badge = document.getElementById('mode-badge');
  if (panel) panel.classList.toggle('visible', active);
  if (badge && active) {
    badge.textContent = '地形编辑';
    badge.classList.add('visible');
  }
  const brushEl = document.getElementById('editor-brush');
  const strengthEl = document.getElementById('editor-strength');
  if (brushEl) brushEl.textContent = Math.round(editor.brushRadius);
  if (strengthEl) strengthEl.textContent = editor.brushStrength.toFixed(0);
}

function loadSavedWorld() {
  const keys = [
    ISLAND_PARAMS_STORAGE_KEY,
    'shanhai-world-params-v3',
    'shanhai-island-params-v3',
    'shanhai-island-params-v2',
  ];
  for (const key of keys) {
    try {
      const saved = localStorage.getItem(key);
      if (saved) return migrateWorld(JSON.parse(saved));
    } catch (e) {
      console.warn('[Island] failed to load', key, e);
    }
  }
  return PRESET_DEFAULT;
}

function saveWorld(world, terrainEditor) {
  try {
    const payload = buildWorldExport(world, terrainEditor);
    localStorage.setItem(ISLAND_PARAMS_STORAGE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[Island] save failed', e);
  }
}

function applyPaintDeltas(terrainEditor, world) {
  if (!world?.paintDeltas) return;
  terrainEditor.importEdits(world.paintDeltas);
}

async function bootstrap() {
  const canvas = document.getElementById('game');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const sunDirection = new THREE.Vector3(-0.25, 0.18, -0.92).normalize();
  const fogColor = new THREE.Color(0xc8d4e0);
  scene.fog = new THREE.Fog(fogColor, 60, 300);
  scene.background = fogColor;

  loading.setProgress(0.05, '初始化渲染器…');
  await yieldFrame();

  loading.setProgress(0.1, '构建天空…');
  scene.add(createStylizedSky(sunDirection));
  scene.add(createSoftClouds(6));
  await yieldFrame();

  loading.setProgress(0.2, '布置光照…');
  scene.add(new THREE.HemisphereLight(0xc8d8f0, 0x5a6848, 0.45));
  scene.add(new THREE.AmbientLight(0x8898a8, 0.3));

  const sun = new THREE.DirectionalLight(0xffe8c8, 1.2);
  sun.position.copy(sunDirection.clone().multiplyScalar(200));
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 400;
  sun.shadow.camera.left = -150;
  sun.shadow.camera.right = 150;
  sun.shadow.camera.top = 150;
  sun.shadow.camera.bottom = -150;
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.015;
  scene.add(sun);
  const fill = new THREE.DirectionalLight(0x90a8c8, 0.2);
  fill.position.set(50, 40, 80);
  scene.add(fill);
  await yieldFrame();

  loading.setProgress(0.35, '生成地形…');
  const worldParams = loadSavedWorld();

  const terrainData = createTerrain(TERRAIN_SIZE, TERRAIN_SEGMENTS, worldParams);
  scene.add(terrainData.mesh);

  const terrainEditor = new TerrainEditor(terrainData);
  terrainEditor.attachBrushRing(scene);
  applyPaintDeltas(terrainEditor, worldParams);
  let getHeight = (x, z) => terrainEditor.getHeight(x, z);

  const exitPointerLock = () => {
    if (document.pointerLockElement) document.exitPointerLock();
  };

  await yieldFrame();

  loading.setProgress(0.5, '生成海洋…');
  const ocean = createOcean(sunDirection, SEA_LEVEL);
  scene.add(ocean);
  await yieldFrame();

  const colliders = new ColliderRegistry();

  loading.setProgress(0.7, '生成坐标网格…');
  const worldGrid = createWorldGrid(getHeight, { visible: false });
  scene.add(worldGrid);
  await yieldFrame();

  loading.setProgress(0.85, '绘制地图…');
  const minimap = new Minimap(getHeight, document.getElementById('ui'));
  await minimap.precomputeAsync((p) => {
    loading.setProgress(0.85 + p * 0.12, '绘制地图…');
  });

  loading.setProgress(0.98, '准备行者…');
  const player = new Player(getHeight, SEA_LEVEL, colliders);
  const sx = worldParams.spawnX;
  const sz = worldParams.spawnZ;
  player.mesh.position.set(sx, getHeight(sx, sz), sz);
  scene.add(player.mesh);

  async function applyWorldToTerrain(world, { keepPaint = false } = {}) {
    const baseFn = createWorldHeightFn(world);
    await terrainEditor.applyBaseAsync(baseFn, () => {}, { clearPaint: !keepPaint });
    if (!keepPaint && world.paintDeltas) terrainEditor.importEdits(world.paintDeltas);

    terrainData.getHeight = (x, z) => terrainEditor.getHeight(x, z);
    terrainData.baseGetHeight = baseFn;
    terrainData.islandParams = world;

    getHeight = (x, z) => terrainEditor.getHeight(x, z);
    player.setGetHeight(getHeight);

    minimap.setGetHeight(getHeight);
    await minimap.rebakeAsync().catch(() => {});

    saveWorld(world, terrainEditor);
  }

  const islandUI = new IslandParamUI({
    onPanelOpen: () => {
      islandUI.syncPaintFromEditor(terrainEditor);
    },
    onSyncPaint: () => {
      islandUI.syncPaintFromEditor(terrainEditor);
    },
    onExportJSON: () => {
      islandUI.syncPaintFromEditor(terrainEditor);
      return worldToJSON(islandUI.getWorld(), terrainEditor);
    },
    onReset: () => {
      terrainEditor.resetEdits();
      islandUI.syncPaintFromEditor(terrainEditor);
    },
    onWorldChange: async (world, { keepPaint = true } = {}) => {
      exitPointerLock();
      await applyWorldToTerrain(world, { keepPaint });
      islandUI.syncPaintFromEditor(terrainEditor);
    },
  });
  islandUI.setWorld(worldParams);
  islandUI.syncPaintFromEditor(terrainEditor);

  const modeBadge = document.getElementById('mode-badge');
  const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 500);
  const cameraOffset = new THREE.Vector3(0, 3.5, 8);

  const input = new InputManager(canvas, {
    onToggleGrid: () => { worldGrid.visible = !worldGrid.visible; },
    onToggleMinimap: () => minimap.toggleExpanded(),
    onToggleFly: () => {
      if (terrainEditor.active) return;
      player.toggleFlyMode();
      if (modeBadge && !terrainEditor.active) {
        const labels = { fly: '飞行模式', climb: '攀爬中' };
        const text = labels[player.mode] ?? '';
        modeBadge.textContent = text;
        modeBadge.classList.toggle('visible', !!text);
      }
    },
    onToggleEditor: () => {
      if (islandUI.visible) {
        islandUI.hide();
        input.islandPanelActive = false;
      }
      const active = terrainEditor.toggle();
      input.editorActive = active;
      exitPointerLock();
      canvas.classList.toggle('editor-mode', active);
      updateEditorUI(terrainEditor, active);
      if (!active && modeBadge) modeBadge.classList.remove('visible');
    },
    onToggleIslandPanel: () => {
      if (terrainEditor.active) {
        terrainEditor.active = false;
        terrainEditor.brushRing.visible = false;
        input.editorActive = false;
        canvas.classList.remove('editor-mode');
        updateEditorUI(terrainEditor, false);
      }
      const open = islandUI.toggle();
      input.islandPanelActive = open;
      if (open) exitPointerLock();
      if (modeBadge) {
        modeBadge.textContent = open ? '岛屿参数' : '';
        modeBadge.classList.toggle('visible', open);
      }
    },
    onBrushResize: (delta) => {
      terrainEditor.setBrushRadius(terrainEditor.brushRadius + delta);
      terrainEditor.brushRing.scale.setScalar(terrainEditor.brushRadius);
      updateEditorUI(terrainEditor, terrainEditor.active);
    },
  });

  terrainEditor.setupInput(canvas, camera, exitPointerLock);

  const onPaintChange = () => {
    if (islandUI.visible) islandUI.syncPaintFromEditor(terrainEditor);
  };
  const origRebuild = terrainEditor._rebuildMesh.bind(terrainEditor);
  terrainEditor._rebuildMesh = function patchedRebuild() {
    origRebuild();
    onPaintChange();
  };

  document.getElementById('editor-reset')?.addEventListener('click', () => {
    terrainEditor.resetEdits();
    onPaintChange();
    saveWorld(islandUI.getWorld(), terrainEditor);
  });

  document.getElementById('editor-export')?.addEventListener('click', () => {
    islandUI.syncPaintFromEditor(terrainEditor);
    const json = worldToJSON(islandUI.getWorld(), terrainEditor);
    navigator.clipboard?.writeText(json);
  });

  document.getElementById('editor-strength-up')?.addEventListener('click', () => {
    terrainEditor.setBrushStrength(terrainEditor.brushStrength + 2);
    updateEditorUI(terrainEditor, terrainEditor.active);
  });

  document.getElementById('editor-strength-down')?.addEventListener('click', () => {
    terrainEditor.setBrushStrength(terrainEditor.brushStrength - 2);
    updateEditorUI(terrainEditor, terrainEditor.active);
  });

  try {
    const legacyPaint = localStorage.getItem('shanhai-terrain-edits');
    if (legacyPaint && !worldParams.paintDeltas) {
      terrainEditor.importEdits(JSON.parse(legacyPaint));
    }
  } catch (_) { /* ignore */ }

  window.addEventListener('beforeunload', () => {
    saveWorld(islandUI.getWorld(), terrainEditor);
  });

  setupCoordinateLogger(player, input);

  function updateCamera() {
    const yaw = input.cameraYaw;
    const pitch = input.cameraPitch;
    const dist = cameraOffset.length();
    const offset = new THREE.Vector3(
      Math.sin(yaw) * Math.cos(pitch) * dist,
      Math.sin(pitch) * dist + 2,
      Math.cos(yaw) * Math.cos(pitch) * dist
    );
    const target = player.position.clone().add(new THREE.Vector3(0, 1.8, 0));
    camera.position.copy(target).add(offset);
    camera.lookAt(target);
  }

  const post = createPostProcessing(renderer, scene, camera);
  const clock = new THREE.Clock();
  let elapsed = 0;

  loading.setProgress(1, '进入山海…');
  await loading.hide();

  function animate() {
    requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.05);
    elapsed += dt;

    if (!terrainEditor.active) {
      player.update(dt, input.getMovementInput(), input.cameraYaw);
    } else if (player.isGrounded) {
      player.mesh.position.y = getHeight(player.mesh.position.x, player.mesh.position.z);
    }

    updateCamera();
    ocean.userData.animate(elapsed);
    minimap.update(player.position, player.mesh.rotation.y, player.state);

    if (modeBadge && player.mode === 'climb' && !terrainEditor.active) {
      modeBadge.textContent = '攀爬中';
      modeBadge.classList.add('visible');
    } else if (modeBadge && player.mode !== 'fly' && !terrainEditor.active) {
      modeBadge.classList.remove('visible');
    }

    post.composer.render();
  }

  animate();

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    post.resize(window.innerWidth, window.innerHeight);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  const detail = err?.message ? ` — ${err.message}` : '';
  loading.setProgress(0, `加载失败${detail} · 请刷新页面`);
});
