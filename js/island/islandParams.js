/** Per-island field groups */
export const ISLAND_FIELD_GROUPS = [
  {
    id: 'shape',
    label: '形状',
    fields: [
      { key: 'centerX', label: '岛心 X', min: -200, max: 200, step: 1, default: 0 },
      { key: 'centerZ', label: '岛心 Z', min: -200, max: 200, step: 1, default: 0 },
      { key: 'radius', label: '半径', min: 40, max: 200, step: 1, default: 120 },
      { key: 'shapeStretch', label: '拉伸比', min: 1, max: 3, step: 0.1, default: 1, hint: '1=圆' },
      { key: 'shapeAngle', label: '拉伸角°', min: 0, max: 360, step: 1, default: 0 },
      { key: 'coastSoftness', label: '海岸柔和', min: 0.05, max: 0.6, step: 0.05, default: 0.38 },
    ],
  },
  {
    id: 'base',
    label: '地势',
    fields: [
      { key: 'baseHeight', label: '基准高度', min: 0, max: 40, step: 0.5, default: 8 },
      { key: 'noiseAmplitude', label: '起伏幅度', min: 0, max: 10, step: 0.1, default: 1 },
      { key: 'noiseFrequency', label: '起伏频率', min: 0.002, max: 0.05, step: 0.001, default: 0.018 },
    ],
  },
  {
    id: 'coast',
    label: '海岸',
    fields: [
      { key: 'coastAngle', label: '海向°', min: 0, max: 360, step: 1, default: 180 },
      { key: 'cliffStart', label: '崖线', min: -80, max: 80, step: 1, default: -30 },
      { key: 'cliffDrop', label: '崖落差', min: 0, max: 50, step: 1, default: 6 },
      { key: 'cliffRugged', label: '崖粗糙', min: 0, max: 8, step: 0.1, default: 1 },
    ],
  },
];

export const WORLD_FIELDS = [
  { key: 'underwaterDepth', label: '水深', min: 2, max: 30, step: 1, default: 10 },
  { key: 'spawnX', label: '出生 X', min: -200, max: 200, step: 1, default: 0, hint: '仅首次进入游戏' },
  { key: 'spawnZ', label: '出生 Z', min: -200, max: 200, step: 1, default: 30, hint: '仅首次进入游戏' },
];

/** Sharp tall peaks — high steepness, larger height range */
export const MOUNTAIN_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0 },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0 },
  { key: 'height', label: '峰高', min: 5, max: 80, step: 1, default: 30 },
  { key: 'sizeX', label: '宽 X', min: 5, max: 100, step: 1, default: 28 },
  { key: 'sizeZ', label: '宽 Z', min: 5, max: 100, step: 1, default: 28 },
  { key: 'steepness', label: '陡度', min: 1.5, max: 5, step: 0.1, default: 2.5, hint: '尖峰' },
];

/** Gentle rolling bumps — low height, soft dome */
export const HILL_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0 },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0 },
  { key: 'height', label: '丘高', min: 0.5, max: 12, step: 0.5, default: 3 },
  { key: 'sizeX', label: '宽 X', min: 8, max: 80, step: 1, default: 28 },
  { key: 'sizeZ', label: '宽 Z', min: 8, max: 80, step: 1, default: 28 },
  { key: 'softness', label: '柔和', min: 0.5, max: 1.5, step: 0.05, default: 0.85, hint: '平缓圆丘' },
];

/** Cut a bite from island coastline — add multiple per island */
export const CRESCENT_FIELDS = [
  { key: 'biteAngle', label: '开口°', min: 0, max: 360, step: 1, default: 45, hint: '缺口朝向' },
  { key: 'biteOffset', label: '偏移', min: 0, max: 120, step: 1, default: 55, hint: '咬痕中心离岛心' },
  { key: 'biteRadius', label: '咬痕半径', min: 10, max: 120, step: 1, default: 70 },
];

/** Dig depressions into terrain */
export const HOLE_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0 },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0 },
  { key: 'depth', label: '深度', min: 1, max: 40, step: 1, default: 8 },
  { key: 'sizeX', label: '宽 X', min: 5, max: 80, step: 1, default: 20 },
  { key: 'sizeZ', label: '宽 Z', min: 5, max: 80, step: 1, default: 20 },
  { key: 'steepness', label: '壁陡度', min: 0.8, max: 4, step: 0.1, default: 2, hint: '坑壁陡峭程度' },
];

export const CLEARING_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0 },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0 },
  { key: 'radius', label: '半径', min: 3, max: 50, step: 1, default: 14 },
  { key: 'maxHeight', label: '高度', min: -5, max: 40, step: 0.1, default: 10 },
];

export const ISLAND_PARAMS_STORAGE_KEY = 'shanhai-world-params-v4';

export function createDefaultIsland() {
  const island = {
    mountains: [],
    hills: [],
    crescents: [],
    holes: [],
    clearings: [],
  };
  for (const group of ISLAND_FIELD_GROUPS) {
    for (const field of group.fields) {
      island[field.key] = field.default;
    }
  }
  return island;
}

export function createDefaultWorld() {
  const world = { islands: [createDefaultIsland()] };
  for (const field of WORLD_FIELDS) {
    world[field.key] = field.default;
  }
  return world;
}

export const PRESET_DEFAULT = {
  underwaterDepth: 10,
  spawnX: 0,
  spawnZ: 30,
  islands: [
    {
      ...createDefaultIsland(),
      centerX: 0,
      centerZ: 0,
      radius: 120,
      shapeStretch: 1,
      coastSoftness: 0.4,
      baseHeight: 8,
      noiseAmplitude: 1,
    },
  ],
};

