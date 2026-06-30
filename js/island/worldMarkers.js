/** Map pin colors and labels derived from island parameter world state */

export const MARKER_COLORS = {
  island: 0xe8d8a0,
  spawn: 0x60c0ff,
  mountain: 0xff7050,
  hill: 0x70c090,
  crescent: 0x7090e0,
  hole: 0xa06060,
  clearing: 0xc0b070,
  water: 0x40a0c8,
};

/**
 * Build marker list for 3D grid + minimap from current world params.
 * Labels mirror the island editor cards (島1, 山峰1, …).
 */
export function collectWorldMarkers(world) {
  if (!world?.islands?.length) return [];

  const markers = [];

  markers.push({
    x: world.spawnX ?? 0,
    z: world.spawnZ ?? 30,
    label: '出生',
    color: MARKER_COLORS.spawn,
  });

  world.islands.forEach((island, islandIdx) => {
    const islandN = islandIdx + 1;

    markers.push({
      x: island.centerX,
      z: island.centerZ,
      label: `島${islandN}`,
      color: MARKER_COLORS.island,
    });

    island.mountains?.forEach((m, i) => {
      markers.push({
        x: island.centerX + m.x,
        z: island.centerZ + m.z,
        label: `山峰${i + 1}`,
        color: MARKER_COLORS.mountain,
      });
    });

    island.hills?.forEach((h, i) => {
      markers.push({
        x: island.centerX + h.x,
        z: island.centerZ + h.z,
        label: `丘陵${i + 1}`,
        color: MARKER_COLORS.hill,
      });
    });

    island.crescents?.forEach((c, i) => {
      const ang = (c.biteAngle * Math.PI) / 180;
      markers.push({
        x: island.centerX + Math.sin(ang) * c.biteOffset,
        z: island.centerZ + Math.cos(ang) * c.biteOffset,
        label: `新月${i + 1}`,
        color: MARKER_COLORS.crescent,
      });
    });

    island.holes?.forEach((hole, i) => {
      markers.push({
        x: island.centerX + hole.x,
        z: island.centerZ + hole.z,
        label: hole.fillWater ? `湖水${i + 1}` : `坑洞${i + 1}`,
        color: hole.fillWater ? MARKER_COLORS.water : MARKER_COLORS.hole,
      });
    });

    island.clearings?.forEach((cl, i) => {
      markers.push({
        x: island.centerX + cl.x,
        z: island.centerZ + cl.z,
        label: `平地${i + 1}`,
        color: MARKER_COLORS.clearing,
      });
    });
  });

  return markers;
}
