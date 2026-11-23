import * as THREE from 'three';
import { BlockDef, PortalColor, PortalState } from './types';

export const PLAYER_RADIUS = 0.36;
export const PLAYER_HEIGHT = 1.68;
export const PLAYER_EYE_HEIGHT = 1.50;
export const CUBE_HALF = 0.37;
export const PORTAL_HALF_W = 0.58;
export const PORTAL_HALF_H = 1.02;
export const GRAVITY = 20.0;

export interface AabbBlock {
  def: BlockDef;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
  mesh: THREE.Mesh;
}

export interface CubeEntity {
  mesh: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  spawnPos: THREE.Vector3;
  held: boolean;
  teleportCooldown: number;
}

export interface ButtonEntity {
  id: string;
  pos: THREE.Vector3;
  group: THREE.Group;
  plate: THREE.Mesh;
  glowMat: THREE.MeshStandardMaterial;
  pressed: boolean;
}

export interface LaserEmitterEntity {
  id: string;
  pos: THREE.Vector3;
  dir: THREE.Vector3;
  group: THREE.Group;
}

export interface LaserReceptorEntity {
  id: string;
  pos: THREE.Vector3;
  normal: THREE.Vector3;
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  coreMat: THREE.MeshStandardMaterial;
  spinner: THREE.Mesh;
  powered: boolean;
}

export function buildBlockAabb(def: BlockDef, mesh: THREE.Mesh): AabbBlock {
  const [cx, cy, cz] = def.pos;
  const [sx, sy, sz] = def.size;
  return {
    def,
    minX: cx - sx * 0.5,
    maxX: cx + sx * 0.5,
    minY: cy - sy * 0.5,
    maxY: cy + sy * 0.5,
    minZ: cz - sz * 0.5,
    maxZ: cz + sz * 0.5,
    mesh,
  };
}

export function computePortalBasis(
  normal: THREE.Vector3,
  cameraYaw: number
): { up: THREE.Vector3; right: THREE.Vector3; quat: THREE.Quaternion } {
  const n = normal.clone().normalize();
  const up = new THREE.Vector3();

  if (Math.abs(n.y) > 0.9) {
    // Floor or ceiling: align portal "up" with player's horizontal facing direction
    const fwdX = -Math.sin(cameraYaw);
    const fwdZ = -Math.cos(cameraYaw);
    up.set(fwdX, 0, fwdZ).normalize();
    if (n.y < 0) up.negate();
  } else {
    up.set(0, 1, 0);
  }

  // Right-handed basis: right = up x normal, then recompute up = normal x right
  const right = new THREE.Vector3().crossVectors(up, n).normalize();
  up.crossVectors(n, right).normalize();

  const mat = new THREE.Matrix4().makeBasis(right, up, n);
  const quat = new THREE.Quaternion().setFromRotationMatrix(mat);
  return { up, right, quat };
}

export function clampPortalToBlock(
  hitPoint: THREE.Vector3,
  normal: THREE.Vector3,
  block: AabbBlock,
  up: THREE.Vector3,
  right: THREE.Vector3
): THREE.Vector3 | null {
  const [sx, sy, sz] = block.def.size;
  const [cx, cy, cz] = block.def.pos;
  const p = hitPoint.clone();

  // Check panel dimensions along portal's right and up axes
  const halfRightSpan =
    Math.abs(right.x) * (sx * 0.5) +
    Math.abs(right.y) * (sy * 0.5) +
    Math.abs(right.z) * (sz * 0.5);
  const halfUpSpan =
    Math.abs(up.x) * (sx * 0.5) +
    Math.abs(up.y) * (sy * 0.5) +
    Math.abs(up.z) * (sz * 0.5);

  if (halfRightSpan < PORTAL_HALF_W * 0.9 || halfUpSpan < PORTAL_HALF_H * 0.85) {
    return null;
  }

  const center = new THREE.Vector3(cx, cy, cz);
  const rel = p.clone().sub(center);

  const marginR = Math.max(0, halfRightSpan - (PORTAL_HALF_W + 0.04));
  const marginU = Math.max(0, halfUpSpan - (PORTAL_HALF_H + 0.04));

  const projR = THREE.MathUtils.clamp(rel.dot(right), -marginR, marginR);
  const projU = THREE.MathUtils.clamp(rel.dot(up), -marginU, marginU);
  const projN = rel.dot(normal);

  return center
    .addScaledVector(right, projR)
    .addScaledVector(up, projU)
    .addScaledVector(normal, projN);
}

