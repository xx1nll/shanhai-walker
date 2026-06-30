import { migrateWorld, sanitizeWorld, validateWorldImport, WorldValidationError } from './islandParams.js';

/** Build a portable world document (islands + optional hand-painted height deltas). */
export function buildWorldExport(world, terrainEditor) {
  const payload = {
    version: 3,
    ...sanitizeWorld(world),
  };

  if (terrainEditor?.hasPaintEdits?.()) {
    payload.paintDeltas = terrainEditor.exportEdits();
  } else if (world?.paintDeltas) {
    payload.paintDeltas = world.paintDeltas;
  }

  return payload;
}

/** Parse pasted/downloaded JSON into a sanitized world (with paintDeltas when present). */
export function parseWorldImport(raw) {
  let data;
  try {
    data = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    throw new SyntaxError('JSON 格式无效');
  }
  const errors = validateWorldImport(data);
  if (errors.length > 0) {
    throw new WorldValidationError(errors);
  }
  const world = migrateWorld(data);

  const paint = data?.paintDeltas ?? data?.paintLayer;
  if (paint && typeof paint === 'object') {
    world.paintDeltas = paint;
  }

  return world;
}

export function worldToJSON(world, terrainEditor, pretty = true) {
  const payload = buildWorldExport(world, terrainEditor);
  return pretty ? JSON.stringify(payload, null, 2) : JSON.stringify(payload);
}

export { WorldValidationError } from './islandParams.js';
