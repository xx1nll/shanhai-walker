/** Per-island field groups */
export const ISLAND_FIELD_GROUPS = [
  {
    id: 'shape',
    label: '形状',
    fields: [
      { key: 'centerX', label: '岛心 X', min: -200, max: 200, step: 1, default: 0, desc: '岛屿中心在世界地图上的东西位置（东为正）' },
      { key: 'centerZ', label: '岛心 Z', min: -200, max: 200, step: 1, default: 0, desc: '岛屿中心在世界地图上的南北位置（北为正）' },
      { key: 'radius', label: '半径', min: 40, max: 200, step: 1, default: 120, desc: '岛屿大致尺寸。80=小岛，120=中等，160+=大岛' },
      { key: 'shapeStretch', label: '拉伸比', min: 1, max: 3, step: 0.1, default: 1, desc: '1=正圆/正多边形；>1 时拉长成椭圆或长条岛' },
      { key: 'shapeAngle', label: '旋转°', min: 0, max: 360, step: 1, default: 0, desc: '旋转整个岛屿轮廓（含拉伸方向）' },
      { key: 'coastSoftness', label: '海岸柔和', min: 0.05, max: 0.6, step: 0.05, default: 0.38, desc: '海岸过渡柔和度。小=硬岸线；大=平缓沙滩/泥岸' },
      { key: 'shapeKind', label: '轮廓类型', type: 'select', options: null, default: 'circle', desc: '岛屿外轮廓：圆形、正多边形、星形或环形' },
      { key: 'sides', label: '边数', min: 0, max: 12, step: 1, default: 0, desc: '轮廓边数：0=圆/椭圆，3=三角岛，4=方岛，6=六角岛' },
      { key: 'ringThickness', label: '环厚度', min: 0.1, max: 0.85, step: 0.05, default: 0.35, desc: '仅环形轮廓：环带宽度占外径的比例' },
    ],
  },
  {
    id: 'base',
    label: '地势',
    fields: [
      { key: 'baseHeight', label: '基准高度', min: 0, max: 40, step: 0.5, default: 8, desc: '全岛平均地面高度。4=低沙洲，8=正常，15=高原' },
      { key: 'noiseAmplitude', label: '起伏幅度', min: 0, max: 10, step: 0.1, default: 1, desc: '地表微小起伏强度。0=完全平坦，3=很颠簸' },
      { key: 'noiseFrequency', label: '起伏频率', min: 0.002, max: 0.05, step: 0.001, default: 0.018, desc: '起伏波长。大=细波纹，小=宽缓起伏' },
    ],
  },
  {
    id: 'coast',
    label: '海岸',
    fields: [
      { key: 'coastAngle', label: '海向°', min: 0, max: 360, step: 1, default: 180, desc: '哪一面朝向开阔海洋。0=北，90=东，180=南（默认），270=西' },
      { key: 'cliffStart', label: '崖线', min: -80, max: 80, step: 1, default: -30, desc: '从岛心朝海向测量，海崖开始出现的距离。越负=崖壁越靠内陆' },
      { key: 'cliffDrop', label: '崖落差', min: 0, max: 50, step: 1, default: 6, desc: '临海一侧地形降低多少。3=缓坡，8=中等悬崖，18=陡崖' },
      { key: 'cliffRugged', label: '崖粗糙', min: 0, max: 8, step: 0.1, default: 1, desc: '崖壁表面的崎岖噪声。0=光滑，2=岩石感，5=嶙峋' },
    ],
  },
];

export const WORLD_FIELDS = [
  { key: 'underwaterDepth', label: '水深', min: 2, max: 30, step: 1, default: 10, desc: '开阔海域海底比海平面低多少' },
  { key: 'spawnX', label: '出生 X', min: -200, max: 200, step: 1, default: 0, desc: '玩家首次进入时的东西位置（仅首次生效）' },
  { key: 'spawnZ', label: '出生 Z', min: -200, max: 200, step: 1, default: 30, desc: '玩家首次进入时的南北位置（仅首次生效）' },
  { key: 'oceanDeepColor', label: '海水深色', type: 'color', default: '#2a5a7a', desc: '远海/深水区域的颜色' },
  { key: 'oceanShallowColor', label: '海水浅色', type: 'color', default: '#4a8aa8', desc: '近岸/浅水区域的颜色' },
];

