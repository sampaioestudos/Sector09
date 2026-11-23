import * as THREE from 'three';

export type PortalColor = 'cyan' | 'amber';

export type SurfaceKind = 'portalable' | 'corroded' | 'floor' | 'hazard' | 'glass';

export type CardinalFacing = 'N' | 'S' | 'E' | 'W';

export interface BlockDef {
  pos: [number, number, number];
  size: [number, number, number];
  kind: SurfaceKind;
}

export interface CubeSpawnDef {
  pos: [number, number, number];
}

export interface ButtonDef {
  id: string;
  pos: [number, number, number];
}

export interface LaserEmitterDef {
  id: string;
  pos: [number, number, number];
  dir: [number, number, number];
}

export interface LaserReceptorDef {
  id: string;
  pos: [number, number, number];
  normal: [number, number, number];
}

export interface ExitDoorDef {
  pos: [number, number, number];
  facing: CardinalFacing;
  requiresButtons?: string[];
  requiresReceptors?: string[];
}

export interface NeonLightDef {
  pos: [number, number, number];
  color: number;
  intensity?: number;
  distance?: number;
}

export interface PropDef {
  type: 'pillar' | 'barrel' | 'pipe' | 'sconce';
  pos: [number, number, number];
  rotY?: number;
  color?: number;
}

export interface LevelDef {
  id: number;
  code: string;
  title: string;
  subtitle: string;
  hint: string;
  playerStart: [number, number, number];
  playerYaw: number;
  blocks: BlockDef[];
  cubes: CubeSpawnDef[];
  buttons: ButtonDef[];
  laserEmitters: LaserEmitterDef[];
  laserReceptors: LaserReceptorDef[];
  exitDoor: ExitDoorDef;
  lights: NeonLightDef[];
  props?: PropDef[];
}

export interface PortalState {
  active: boolean;
  color: PortalColor;
  position: THREE.Vector3;
  normal: THREE.Vector3;
  up: THREE.Vector3;
  right: THREE.Vector3;
  quaternion: THREE.Quaternion;
  mesh: THREE.Group;
  light: THREE.PointLight;
}

export interface HudSnapshot {
  levelIndex: number;
  levelCode: string;
  levelTitle: string;
  levelHint: string;
  cyanActive: boolean;
  amberActive: boolean;
  carryingCube: boolean;
  canGrabCube: boolean;
  buttonsTotal: number;
  buttonsActive: number;
  receptorsTotal: number;
  receptorsActive: number;
  doorOpen: boolean;
  pointerLocked: boolean;
  elapsedSeconds: number;
}

export interface SaveProgress {
  highestUnlocked: number;
  completedLevels: number[];
  bestTimes: Record<number, number>;
  muted: boolean;
}
