import * as THREE from 'three';
import { createPBR, PALETTE } from './materials.js';

const MOVE_SPEED = 10;
const SPRINT_MULTIPLIER = 1.6;
const JUMP_FORCE = 9;
const GRAVITY = 26;

const FLY_SPEED = 22;
const FLY_SPRINT = 40;
const FLY_VERTICAL = 16;

const GLIDE_GRAVITY = 4.5;
const GLIDE_SPEED = 13;
const GLIDE_SPRINT = 20;
const GLIDE_MIN_CLEARANCE = 3;

export const MovementMode = {
  NORMAL: 'normal',
  GLIDE: 'glide',
  FLY: 'fly',
  CLIMB: 'climb',
};

const AnimState = {
  IDLE: 'idle',
  WALK: 'walk',
  RUN: 'run',
  JUMP: 'jump',
  FALL: 'fall',
  GLIDE: 'glide',
  FLY: 'fly',
  CLIMB: 'climb',
};

const CLIMB_SPEED = 7;
const CLIMB_SPRINT = 11;

function buildCharacterMesh() {
  const mesh = new THREE.Group();
  const animRoot = new THREE.Group();
  mesh.add(animRoot);

  const robe = createPBR(PALETTE.robe, { roughness: 0.85 });
  const accent = createPBR(0x8a7a60, { roughness: 0.8 });
  const skin = createPBR(PALETTE.skin, { roughness: 0.75 });
  const dark = createPBR(0x2a2830, { roughness: 0.9 });
  const scrollMat = createPBR(0xc8b898, { roughness: 0.9 });

  const parts = {};

  parts.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.9, 6, 10), robe);
  parts.body.position.y = 1.1;
  parts.body.castShadow = true;
  animRoot.add(parts.body);

  parts.head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), skin);
  parts.head.position.y = 1.85;
  parts.head.castShadow = true;
  animRoot.add(parts.head);

  parts.hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.23, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    dark
  );
  parts.hair.position.set(0, 1.9, -0.02);
  animRoot.add(parts.hair);

  parts.hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.04, 16), accent);
  parts.hatBrim.position.y = 2.05;
  animRoot.add(parts.hatBrim);

  parts.hatTop = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.25, 12), accent);
  parts.hatTop.position.y = 2.2;
  animRoot.add(parts.hatTop);

  parts.leftLegPivot = new THREE.Group();
  parts.leftLegPivot.position.set(-0.14, 0.9, 0);
  parts.leftLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.45, 4, 6), dark);
  parts.leftLeg.position.y = -0.28;
  parts.leftLeg.castShadow = true;
  parts.leftLegPivot.add(parts.leftLeg);
  animRoot.add(parts.leftLegPivot);

  parts.rightLegPivot = new THREE.Group();
  parts.rightLegPivot.position.set(0.14, 0.9, 0);
  parts.rightLeg = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.45, 4, 6), dark);
  parts.rightLeg.position.y = -0.28;
  parts.rightLeg.castShadow = true;
  parts.rightLegPivot.add(parts.rightLeg);
  animRoot.add(parts.rightLegPivot);

  parts.leftArmPivot = new THREE.Group();
  parts.leftArmPivot.position.set(-0.38, 1.35, 0);
  parts.leftArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 4, 6), robe);
  parts.leftArm.position.y = -0.22;
  parts.leftArm.castShadow = true;
  parts.leftArmPivot.add(parts.leftArm);
  animRoot.add(parts.leftArmPivot);

  parts.rightArmPivot = new THREE.Group();
  parts.rightArmPivot.position.set(0.38, 1.35, 0);
  parts.rightArm = new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.38, 4, 6), robe);
  parts.rightArm.position.y = -0.22;
  parts.rightArm.castShadow = true;
  parts.rightArmPivot.add(parts.rightArm);
  animRoot.add(parts.rightArmPivot);

  parts.scroll = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.25), scrollMat);
  parts.scroll.position.set(0, 1.2, -0.28);
  animRoot.add(parts.scroll);

  parts.cape = new THREE.Mesh(
    new THREE.PlaneGeometry(0.55, 0.75),
    createPBR(0x2a4a6a, { side: THREE.DoubleSide, roughness: 0.9 })
  );
  parts.cape.position.set(0, 1.0, -0.22);
  parts.cape.rotation.x = 0.12;
  animRoot.add(parts.cape);

  // Glider — 斗笠 cloth wings (hidden until gliding)
  parts.glider = new THREE.Group();
  parts.glider.visible = false;
  const wingMat = createPBR(0xc8b898, { side: THREE.DoubleSide, roughness: 0.85 });
  const leftWing = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), wingMat);
  leftWing.position.set(-1.1, 1.5, -0.1);
  leftWing.rotation.set(0.3, 0.4, -0.3);
  const rightWing = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 0.9), wingMat);
  rightWing.position.set(1.1, 1.5, -0.1);
  rightWing.rotation.set(0.3, -0.4, 0.3);
  parts.glider.add(leftWing, rightWing);
  animRoot.add(parts.glider);

  return { mesh, animRoot, parts };
}