export const SHAPE_KIND_OPTIONS = [
  { value: 'circle', label: '圆形' },
  { value: 'polygon', label: '正多边形' },
  { value: 'star', label: '星形' },
  { value: 'ring', label: '环形' },
];

export const SHAPE_FIELDS = [
  { key: 'shapeKind', label: '形状类型', type: 'select', options: SHAPE_KIND_OPTIONS, default: 'circle', desc: '特征轮廓：圆、正多边形、星形或环形' },
  { key: 'sides', label: '边数', min: 0, max: 12, step: 1, default: 0, desc: '0=圆，3=三角，4=方，5=五角，6=六角…' },
  { key: 'ringThickness', label: '环厚度', min: 0.1, max: 0.85, step: 0.05, default: 0.35, desc: '仅环形：环带宽度占比' },
  { key: 'shapeAngle', label: '旋转°', min: 0, max: 360, step: 1, default: 0, desc: '旋转此特征的轮廓' },
];

// Wire island outline select options (defined after SHAPE_KIND_OPTIONS)
ISLAND_FIELD_GROUPS[0].fields.find((f) => f.key === 'shapeKind').options = SHAPE_KIND_OPTIONS;

export const MOUNTAIN_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的东西偏移' },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的南北偏移' },
  { key: 'height', label: '峰高', min: 5, max: 80, step: 1, default: 30, desc: '山峰从地面抬升的高度' },
  { key: 'sizeX', label: '顶宽 X', min: 5, max: 100, step: 1, default: 28, desc: '山顶/平顶区域的东西宽度' },
  { key: 'sizeZ', label: '顶宽 Z', min: 5, max: 100, step: 1, default: 28, desc: '山顶/平顶区域的南北宽度' },
  { key: 'peakRoundness', label: '頂形', min: 0, max: 1, step: 0.05, default: 0.5, desc: '0=尖頭尖锥，0.5=圆顶，1=圓頭平顶台地' },
  { key: 'steepness', label: '坡陡度', min: 0.8, max: 5, step: 0.1, default: 1.5, desc: '山坡陡峭程度。小=缓坡，大=峭壁' },
  { key: 'color', label: '岩色', type: 'color', default: '#8a7a6a', desc: '山体岩石染色' },
  ...SHAPE_FIELDS,
];

export const HILL_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的东西偏移' },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的南北偏移' },
  { key: 'height', label: '丘高', min: 0.5, max: 30, step: 0.5, default: 3, desc: '丘陵隆起高度（比山峰矮而广）' },
  { key: 'sizeX', label: '宽 X', min: 8, max: 120, step: 1, default: 28, desc: '丘陵东西方向展布宽度' },
  { key: 'sizeZ', label: '宽 Z', min: 8, max: 120, step: 1, default: 28, desc: '丘陵南北方向展布宽度' },
  { key: 'softness', label: '柔和', min: 0.5, max: 1.5, step: 0.05, default: 0.85, desc: '穹顶圆润度。小=宽缓，大=稍尖' },
];

export const CRESCENT_FIELDS = [
  { key: 'biteAngle', label: '开口°', min: 0, max: 360, step: 1, default: 45, desc: '海湾缺口朝向（从岛心向外）' },
  { key: 'biteOffset', label: '偏移', min: 0, max: 120, step: 1, default: 55, desc: '咬痕中心离岛心的距离，约等于半径一半时咬在海岸' },
  { key: 'biteRadius', label: '咬痕半径', min: 10, max: 120, step: 1, default: 70, desc: '缺口圆弧的大小，越大湾口越宽' },
];

export const HOLE_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的东西偏移' },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的南北偏移' },
  { key: 'depth', label: '深度', min: 1, max: 40, step: 1, default: 8, desc: '坑洞向下挖掘的深度' },
  { key: 'sizeX', label: '底宽 X', min: 5, max: 80, step: 1, default: 20, desc: '坑底平坦区域的东西宽度' },
  { key: 'sizeZ', label: '底宽 Z', min: 5, max: 80, step: 1, default: 20, desc: '坑底平坦区域的南北宽度' },
  { key: 'peakRoundness', label: '底形', min: 0, max: 1, step: 0.05, default: 0.7, desc: '0=尖底V形，1=平底盆形（倒过来的山顶形）' },
  { key: 'steepness', label: '壁陡度', min: 0.8, max: 5, step: 0.1, default: 1.5, desc: '坑壁陡峭程度。默认较缓，不像尖峰' },
  ...SHAPE_FIELDS,
  { key: 'fillWater', label: '注水', min: 0, max: 1, step: 1, default: 0, desc: '1=在坑内填充水面（贴合坑形）' },
  { key: 'waterLevel', label: '水面高', min: -5, max: 25, step: 0.5, default: -1.5, desc: '水面的绝对高度。-1.5≈海平面' },
  { key: 'waterColor', label: '水色', type: 'color', default: '#3a8aa8', desc: '坑内湖水颜色' },
];