export function isNearActivePortal(
  pos: THREE.Vector3,
  halfHeight: number,
  cyan: PortalState,
  amber: PortalState
): boolean {
  if (!cyan.active || !amber.active) return false;

  for (const portal of [cyan, amber]) {
    const centerY = pos.y + halfHeight;
    const dx = pos.x - portal.position.x;
    const dy = centerY - portal.position.y;
    const dz = pos.z - portal.position.z;

    const projN = dx * portal.normal.x + dy * portal.normal.y + dz * portal.normal.z;
    const projR = dx * portal.right.x + dy * portal.right.y + dz * portal.right.z;
    const projU = dx * portal.up.x + dy * portal.up.y + dz * portal.up.z;

    if (
      Math.abs(projN) < 0.72 &&
      Math.abs(projR) < PORTAL_HALF_W + 0.15 &&
      Math.abs(projU) < PORTAL_HALF_H + 0.15
    ) {
      return true;
    }
  }
  return false;
}

export function checkPortalCrossing(
  pos: THREE.Vector3,
  halfHeight: number,
  vel: THREE.Vector3,
  cyan: PortalState,
  amber: PortalState
): { entry: PortalState; exit: PortalState } | null {
  if (!cyan.active || !amber.active) return null;

  const pairs: Array<[PortalState, PortalState]> = [
    [cyan, amber],
    [amber, cyan],
  ];

  for (const [entry, exit] of pairs) {
    const centerY = pos.y + halfHeight;
    const dx = pos.x - entry.position.x;
    const dy = centerY - entry.position.y;
    const dz = pos.z - entry.position.z;

    const projN = dx * entry.normal.x + dy * entry.normal.y + dz * entry.normal.z;
    const projR = dx * entry.right.x + dy * entry.right.y + dz * entry.right.z;
    const projU = dx * entry.up.x + dy * entry.up.y + dz * entry.up.z;

    const velInto = vel.x * entry.normal.x + vel.y * entry.normal.y + vel.z * entry.normal.z;

    // Trigger when close to portal plane and either moving into it or already crossing plane
    if (
      projN <= 0.42 &&
      projN >= -0.65 &&
      Math.abs(projR) < PORTAL_HALF_W * 0.92 &&
      Math.abs(projU) < PORTAL_HALF_H * 0.92 &&
      velInto <= 0.6
    ) {
      return { entry, exit };
    }
  }
  return null;
}

export function transformThroughPortal(
  pos: THREE.Vector3,
  halfHeight: number,
  vel: THREE.Vector3,
  yaw: number,
  pitch: number,
  entry: PortalState,
  exit: PortalState,
  exitPushDist: number
): {
  newPos: THREE.Vector3;
  newVel: THREE.Vector3;
  newYaw: number;
  newPitch: number;
} {
  const centerPos = new THREE.Vector3(pos.x, pos.y + halfHeight, pos.z);
  const rel = centerPos.sub(entry.position);

  const rx = rel.dot(entry.right);
  const ry = rel.dot(entry.up);

  // Transform velocity (180 deg rotation around up axis)
  const vx = vel.dot(entry.right);
  const vy = vel.dot(entry.up);
  const vz = vel.dot(entry.normal);

  const exitSpeedN = Math.max(-vz, Math.abs(entry.normal.y) > 0.5 && Math.abs(exit.normal.y) < 0.5 ? 5.2 : 2.4);

  const newVel = new THREE.Vector3()
    .addScaledVector(exit.right, -vx)
    .addScaledVector(exit.up, vy)
    .addScaledVector(exit.normal, exitSpeedN);

  const outCenter = exit.position
    .clone()
    .addScaledVector(exit.right, THREE.MathUtils.clamp(-rx, -0.25, 0.25))
    .addScaledVector(exit.up, THREE.MathUtils.clamp(ry, -0.4, 0.4))
    .addScaledVector(exit.normal, exitPushDist);

  const newPos = new THREE.Vector3(outCenter.x, outCenter.y - halfHeight, outCenter.z);

  // Transform camera look vector
  const euler = new THREE.Euler(pitch, yaw, 0, 'YXZ');
  const fwd = new THREE.Vector3(0, 0, -1).applyEuler(euler);
  const fx = fwd.dot(entry.right);
  const fy = fwd.dot(entry.up);
  const fz = fwd.dot(entry.normal);

  const newFwd = new THREE.Vector3()
    .addScaledVector(exit.right, -fx)
    .addScaledVector(exit.up, fy)
    .addScaledVector(exit.normal, -fz)
    .normalize();

  const newPitch = Math.asin(THREE.MathUtils.clamp(newFwd.y, -0.96, 0.96));
  const horizLen = Math.hypot(newFwd.x, newFwd.z);
  const newYaw = horizLen > 0.001 ? Math.atan2(-newFwd.x, -newFwd.z) : yaw;

  return { newPos, newVel, newYaw, newPitch };
}