export class Player {
  constructor(getTerrainHeight, seaLevel = -1.5, colliders = null) {
    this.getTerrainHeight = getTerrainHeight;
    this.seaLevel = seaLevel;
    this.colliders = colliders;
    this.velocity = new THREE.Vector3();
    this.isGrounded = false;
    this.isMoving = false;
    this.isSprinting = false;
    this.movementMode = MovementMode.NORMAL;
    this.animState = AnimState.IDLE;
    this.animTime = 0;
    this.jumpTimer = 0;
    this.glideDeployed = false;
    this.climbTarget = null;
    this.climbAngle = 0;
    this.activePlatform = null;

    const built = buildCharacterMesh();
    this.mesh = built.mesh;
    this.animRoot = built.animRoot;
    this.parts = built.parts;

    this.mesh.position.set(0, 0, 38);
    this.mesh.rotation.y = Math.PI;
    this._snapToTerrain();
  }

  toggleFlyMode() {
    if (this.movementMode === MovementMode.FLY) {
      this.movementMode = MovementMode.NORMAL;
      this.glideDeployed = false;
      this.climbTarget = null;
      this._snapToTerrain();
    } else {
      this.movementMode = MovementMode.FLY;
      this.glideDeployed = false;
      this.climbTarget = null;
      this.velocity.set(0, 0, 0);
      this.isGrounded = false;
    }
  }

  tryStartClimb(interactPressed) {
    if (this.movementMode === MovementMode.FLY || !this.colliders) return false;
    if (!interactPressed) return false;

    const near = this.colliders.findNearestClimbable(
      this.mesh.position.x,
      this.mesh.position.z,
      6
    );
    if (near) {
      this._attachToClimbable(near);
      return true;
    }
    return false;
  }

  _attachToClimbable(climbable) {
    this.movementMode = MovementMode.CLIMB;
    this.climbTarget = climbable;
    this.velocity.set(0, 0, 0);
    this.isGrounded = false;
    this.glideDeployed = false;

    const dx = this.mesh.position.x - climbable.x;
    const dz = this.mesh.position.z - climbable.z;
    this.climbAngle = Math.atan2(dx, dz);
    this._snapToTrunkSurface();
  }

  _snapToTrunkSurface() {
    const c = this.climbTarget;
    if (!c) return;
    const r = c.radius + 0.55;
    this.mesh.position.x = c.x + Math.sin(this.climbAngle) * r;
    this.mesh.position.z = c.z + Math.cos(this.climbAngle) * r;
    this.mesh.rotation.y = this.climbAngle;
  }

  get mode() {
    return this.movementMode;
  }

  setGetHeight(fn) {
    this.getTerrainHeight = fn;
  }

  _groundY() {
    return this.getTerrainHeight(this.mesh.position.x, this.mesh.position.z);
  }

  _clearance() {
    return this.mesh.position.y - this._groundY();
  }

  /** Block walking into solid object hitboxes (trunk, roots, etc.) */
  _applySolidCollisions() {
    if (!this.colliders || this.movementMode === MovementMode.CLIMB) return;
    const flyMode = this.movementMode === MovementMode.FLY;
    const resolved = this.colliders.resolveSolidCollisions(
      this.mesh.position.x,
      this.mesh.position.z,
      this.mesh.position.y,
      0.5,
      { flyMode }
    );
    this.mesh.position.x = resolved.x;
    this.mesh.position.z = resolved.z;
  }

  _resolveSupport() {
    const terrainY = this._groundY();
    if (!this.colliders) {
      return { supportY: Math.max(terrainY, this.seaLevel), activePlatform: null };
    }
    const result = this.colliders.resolveSupport(
      this.mesh.position.x,
      this.mesh.position.y,
      this.mesh.position.z,
      terrainY,
      this.velocity.y,
      this.activePlatform
    );
    return {
      supportY: Math.max(result.supportY, this.seaLevel),
      activePlatform: result.activePlatformId,
    };
  }