export const CLEARING_FIELDS = [
  { key: 'x', label: 'X', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的东西偏移' },
  { key: 'z', label: 'Z', min: -250, max: 250, step: 1, default: 0, desc: '相对岛心的南北偏移' },
  { key: 'sizeX', label: '宽 X', min: 3, max: 80, step: 1, default: 14, desc: '平地的东西宽度' },
  { key: 'sizeZ', label: '宽 Z', min: 3, max: 80, step: 1, default: 14, desc: '平地的南北宽度' },
  { key: 'maxHeight', label: '高度', min: -5, max: 40, step: 0.1, default: 10, desc: '压平后的目标高度' },
  ...SHAPE_FIELDS,
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
  oceanDeepColor: '#2a5a7a',
  oceanShallowColor: '#4a8aa8',
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
        { x: -40, z: -15, height: 42, sizeX: 48, sizeZ: 40, peakRoundness: 0.5, steepness: 1.5 },
        { x: 35, z: 12, height: 36, sizeX: 38, sizeZ: 42, peakRoundness: 0.5, steepness: 1.5 },
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
  if (field.type === 'color') return sanitizeColorField(value, field.default);
  if (field.type === 'select') {
    const opts = field.options?.map((o) => o.value) ?? [];
    return opts.includes(value) ? value : field.default;
  }
  const n = Number(value);
  if (Number.isNaN(n)) return field.default;
  return Math.min(field.max, Math.max(field.min, n));
}

function sanitizeColorField(value, fallback = '#888888') {
  if (value == null) return fallback;
  if (typeof value === 'number') {
    return `#${value.toString(16).padStart(6, '0')}`;
  }
  const s = String(value).replace('#', '').trim();
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toLowerCase()}`;
  return fallback;
}

function sanitizeShapeFields(item) {
  const kinds = ['circle', 'polygon', 'star', 'ring'];
  let sides = Math.round(Number(item?.sides) || 0);
  sides = Math.min(12, Math.max(0, sides));
  let shapeKind = kinds.includes(item?.shapeKind) ? item.shapeKind : 'circle';
  if (sides <= 0) {
    shapeKind = 'circle';
    sides = 0;
  }
  const ringThickness = Math.min(0.85, Math.max(0.1, Number(item?.ringThickness) || 0.35));
  const shapeAngle = Math.min(360, Math.max(0, Number(item?.shapeAngle) || 0));
  return { shapeKind, sides, ringThickness, shapeAngle };
}

function migrateSizedFeature(item, fields) {
  const out = { ...sanitizeShapeFields(item) };
  for (const field of fields) {
    if (field.key === 'sizeX' || field.key === 'sizeZ') continue;
    if (SHAPE_FIELDS.some((f) => f.key === field.key)) continue;
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

function migrateWaterBodiesToHoles(rawHoles, rawWaterBodies) {
  const holes = Array.isArray(rawHoles) ? [...rawHoles] : [];
  for (const wb of rawWaterBodies ?? []) {
    holes.push({
      x: wb.x ?? 0,
      z: wb.z ?? 0,
      depth: wb.floorDepth ?? wb.depth ?? 6,
      sizeX: wb.sizeX ?? 24,
      sizeZ: wb.sizeZ ?? 24,
      steepness: wb.steepness ?? 1.5,
      peakRoundness: wb.peakRoundness ?? 0.7,
      shapeKind: wb.shapeKind,
      sides: wb.sides,
      ringThickness: wb.ringThickness,
      shapeAngle: wb.shapeAngle,
      fillWater: 1,
      waterLevel: wb.waterLevel ?? -1.5,
      waterColor: wb.color ?? wb.waterColor ?? '#3a8aa8',
    });
  }
  return holes;
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
  if ((island.sides ?? 0) <= 0) {
    island.shapeKind = 'circle';
    island.sides = 0;
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
  const mergedHoles = migrateWaterBodiesToHoles(raw.holes, raw.waterBodies);
  island.holes = sanitizeFeatureList(mergedHoles, HOLE_FIELDS, 8);
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

export class WorldValidationError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'WorldValidationError';
    this.errors = errors;
  }
}

function validateFieldValue(path, value, field) {
  const errors = [];
  if (value === undefined || value === null) return errors;

  if (field.type === 'color') {
    const s = String(value).replace('#', '').trim();
    if (!/^[0-9a-fA-F]{6}$/.test(s)) errors.push(`${path}（${field.label}）: 无效颜色`);
    return errors;
  }
  if (field.type === 'select') {
    const opts = field.options?.map((o) => o.value) ?? [];
    if (!opts.includes(value)) errors.push(`${path}（${field.label}）: 无效选项 "${value}"`);
    return errors;
  }

  const n = Number(value);
  if (Number.isNaN(n)) {
    errors.push(`${path}（${field.label}）: 必须是数字`);
    return errors;
  }
  if (n < field.min || n > field.max) {
    errors.push(`${path}（${field.label}）: ${n} 超出范围 [${field.min}, ${field.max}]`);
  }
  return errors;
}

function validateFeatureList(path, list, fields, maxCount) {
  const errors = [];
  if (list === undefined) return errors;
  if (!Array.isArray(list)) {
    errors.push(`${path}: 必须是数组`);
    return errors;
  }
  if (list.length > maxCount) errors.push(`${path}: 最多 ${maxCount} 个`);
  list.forEach((item, i) => {
    if (!item || typeof item !== 'object') {
      errors.push(`${path}[${i}]: 必须是对象`);
      return;
    }
    for (const field of fields) {
      if (item[field.key] !== undefined) {
        errors.push(...validateFieldValue(`${path}[${i}].${field.key}`, item[field.key], field));
      }
    }
    const sizeField = fields.find((f) => f.key === 'sizeX');
    if (item.radius != null && sizeField) {
      errors.push(...validateFieldValue(`${path}[${i}].radius`, item.radius, { ...sizeField, label: 'radius' }));
    }
  });
  return errors;
}

function validateIslandRaw(raw, index) {
  const errors = [];
  const base = `islands[${index}]`;
  if (!raw || typeof raw !== 'object') return [`${base}: 必须是对象`];

  for (const group of ISLAND_FIELD_GROUPS) {
    for (const field of group.fields) {
      if (raw[field.key] !== undefined) {
        errors.push(...validateFieldValue(`${base}.${field.key}`, raw[field.key], field));
      }
    }
  }

  errors.push(...validateFeatureList(`${base}.mountains`, raw.mountains, MOUNTAIN_FIELDS, 8));
  errors.push(...validateFeatureList(`${base}.hills`, raw.hills, HILL_FIELDS, 8));
  errors.push(...validateFeatureList(`${base}.crescents`, raw.crescents, CRESCENT_FIELDS, 8));
  errors.push(...validateFeatureList(`${base}.holes`, raw.holes, HOLE_FIELDS, 8));
  errors.push(...validateFeatureList(`${base}.clearings`, raw.clearings, CLEARING_FIELDS, 8));

  return errors;
}

/** Strict validation for JSON import — returns error strings (empty = ok). */
export function validateWorldImport(raw) {
  const errors = [];
  if (!raw || typeof raw !== 'object') return ['根对象必须是 JSON 对象'];

  for (const field of WORLD_FIELDS) {
    if (raw[field.key] !== undefined) {
      errors.push(...validateFieldValue(field.key, raw[field.key], field));
    }
  }

  if (raw.islands !== undefined) {
    if (!Array.isArray(raw.islands)) errors.push('islands 必须是数组');
    else {
      if (raw.islands.length < 1) errors.push('islands 至少 1 个');
      if (raw.islands.length > 8) errors.push('islands 最多 8 个');
      raw.islands.forEach((isl, i) => errors.push(...validateIslandRaw(isl, i)));
    }
  }

  return errors;
}

export const PRESET_COASTAL = PRESET_DEFAULT;