export const PRESET_TWIN = {
  underwaterDepth: 10,
  spawnX: 0,
  spawnZ: 40,
  islands: [
    {
      ...createDefaultIsland(),
      centerX: -70,
      centerZ: 0,
      radius: 90,
      baseHeight: 7,
    },
    {
      ...createDefaultIsland(),
      centerX: 75,
      centerZ: 10,
      radius: 85,
      baseHeight: 6,
    },
  ],
};

export const PRESET_PEAKS = {
  underwaterDepth: 12,
  spawnX: 0,
  spawnZ: 45,
  islands: [
    {
      ...createDefaultIsland(),
      radius: 150,
      baseHeight: 8,
      noiseAmplitude: 2,
      mountains: [
        { x: -40, z: -15, height: 42, sizeX: 48, sizeZ: 40, steepness: 2.8 },
        { x: 35, z: 12, height: 36, sizeX: 38, sizeZ: 42, steepness: 2.5 },
      ],
    },
  ],
};

export const PRESETS = {
  default: { label: '圆形孤岛 (默认)', params: PRESET_DEFAULT },
  twin: { label: '双岛', params: PRESET_TWIN },
  peaks: { label: '多峰山岛', params: PRESET_PEAKS },
};

export function cloneWorld(world) {
  return JSON.parse(JSON.stringify(world));
}

function clampField(value, field) {
  const n = Number(value);
  if (Number.isNaN(n)) return field.default;
  return Math.min(field.max, Math.max(field.min, n));
}

function migrateSizedFeature(item, fields) {
  const out = {};
  for (const field of fields) {
    if (field.key === 'sizeX' || field.key === 'sizeZ') continue;
    out[field.key] = clampField(item?.[field.key], field);
  }
  const sizeXField = fields.find((f) => f.key === 'sizeX');
  const sizeZField = fields.find((f) => f.key === 'sizeZ');
  if (sizeXField) {
    out.sizeX = item?.sizeX != null
      ? clampField(item.sizeX, sizeXField)
      : clampField(item?.radius ?? sizeXField.default, sizeXField);
  }
  if (sizeZField) {
    out.sizeZ = item?.sizeZ != null
      ? clampField(item.sizeZ, sizeZField)
      : clampField(item?.radius ?? sizeZField.default, sizeZField);
  }
  return out;
}

function sanitizeFeatureList(list, fields, maxCount) {
  if (!Array.isArray(list)) return [];
  return list.slice(0, maxCount).map((item) => migrateSizedFeature(item, fields));
}

export function sanitizeIsland(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const island = createDefaultIsland();
  for (const group of ISLAND_FIELD_GROUPS) {
    for (const field of group.fields) {
      if (raw[field.key] !== undefined) {
        island[field.key] = clampField(raw[field.key], field);
      }
    }
  }

  let crescents = sanitizeFeatureList(raw.crescents, CRESCENT_FIELDS, 8);
  if (crescents.length === 0 && Number(raw.shapeMode) >= 0.5 && Number(raw.biteRadius) > 0) {
    crescents = [{
      biteAngle: raw.biteAngle ?? 45,
      biteOffset: raw.biteOffset ?? 55,
      biteRadius: raw.biteRadius ?? 70,
    }];
  }

  island.mountains = sanitizeFeatureList(raw.mountains, MOUNTAIN_FIELDS, 8);
  island.hills = sanitizeFeatureList(raw.hills, HILL_FIELDS, 8);
  island.crescents = crescents;
  island.holes = sanitizeFeatureList(raw.holes, HOLE_FIELDS, 8);
  island.clearings = sanitizeFeatureList(raw.clearings, CLEARING_FIELDS, 8);
  return island;
}

export function sanitizeWorld(raw) {
  raw = raw && typeof raw === 'object' ? raw : {};
  const world = createDefaultWorld();
  for (const field of WORLD_FIELDS) {
    if (raw[field.key] !== undefined) {
      world[field.key] = clampField(raw[field.key], field);
    }
  }
  if (Array.isArray(raw.islands) && raw.islands.length > 0) {
    world.islands = raw.islands.slice(0, 8).map((isl) => sanitizeIsland(isl));
  }
  if (raw.paintDeltas && typeof raw.paintDeltas === 'object') {
    const paint = sanitizePaintDeltas(raw.paintDeltas);
    if (paint) world.paintDeltas = paint;
  }
  return world;
}

function sanitizePaintDeltas(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.deltas)) return null;
  const segments = Number(raw.segments);
  const size = Number(raw.size);
  const expectedLen = (segments + 1) * (segments + 1);
  if (
    !Number.isFinite(segments) ||
    !Number.isFinite(size) ||
    raw.deltas.length !== expectedLen
  ) {
    return null;
  }
  return {
    version: raw.version ?? 1,
    segments,
    size,
    deltas: raw.deltas.map((v) => (Number.isFinite(Number(v)) ? Number(v) : 0)),
  };
}

export function migrateWorld(raw) {
  try {
    if (!raw || typeof raw !== 'object') return createDefaultWorld();
    if (raw.islands?.length) return sanitizeWorld(raw);
    if (raw.centerX !== undefined || raw.radius !== undefined) {
      return sanitizeWorld({
        underwaterDepth: raw.underwaterDepth ?? 10,
        spawnX: raw.spawnX ?? 0,
        spawnZ: raw.spawnZ ?? 30,
        islands: [raw],
        paintDeltas: raw.paintDeltas,
      });
    }
    return createDefaultWorld();
  } catch (e) {
    console.warn('[Island] migrateWorld failed, using default', e);
    return createDefaultWorld();
  }
}

export function sanitizeParams(raw) {
  return migrateWorld(raw);
}

export const PRESET_COASTAL = PRESET_DEFAULT;