  _snapToTerrain() {
    const { supportY, activePlatform } = this._resolveSupport();
    this.mesh.position.y = supportY;
    this.activePlatform = activePlatform;
    this.isGrounded = supportY > this.seaLevel + 0.5;
    this.velocity.y = 0;
  }

  _updateAnimState(input) {
    if (this.movementMode === MovementMode.FLY) {
      this.animState = AnimState.FLY;
      return;
    }
    if (this.movementMode === MovementMode.GLIDE) {
      this.animState = AnimState.GLIDE;
      return;
    }
    if (this.movementMode === MovementMode.CLIMB) {
      this.animState = AnimState.CLIMB;
      return;
    }

    const { forward, backward, left, right, sprint } = input;
    const moving = forward || backward || left || right;

    if (!this.isGrounded) {
      this.animState = this.velocity.y > 0.5 ? AnimState.JUMP : AnimState.FALL;
    } else if (moving) {
      this.animState = sprint ? AnimState.RUN : AnimState.WALK;
      this.jumpTimer = 0;
    } else {
      this.animState = AnimState.IDLE;
      this.jumpTimer = 0;
    }

    this.isMoving = moving;
    this.isSprinting = sprint && moving;
  }

  _animate(dt) {
    this.animTime += dt;
    const t = this.animTime;
    const p = this.parts;

    p.leftLegPivot.rotation.x = 0;
    p.rightLegPivot.rotation.x = 0;
    p.leftArmPivot.rotation.x = 0;
    p.rightArmPivot.rotation.x = 0;
    p.leftArmPivot.rotation.z = 0;
    p.rightArmPivot.rotation.z = 0;
    p.body.rotation.x = 0;
    p.body.scale.y = 1;
    p.head.rotation.x = 0;
    p.head.position.y = 1.85;
    p.cape.rotation.x = 0.12;
    p.cape.visible = true;
    p.glider.visible = false;
    this.animRoot.position.y = 0;
    this.animRoot.rotation.x = 0;

    switch (this.animState) {
      case AnimState.IDLE: {
        const breath = Math.sin(t * 2) * 0.015;
        this.animRoot.position.y = breath;
        p.body.scale.y = 1 + breath * 0.5;
        p.head.position.y = 1.85 + breath * 0.5;
        p.cape.rotation.x = 0.12 + Math.sin(t * 1.5) * 0.04;
        break;
      }
      case AnimState.WALK: {
        const freq = 8;
        const swing = Math.sin(t * freq) * 0.45;
        p.leftLegPivot.rotation.x = swing;
        p.rightLegPivot.rotation.x = -swing;
        p.leftArmPivot.rotation.x = -swing * 0.6;
        p.rightArmPivot.rotation.x = swing * 0.6;
        this.animRoot.position.y = Math.abs(Math.sin(t * freq)) * 0.06;
        p.body.rotation.x = 0.05;
        p.cape.rotation.x = 0.12 + Math.sin(t * freq) * 0.08;
        break;
      }
      case AnimState.RUN: {
        const freq = 12;
        const swing = Math.sin(t * freq) * 0.7;
        p.leftLegPivot.rotation.x = swing;
        p.rightLegPivot.rotation.x = -swing;
        p.leftArmPivot.rotation.x = -swing * 0.8;
        p.rightArmPivot.rotation.x = swing * 0.8;
        this.animRoot.position.y = Math.abs(Math.sin(t * freq)) * 0.1;
        this.animRoot.rotation.x = 0.12;
        p.body.rotation.x = 0.15;
        p.cape.rotation.x = 0.2 + Math.sin(t * freq) * 0.12;
        break;
      }
      case AnimState.JUMP: {
        const progress = Math.min(this.jumpTimer / 0.25, 1);
        p.leftLegPivot.rotation.x = -0.5 * progress;
        p.rightLegPivot.rotation.x = -0.5 * progress;
        p.leftArmPivot.rotation.x = -0.8 * progress;
        p.rightArmPivot.rotation.x = -0.8 * progress;
        this.animRoot.rotation.x = -0.1 * progress;
        break;
      }
      case AnimState.FALL: {
        p.leftLegPivot.rotation.x = 0.3;
        p.rightLegPivot.rotation.x = -0.2;
        p.leftArmPivot.rotation.x = 0.5;
        p.rightArmPivot.rotation.x = 0.6;
        this.animRoot.rotation.x = -0.08;
        p.cape.rotation.x = 0.35;
        break;
      }
      case AnimState.GLIDE: {
        p.cape.visible = false;
        p.glider.visible = true;
        p.leftLegPivot.rotation.x = 0.15;
        p.rightLegPivot.rotation.x = 0.1;
        p.leftArmPivot.rotation.x = 0.8;
        p.rightArmPivot.rotation.x = 0.8;
        p.leftArmPivot.rotation.z = -0.3;
        p.rightArmPivot.rotation.z = 0.3;
        this.animRoot.rotation.x = 0.25;
        p.body.rotation.x = 0.2;
        // Wing flutter
        const flutter = Math.sin(t * 3) * 0.05;
        p.glider.children[0].rotation.z = -0.3 + flutter;
        p.glider.children[1].rotation.z = 0.3 - flutter;
        break;
      }
      case AnimState.FLY: {
        p.leftArmPivot.rotation.x = -0.4;
        p.rightArmPivot.rotation.x = -0.4;
        p.leftLegPivot.rotation.x = -0.2;
        p.rightLegPivot.rotation.x = 0.1;
        this.animRoot.position.y = Math.sin(t * 4) * 0.03;
        p.cape.rotation.x = 0.3 + Math.sin(t * 3) * 0.1;
        break;
      }
      case AnimState.CLIMB: {
        const freq = 6;
        const swing = Math.sin(t * freq) * 0.5;
        p.leftArmPivot.rotation.x = -swing - 0.6;
        p.rightArmPivot.rotation.x = swing - 0.6;
        p.leftLegPivot.rotation.x = swing * 0.5;
        p.rightLegPivot.rotation.x = -swing * 0.5;
        this.animRoot.rotation.x = -0.08;
        p.body.rotation.x = -0.05;
        break;
      }
    }
  }