export function resolveBoxAabbCollision(
  pos: THREE.Vector3,
  vel: THREE.Vector3,
  radius: number,
  height: number,
  blocks: AabbBlock[],
  doorClosedBlock: AabbBlock | null,
  skipWallPassThrough: boolean
): { grounded: boolean; touchedHazard: boolean } {
  let grounded = false;
  let touchedHazard = false;

  const list = doorClosedBlock ? [...blocks, doorClosedBlock] : blocks;

  // Two pass: vertical (Y) first, then horizontal (X, Z)
  for (const b of list) {
    if (pos.x + radius <= b.minX || pos.x - radius >= b.maxX) continue;
    if (pos.z + radius <= b.minZ || pos.z - radius >= b.maxZ) continue;

    if (pos.y < b.maxY && pos.y + height > b.minY) {
      if (b.def.kind === 'hazard') {
        touchedHazard = true;
        continue;
      }

      const penTop = b.maxY - pos.y;
      const penBot = pos.y + height - b.minY;
      const penLeft = pos.x + radius - b.minX;
      const penRight = b.maxX - (pos.x - radius);
      const penFront = pos.z + radius - b.minZ;
      const penBack = b.maxZ - (pos.z - radius);

      const minPen = Math.min(penTop, penBot, penLeft, penRight, penFront, penBack);

      const bypassPortalBlock = skipWallPassThrough && b.def.kind === 'portalable';
      if (minPen === penTop && vel.y <= 0.1) {
        if (!bypassPortalBlock) {
          pos.y = b.maxY;
          vel.y = 0;
          grounded = true;
        }
      } else if (minPen === penBot && vel.y >= -0.1) {
        if (!bypassPortalBlock) {
          pos.y = b.minY - height;
          vel.y = 0;
        }
      }
    }
  }

  for (const b of list) {
    if (pos.y + 0.06 >= b.maxY || pos.y + height - 0.06 <= b.minY) continue;
    if (pos.x + radius <= b.minX || pos.x - radius >= b.maxX) continue;
    if (pos.z + radius <= b.minZ || pos.z - radius >= b.maxZ) continue;

    if (b.def.kind === 'hazard') {
      touchedHazard = true;
      continue;
    }

    if (skipWallPassThrough && b.def.kind === 'portalable') {
      continue;
    }

    const penLeft = pos.x + radius - b.minX;
    const penRight = b.maxX - (pos.x - radius);
    const penFront = pos.z + radius - b.minZ;
    const penBack = b.maxZ - (pos.z - radius);

    const minPen = Math.min(penLeft, penRight, penFront, penBack);
    if (minPen === penLeft) {
      pos.x = b.minX - radius;
      if (vel.x > 0) vel.x = 0;
    } else if (minPen === penRight) {
      pos.x = b.maxX + radius;
      if (vel.x < 0) vel.x = 0;
    } else if (minPen === penFront) {
      pos.z = b.minZ - radius;
      if (vel.z > 0) vel.z = 0;
    } else {
      pos.z = b.maxZ + radius;
      if (vel.z < 0) vel.z = 0;
    }
  }

  return { grounded, touchedHazard };
}

export function portalColorToHex(color: PortalColor): number {
  return color === 'cyan' ? 0x00f0ff : 0xff9100;
}
