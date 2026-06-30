/**
 * Object-based collision registry.
 * Terrain is ONLY the ground floor — solids, platforms, and climbables are separate hitboxes.
 */
export class ColliderRegistry {
  constructor() {
    this.climbables = [];
    this.platforms = [];
    this.solids = [];
  }

  registerSolid(data) {
    const entry = {
      id: data.id,
      x: data.x,
      z: data.z,
      minY: data.minY,
      maxY: data.maxY,
      radius: data.radius,
      label: data.label ?? data.id,
    };
    this.solids.push(entry);
    return entry;
  }

  registerClimbable(data) {
    const entry = {
      id: data.id,
      x: data.x,
      z: data.z,
      baseY: data.baseY,
      radius: data.radius,
      minY: data.baseY,
      maxY: data.baseY + data.height,
      height: data.height,
      mesh: data.mesh ?? null,
      label: data.label ?? data.id,
    };
    this.climbables.push(entry);
    return entry;
  }

  registerPlatform(data) {
    const entry = {
      id: data.id,
      x: data.x,
      z: data.z,
      y: data.y,
      radius: data.radius,
      label: data.label ?? data.id,
    };
    this.platforms.push(entry);
    return entry;
  }

  findNearestClimbable(px, pz, maxDist = 4) {
    let best = null;
    let bestDist = maxDist;
    for (const c of this.climbables) {
      const dx = px - c.x;
      const dz = pz - c.z;
      const d = Math.sqrt(dx * dx + dz * dz) - c.radius;
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best;
  }

  /**
   * Push player out of solid cylinders. Blocks walking INTO objects.
   * Fly mode skips solids (creative testing).
   */
  resolveSolidCollisions(px, pz, py, playerRadius = 0.5, { flyMode = false } = {}) {
    if (flyMode) return { x: px, z: pz };

    let x = px;
    let z = pz;

    for (let pass = 0; pass < 5; pass++) {
      for (const s of this.solids) {
        if (py < s.minY - 1 || py > s.maxY + 1) continue;

        const dx = x - s.x;
        const dz = z - s.z;
        const horiz = Math.sqrt(dx * dx + dz * dz);
        const minDist = s.radius + playerRadius;

        if (horiz < minDist) {
          if (horiz < 0.001) {
            x = s.x + minDist;
          } else {
            const push = (minDist - horiz) / horiz;
            x += dx * push;
            z += dz * push;
          }
        }
      }
    }

    return { x, z };
  }

  resolveSupport(px, py, pz, terrainY, velocityY, activePlatformId) {
    let supportY = terrainY;
    let newActivePlatform = null;

    for (const p of this.platforms) {
      const dx = px - p.x;
      const dz = pz - p.z;
      const horiz = Math.sqrt(dx * dx + dz * dz);
      if (horiz > p.radius) continue;

      const onTop = py >= p.y - 0.45 && py <= p.y + 1.4;
      const fallingOnto = velocityY <= 0.5 && py >= p.y - 2.0 && py <= p.y + 1.0;

      if (activePlatformId === p.id && onTop) {
        supportY = Math.max(supportY, p.y);
        newActivePlatform = p.id;
      } else if (fallingOnto) {
        supportY = Math.max(supportY, p.y);
        newActivePlatform = p.id;
      }
    }

    return { supportY, activePlatformId: newActivePlatform };
  }
}