  _updateFly(dt, input, cameraYaw) {
    const { forward, backward, left, right, sprint, ascend, descend } = input;
    const speed = sprint ? FLY_SPRINT : FLY_SPEED;

    const moveDir = new THREE.Vector3();
    if (forward) moveDir.z -= 1;
    if (backward) moveDir.z += 1;
    if (left) moveDir.x -= 1;
    if (right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
      this.mesh.position.x += moveDir.x * speed * dt;
      this.mesh.position.z += moveDir.z * speed * dt;
      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 0.15);
    }

    if (ascend) this.mesh.position.y += FLY_VERTICAL * dt;
    if (descend) this.mesh.position.y -= FLY_VERTICAL * dt;

    this.mesh.position.y = Math.max(this.mesh.position.y, this.seaLevel - 5);
    this.isGrounded = false;
  }

  _updateGlide(dt, input, cameraYaw) {
    const { forward, backward, left, right, sprint } = input;
    const speed = sprint ? GLIDE_SPRINT : GLIDE_SPEED;

    const moveDir = new THREE.Vector3();
    if (forward) moveDir.z -= 1;
    if (backward) moveDir.z += 1;
    if (left) moveDir.x -= 1;
    if (right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);
      this.mesh.position.x += moveDir.x * speed * dt;
      this.mesh.position.z += moveDir.z * speed * dt;
      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 0.08);
    }

    this.velocity.y = -GLIDE_GRAVITY;
    this.mesh.position.y += this.velocity.y * dt;

    const { supportY, activePlatform } = this._resolveSupport();
    if (this.mesh.position.y <= supportY || this._clearance() < 1.5) {
      this.mesh.position.y = supportY;
      this.velocity.y = 0;
      this.isGrounded = supportY > this.seaLevel + 0.5;
      this.activePlatform = activePlatform;
      this.movementMode = MovementMode.NORMAL;
      this.glideDeployed = false;
    }
  }

  _updateClimb(dt, input) {
    const c = this.climbTarget;
    if (!c) {
      this.movementMode = MovementMode.NORMAL;
      return;
    }

    const { forward, backward, sprint, jumpPressed } = input;
    const speed = sprint ? CLIMB_SPRINT : CLIMB_SPEED;

    if (jumpPressed) {
      this.movementMode = MovementMode.NORMAL;
      this.climbTarget = null;
      this.velocity.y = JUMP_FORCE * 0.85;
      this.velocity.x = Math.sin(this.climbAngle) * 4;
      this.velocity.z = Math.cos(this.climbAngle) * 4;
      this.isGrounded = false;
      return;
    }

    if (forward) this.mesh.position.y += speed * dt;
    if (backward) this.mesh.position.y -= speed * dt;

    this.mesh.position.y = THREE.MathUtils.clamp(
      this.mesh.position.y,
      c.minY,
      c.maxY
    );

    this._snapToTrunkSurface();

    // Reached crown — step onto platform
    if (this.mesh.position.y >= c.maxY - 1) {
      const crown = this.colliders?.platforms.find((p) => p.id === 'fusang_crown');
      if (crown && this.mesh.position.y >= crown.y - 3) {
        this.movementMode = MovementMode.NORMAL;
        this.climbTarget = null;
        this.mesh.position.y = crown.y;
        this.activePlatform = crown.id;
        this.isGrounded = true;
        this.velocity.set(0, 0, 0);
        return;
      }
    }

    // Dismount at base
    if (this.mesh.position.y <= c.minY + 0.5 && backward) {
      this.movementMode = MovementMode.NORMAL;
      this.climbTarget = null;
      this.isGrounded = true;
      return;
    }

    this.isGrounded = false;
  }

  _updateNormal(dt, input, cameraYaw) {
    const { forward, backward, left, right, sprint, jumpPressed } = input;

    const moveDir = new THREE.Vector3();
    if (forward) moveDir.z -= 1;
    if (backward) moveDir.z += 1;
    if (left) moveDir.x -= 1;
    if (right) moveDir.x += 1;

    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();
      moveDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraYaw);

      const speed = sprint ? MOVE_SPEED * SPRINT_MULTIPLIER : MOVE_SPEED;
      this.mesh.position.x += moveDir.x * speed * dt;
      this.mesh.position.z += moveDir.z * speed * dt;

      const targetRotation = Math.atan2(moveDir.x, moveDir.z);
      this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, targetRotation, 0.12);
    }

    // Jump on ground
    if (jumpPressed && this.isGrounded) {
      this.velocity.y = JUMP_FORCE;
      this.isGrounded = false;
      this.activePlatform = null;
      this.jumpTimer = 0;
      this.glideDeployed = false;
    }

    // Deploy glide in air — press Space while falling with enough clearance
    if (jumpPressed && !this.isGrounded && !this.glideDeployed) {
      const clearance = this._clearance();
      if (clearance >= GLIDE_MIN_CLEARANCE && this.velocity.y <= 1) {
        this.movementMode = MovementMode.GLIDE;
        this.glideDeployed = true;
        this.velocity.y = -GLIDE_GRAVITY;
        return;
      }
    }

    if (!this.isGrounded && this.velocity.y > 0) {
      this.jumpTimer += dt;
    }

    this.velocity.y -= GRAVITY * dt;
    this.mesh.position.y += this.velocity.y * dt;

    const { supportY, activePlatform } = this._resolveSupport();
    if (this.mesh.position.y <= supportY) {
      this.mesh.position.y = supportY;
      this.velocity.y = 0;
      this.isGrounded = supportY > this.seaLevel + 0.5;
      this.activePlatform = activePlatform;
      this.glideDeployed = false;
    }
  }

  update(dt, input, cameraYaw) {
    if (this.movementMode !== MovementMode.CLIMB && this.movementMode !== MovementMode.FLY) {
      this.tryStartClimb(input.interactPressed);
    }

    if (this.movementMode === MovementMode.FLY) {
      this._updateFly(dt, input, cameraYaw);
    } else if (this.movementMode === MovementMode.GLIDE) {
      this._updateGlide(dt, input, cameraYaw);
    } else if (this.movementMode === MovementMode.CLIMB) {
      this._updateClimb(dt, input);
    } else {
      this._updateNormal(dt, input, cameraYaw);
    }

    const bound = 220;
    this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -bound, bound);
    this.mesh.position.z = THREE.MathUtils.clamp(this.mesh.position.z, -bound, bound);

    this._applySolidCollisions();

    this._updateAnimState(input);
    this._animate(dt);
  }

  get position() {
    return this.mesh.position;
  }

  get state() {
    if (this.movementMode === MovementMode.FLY) return 'fly';
    if (this.movementMode === MovementMode.GLIDE) return 'glide';
    if (this.movementMode === MovementMode.CLIMB) return 'climb';
    return this.animState;
  }
}
