import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { SoundEngine } from './audio';
import { LEVELS } from './levels';
import {
  ButtonVisualHandle,
  createExitDoor,
  createFacilityProp,
  createLaserEmitter,
  createLaserReceptor,
  createPortalGun,
  createPortalVisual,
  createPressureButton,
  createWeightedCube,
  ExitDoorHandle,
  PortalGunHandle,
  PortalVisualHandle,
} from './models';
import {
  AabbBlock,
  buildBlockAabb,
  ButtonEntity,
  checkPortalCrossing,
  clampPortalToBlock,
  computePortalBasis,
  CUBE_HALF,
  CubeEntity,
  GRAVITY,
  isNearActivePortal,
  LaserEmitterEntity,
  LaserReceptorEntity,
  PLAYER_EYE_HEIGHT,
  PLAYER_HEIGHT,
  PLAYER_RADIUS,
  PORTAL_HALF_H,
  PORTAL_HALF_W,
  resolveBoxAabbCollision,
  transformThroughPortal,
} from './physics';
import { createFacilityTextures, FacilityTextures } from './textures';
import { HudSnapshot, LevelDef, PortalColor, PortalState } from './types';

// Pre-allocated math helpers (zero GC inside render loop)
const _vecA = new THREE.Vector3();
const _vecB = new THREE.Vector3();
const _vecC = new THREE.Vector3();
const _vecD = new THREE.Vector3();
const _rayOrigin = new THREE.Vector3();
const _rayDir = new THREE.Vector3();
const _euler = new THREE.Euler(0, 0, 0, 'YXZ');
const _upAxis = new THREE.Vector3(0, 1, 0);

const MAX_LASER_SEGMENTS = 8;

interface TracerShot {
  line: THREE.Line;
  mat: THREE.LineBasicMaterial;
  life: number;
  maxLife: number;
}

interface SparkBurst {
  points: THREE.Points;
  velocities: Float32Array;
  mat: THREE.PointsMaterial;
  life: number;
}

export interface EngineCallbacks {
  onHudUpdate: (snapshot: HudSnapshot) => void;
  onFeedback: (message: string, tone: 'cyan' | 'amber' | 'danger' | 'success') => void;
  onLevelComplete: (levelIndex: number, elapsedSeconds: number) => void;
}

export class Sector09Engine {
  private container: HTMLElement;
  private callbacks: EngineCallbacks;
  private sound: SoundEngine;

  private isSoftwareGl: boolean;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private textures: FacilityTextures;
  private envRT: THREE.WebGLRenderTarget;

  private levelGroup = new THREE.Group();
  private dynamicGroup = new THREE.Group();

  private portalGun: PortalGunHandle;
  private gunRecoil = 0;
  private gunBobPhase = 0;

  private cyanPortal: PortalState;
  private amberPortal: PortalState;
  private cyanVisual: PortalVisualHandle;
  private amberVisual: PortalVisualHandle;

  // Level entities
  private currentLevelIndex = 0;
  private currentLevel: LevelDef = LEVELS[0];
  private blocks: AabbBlock[] = [];
  private raycastMeshes: THREE.Mesh[] = [];
  private blockByMesh = new Map<THREE.Object3D, AabbBlock>();
  private cubes: CubeEntity[] = [];
  private buttons: ButtonEntity[] = [];
  private laserEmitters: LaserEmitterEntity[] = [];
  private laserReceptors: LaserReceptorEntity[] = [];
  private exitDoor: ExitDoorHandle | null = null;
  private doorClosedBlock: AabbBlock | null = null;
  private doorOpenAmount = 0;
  private doorWasOpen = false;
  private doorTriggerPos = new THREE.Vector3();

  // Laser beam pool
  private laserMeshes: THREE.Mesh[] = [];

  // Particle rain/fallout & tracers
  private rainPoints: THREE.Points;
  private rainPositions: Float32Array;
  private tracers: TracerShot[] = [];
  private sparks: SparkBurst[] = [];

  // Player state
  private playerPos = new THREE.Vector3();
  private playerVel = new THREE.Vector3();
  private yaw = 0;
  private pitch = 0;
  private grounded = false;
  private coyoteTimer = 0;
  private jumpBufferTimer = 0;
  private teleportCooldown = 0;
  private carriedCube: CubeEntity | null = null;
  private canGrabCube = false;

  // Input state
  private keys = new Set<string>();
  private touchMove = { x: 0, y: 0 };
  private isPlaying = false;
  private isPaused = false;
  private levelCompleted = false;
  private levelElapsed = 0;
  private titlePanTime = 0;

  // Loop & lifecycle
  private clock = new THREE.Clock();
  private frameId = 0;
  private disposed = false;
  private lastHudPush = 0;
  private lastHudSig = '';

  // Bound event listeners
  private onResizeBound: () => void;
  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;
  private onBlurBound: () => void;
  private onMouseMoveBound: (e: MouseEvent) => void;
  private onMouseDownBound: (e: MouseEvent) => void;
  private onContextMenuBound: (e: MouseEvent) => void;
  private onPointerLockChangeBound: () => void;

  constructor(container: HTMLElement, sound: SoundEngine, callbacks: EngineCallbacks) {
    this.container = container;
    this.sound = sound;
    this.callbacks = callbacks;

    this.isSoftwareGl = (() => {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth || window.innerWidth, container.clientHeight || window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    container.appendChild(this.renderer.domElement);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x05080f);
    this.scene.fog = new THREE.FogExp2(0x05080f, 0.032);

    const aspect = (container.clientWidth || window.innerWidth) / (container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(72, aspect, 0.08, 120);
    this.camera.rotation.order = 'YXZ';
    this.scene.add(this.camera);

    // Mandatory studio environment map for PBR metals & wet surfaces
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
    this.scene.environment = this.envRT.texture;
    pmrem.dispose();

    this.textures = createFacilityTextures(this.renderer.capabilities.getMaxAnisotropy());

    // Global neo-noir ambient rig
    const hemi = new THREE.HemisphereLight(0x2d5380, 0x160f0d, 0.85);
    this.scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xdceeff, 1.05);
    keyLight.position.set(8, 16, 10);
    if (!this.isSoftwareGl) {
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.set(1024, 1024);
      keyLight.shadow.camera.near = 1;
      keyLight.shadow.camera.far = 42;
      keyLight.shadow.camera.left = -16;
      keyLight.shadow.camera.right = 16;
      keyLight.shadow.camera.top = 16;
      keyLight.shadow.camera.bottom = -16;
      keyLight.shadow.bias = -0.0005;
      keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(keyLight);

    // First-person Portal Gun mounted to camera
    this.portalGun = createPortalGun();
    this.portalGun.group.position.set(0.28, -0.25, -0.46);
    this.portalGun.group.rotation.set(0.03, -0.08, 0);
    this.camera.add(this.portalGun.group);

    // Portal visuals
    this.cyanVisual = createPortalVisual('cyan');
    this.amberVisual = createPortalVisual('amber');
    this.scene.add(this.cyanVisual.group);
    this.scene.add(this.amberVisual.group);

    this.cyanPortal = this.makeEmptyPortal('cyan', this.cyanVisual);
    this.amberPortal = this.makeEmptyPortal('amber', this.amberVisual);

    // Pooled laser beam cylinders
    const laserMat = new THREE.MeshBasicMaterial({ color: 0xff1e7a });
    const laserGeo = new THREE.CylinderGeometry(0.028, 0.028, 1, 8);
    for (let i = 0; i < MAX_LASER_SEGMENTS; i++) {
      const m = new THREE.Mesh(laserGeo, laserMat);
      m.visible = false;
      this.scene.add(m);
      this.laserMeshes.push(m);
    }

    // Radioactive rain / dust motes
    const rainCount = 220;
    this.rainPositions = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 26;
      this.rainPositions[i * 3 + 1] = Math.random() * 12;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 32;
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute('position', new THREE.BufferAttribute(this.rainPositions, 3));
    const rainMat = new THREE.PointsMaterial({
      color: 0x62f2ff,
      size: 0.06,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    });
    this.rainPoints = new THREE.Points(rainGeo, rainMat);
    this.rainPoints.frustumCulled = false;
    this.scene.add(this.rainPoints);

    this.scene.add(this.levelGroup);
    this.scene.add(this.dynamicGroup);

    // Load initial level for live backdrop
    this.loadLevel(0);

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }

    // Bind events
    this.onResizeBound = this.handleResize.bind(this);
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
    this.onBlurBound = () => this.keys.clear();
    this.onMouseMoveBound = this.handleMouseMove.bind(this);
    this.onMouseDownBound = this.handleMouseDown.bind(this);
    this.onContextMenuBound = (e: MouseEvent) => e.preventDefault();
    this.onPointerLockChangeBound = () => this.pushHud(true);

    window.addEventListener('resize', this.onResizeBound);
    window.addEventListener('keydown', this.onKeyDownBound);
    window.addEventListener('keyup', this.onKeyUpBound);
    window.addEventListener('blur', this.onBlurBound);
    document.addEventListener('mousemove', this.onMouseMoveBound);
    this.renderer.domElement.addEventListener('mousedown', this.onMouseDownBound);
    this.renderer.domElement.addEventListener('contextmenu', this.onContextMenuBound);
    document.addEventListener('pointerlockchange', this.onPointerLockChangeBound);

    this.clock.start();
    this.tick();
  }

  private makeEmptyPortal(color: PortalColor, visual: PortalVisualHandle): PortalState {
    return {
      active: false,
      color,
      position: new THREE.Vector3(),
      normal: new THREE.Vector3(0, 0, 1),
      up: new THREE.Vector3(0, 1, 0),
      right: new THREE.Vector3(1, 0, 0),
      quaternion: new THREE.Quaternion(),
      mesh: visual.group,
      light: visual.light,
    };
  }

  public startGame(levelIndex: number, lockPointer = false): void {
    this.sound.unlock();
    this.isPlaying = true;
    this.isPaused = false;
    this.loadLevel(levelIndex);
    if (lockPointer && !this.isMobileDevice()) {
      this.requestPointerLockSafe();
    }
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.keys.clear();
    if (paused && document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.pushHud(true);
  }

  public returnToTitle(): void {
    this.isPlaying = false;
    this.isPaused = false;
    this.keys.clear();
    if (document.pointerLockElement === this.renderer.domElement) {
      document.exitPointerLock();
    }
    this.portalGun.group.visible = false;
    this.pushHud(true);
  }

  public requestPointerLockSafe(): void {
    if (!this.isPlaying || this.isPaused || this.isMobileDevice()) return;
    try {
      const req = this.renderer.domElement.requestPointerLock?.();
      if (req && typeof (req as unknown as Promise<void>).catch === 'function') {
        (req as unknown as Promise<void>).catch(() => {});
      }
    } catch {
      // Ignore pointer lock rejection in restricted frames
    }
  }

  private isMobileDevice(): boolean {
    return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
  }

  public setTouchMove(x: number, y: number): void {
    this.touchMove.x = THREE.MathUtils.clamp(x, -1, 1);
    this.touchMove.y = THREE.MathUtils.clamp(y, -1, 1);
  }

  public addLookDelta(dx: number, dy: number): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    const sens = 0.0042;
    this.yaw -= dx * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * sens, -1.48, 1.48);
  }

  public triggerJump(): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    this.sound.unlock();
    this.jumpBufferTimer = 0.14;
  }

  public resetLevel(): void {
    if (!this.isPlaying) return;
    this.sound.unlock();
    this.loadLevel(this.currentLevelIndex);
    this.callbacks.onFeedback('🔄 SECTOR RESET', 'cyan');
  }

  public loadLevel(index: number): void {
    const safeIdx = THREE.MathUtils.clamp(index, 0, LEVELS.length - 1);
    this.currentLevelIndex = safeIdx;
    this.currentLevel = LEVELS[safeIdx];
    this.levelCompleted = false;
    this.levelElapsed = 0;
    this.carriedCube = null;
    this.doorOpenAmount = 0;
    this.doorWasOpen = false;
    this.teleportCooldown = 0;

    // Clear previous level objects and dispose geometries/materials cleanly
    this.clearGroup(this.levelGroup);
    this.clearGroup(this.dynamicGroup);
    this.blocks = [];
    this.raycastMeshes = [];
    this.blockByMesh.clear();
    this.cubes = [];
    this.buttons = [];
    this.laserEmitters = [];
    this.laserReceptors = [];
    this.exitDoor = null;
    this.doorClosedBlock = null;

    // Reset portals
    this.cyanPortal.active = false;
    this.amberPortal.active = false;
    this.cyanVisual.group.visible = false;
    this.amberVisual.group.visible = false;

    this.portalGun.group.visible = this.isPlaying;

    // Build blocks
    for (const bDef of this.currentLevel.blocks) {
      const geo = new THREE.BoxGeometry(bDef.size[0], bDef.size[1], bDef.size[2]);
      let mat: THREE.Material;

      if (bDef.kind === 'portalable') {
        const tex = this.textures.portalableMap.clone();
        tex.needsUpdate = true;
        tex.repeat.set(
          Math.max(1, Math.round(Math.max(bDef.size[0], bDef.size[2]) / 2.2)),
          Math.max(1, Math.round(bDef.size[1] / 2.2))
        );
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughnessMap: this.textures.portalableRoughness,
          color: 0xc2d4e8,
          roughness: 0.72,
          metalness: 0.08,
        });
      } else if (bDef.kind === 'corroded') {
        mat = new THREE.MeshStandardMaterial({
          map: this.textures.corrodedMap,
          roughnessMap: this.textures.corrodedRoughness,
          color: 0x454e59,
          roughness: 0.88,
          metalness: 0.42,
        });
      } else if (bDef.kind === 'floor') {
        const tex = this.textures.wetFloorMap.clone();
        tex.needsUpdate = true;
        const rTex = this.textures.wetFloorRoughness.clone();
        rTex.needsUpdate = true;
        const rx = Math.max(1, Math.round(bDef.size[0] / 3));
        const rz = Math.max(1, Math.round(bDef.size[2] / 3));
        tex.repeat.set(rx, rz);
        rTex.repeat.set(rx, rz);
        mat = new THREE.MeshStandardMaterial({
          map: tex,
          roughnessMap: rTex,
          color: 0x3b4859,
          roughness: 0.45,
          metalness: 0.35,
        });
      } else if (bDef.kind === 'hazard') {
        mat = new THREE.MeshStandardMaterial({
          map: this.textures.hazardMap,
          color: 0x26ff38,
          emissive: 0x16a822,
          emissiveIntensity: 1.1,
          roughness: 0.15,
          metalness: 0.1,
        });
      } else {
        // Glass barrier (blocks movement, allows portals & lasers!)
        mat = new THREE.MeshStandardMaterial({
          color: 0x7beeff,
          emissive: 0x0b3a4a,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.24,
          roughness: 0.12,
          metalness: 0.2,
          depthWrite: false,
        });
      }

      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(bDef.pos[0], bDef.pos[1], bDef.pos[2]);
      mesh.receiveShadow = bDef.kind !== 'glass';
      mesh.castShadow = bDef.kind === 'corroded' || bDef.kind === 'portalable';
      this.levelGroup.add(mesh);

      const aabb = buildBlockAabb(bDef, mesh);
      this.blocks.push(aabb);
      if (bDef.kind !== 'glass') {
        this.raycastMeshes.push(mesh);
        this.blockByMesh.set(mesh, aabb);
      }

      // Subtle glowing cyan corner trim on portalable panels so players spot them effortlessly
      if (bDef.kind === 'portalable') {
        const edgeGeo = new THREE.EdgesGeometry(geo);
        const edgeMat = new THREE.LineBasicMaterial({
          color: 0x00f0ff,
          transparent: true,
          opacity: 0.42,
        });
        const wire = new THREE.LineSegments(edgeGeo, edgeMat);
        wire.position.copy(mesh.position);
        this.levelGroup.add(wire);
      }
    }

    // Build Cubes
    for (const cDef of this.currentLevel.cubes) {
      const handle = createWeightedCube();
      handle.group.position.set(cDef.pos[0], cDef.pos[1], cDef.pos[2]);
      this.dynamicGroup.add(handle.group);
      this.cubes.push({
        mesh: handle.group,
        ringMat: handle.ringMat,
        pos: new THREE.Vector3(cDef.pos[0], cDef.pos[1], cDef.pos[2]),
        vel: new THREE.Vector3(),
        spawnPos: new THREE.Vector3(cDef.pos[0], cDef.pos[1], cDef.pos[2]),
        held: false,
        teleportCooldown: 0,
      });
    }

    // Build Pressure Buttons
    for (const btnDef of this.currentLevel.buttons) {
      const handle: ButtonVisualHandle = createPressureButton();
      handle.group.position.set(btnDef.pos[0], btnDef.pos[1], btnDef.pos[2]);
      this.dynamicGroup.add(handle.group);
      this.buttons.push({
        id: btnDef.id,
        pos: new THREE.Vector3(btnDef.pos[0], btnDef.pos[1], btnDef.pos[2]),
        group: handle.group,
        plate: handle.plate,
        glowMat: handle.glowMat,
        pressed: false,
      });
    }

    // Build Laser Emitters
    for (const leDef of this.currentLevel.laserEmitters) {
      const dir = new THREE.Vector3(leDef.dir[0], leDef.dir[1], leDef.dir[2]).normalize();
      const handle = createLaserEmitter(dir);
      handle.group.position.set(leDef.pos[0], leDef.pos[1], leDef.pos[2]);
      this.dynamicGroup.add(handle.group);
      this.laserEmitters.push({
        id: leDef.id,
        pos: new THREE.Vector3(leDef.pos[0], leDef.pos[1], leDef.pos[2]),
        dir,
        group: handle.group,
      });
    }

    // Build Laser Receptors
    for (const lrDef of this.currentLevel.laserReceptors) {
      const normal = new THREE.Vector3(lrDef.normal[0], lrDef.normal[1], lrDef.normal[2]).normalize();
      const handle = createLaserReceptor(normal);
      handle.group.position.set(lrDef.pos[0], lrDef.pos[1], lrDef.pos[2]);
      this.dynamicGroup.add(handle.group);
      this.laserReceptors.push({
        id: lrDef.id,
        pos: new THREE.Vector3(lrDef.pos[0], lrDef.pos[1], lrDef.pos[2]),
        normal,
        group: handle.group,
        ringMat: handle.ringMat,
        coreMat: handle.coreMat,
        spinner: handle.spinner,
        powered: false,
      });
    }

    // Build Exit Door
    const dDef = this.currentLevel.exitDoor;
    const door = createExitDoor();
    door.group.position.set(dDef.pos[0], dDef.pos[1], dDef.pos[2]);
    let rotY = 0;
    if (dDef.facing === 'N') rotY = Math.PI;
    else if (dDef.facing === 'E') rotY = Math.PI / 2;
    else if (dDef.facing === 'W') rotY = -Math.PI / 2;
    door.group.rotation.y = rotY;
    this.dynamicGroup.add(door.group);
    this.exitDoor = door;
    this.doorTriggerPos.set(dDef.pos[0], dDef.pos[1] + 1.2, dDef.pos[2]);

    // Closed door collider block
    const doorW = dDef.facing === 'N' || dDef.facing === 'S' ? 2.4 : 0.4;
    const doorD = dDef.facing === 'N' || dDef.facing === 'S' ? 0.4 : 2.4;
    const dummyMesh = new THREE.Mesh();
    this.doorClosedBlock = buildBlockAabb(
      { pos: [dDef.pos[0], dDef.pos[1] + 1.4, dDef.pos[2]], size: [doorW, 2.8, doorD], kind: 'corroded' },
      dummyMesh
    );

    // Build Neon Lights
    for (const lDef of this.currentLevel.lights) {
      const pl = new THREE.PointLight(lDef.color, lDef.intensity ?? 12, lDef.distance ?? 16, 1.5);
      pl.position.set(lDef.pos[0], lDef.pos[1], lDef.pos[2]);
      this.levelGroup.add(pl);
    }

    // Build Props
    for (const pDef of this.currentLevel.props ?? []) {
      const prop = createFacilityProp(pDef.type, pDef.color ?? 0x00f0ff);
      prop.position.set(pDef.pos[0], pDef.pos[1], pDef.pos[2]);
      if (pDef.rotY) prop.rotation.y = pDef.rotY;
      this.levelGroup.add(prop);
    }

    // Place Player
    this.playerPos.set(
      this.currentLevel.playerStart[0],
      this.currentLevel.playerStart[1],
      this.currentLevel.playerStart[2]
    );
    this.playerVel.set(0, 0, 0);
    this.yaw = this.currentLevel.playerYaw;
    this.pitch = 0;

    this.syncCameraToPlayer();
    this.pushHud(true);
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      child.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh || (obj as THREE.LineSegments).isLineSegments) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          if (Array.isArray(m.material)) {
            m.material.forEach((mat) => mat.dispose());
          } else {
            m.material?.dispose();
          }
        }
      });
    }
  }

  public firePortal(color: PortalColor): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    this.sound.unlock();
    this.gunRecoil = 1.0;

    const hex = color === 'cyan' ? 0x00f0ff : 0xff9100;
    this.portalGun.coreMat.color.setHex(hex);
    this.portalGun.coreMat.emissive.setHex(hex);
    this.portalGun.tipLight.color.setHex(hex);

    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    _rayDir.set(0, 0, -1).applyEuler(_euler).normalize();
    _rayOrigin.copy(this.camera.position);

    const raycaster = new THREE.Raycaster(_rayOrigin, _rayDir, 0.1, 80);
    const hits = raycaster.intersectObjects(this.raycastMeshes, false);

    // Muzzle start in world coords
    _vecA.set(0.24, -0.18, -0.7).applyMatrix4(this.camera.matrixWorld);

    if (hits.length === 0) {
      _vecB.copy(_rayOrigin).addScaledVector(_rayDir, 30);
      this.spawnTracer(_vecA, _vecB, hex);
      this.sound.playPortalFire(color);
      return;
    }

    const hit = hits[0];
    const block = this.blockByMesh.get(hit.object);
    this.spawnTracer(_vecA, hit.point, hex);

    if (!block || block.def.kind !== 'portalable' || !hit.face) {
      this.sound.playPortalReject();
      this.spawnSparks(hit.point, 0xff3b30);
      this.callbacks.onFeedback('⚠️ CORRODED SURFACE — PORTAL REJECTED', 'danger');
      return;
    }

    // World space normal
    const normal = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
    const { up, right, quat } = computePortalBasis(normal, this.yaw);

    const clampedPos = clampPortalToBlock(hit.point, normal, block, up, right);
    if (!clampedPos) {
      this.sound.playPortalReject();
      this.spawnSparks(hit.point, 0xff3b30);
      this.callbacks.onFeedback('⚠️ SURFACE TOO NARROW FOR PORTAL', 'danger');
      return;
    }

    const targetPortal = color === 'cyan' ? this.cyanPortal : this.amberPortal;
    const otherPortal = color === 'cyan' ? this.amberPortal : this.cyanPortal;

    // Prevent overlap with sibling portal on same surface
    if (
      otherPortal.active &&
      otherPortal.normal.dot(normal) > 0.92 &&
      otherPortal.position.distanceTo(clampedPos) < 1.35
    ) {
      this.sound.playPortalReject();
      this.spawnSparks(hit.point, hex);
      this.callbacks.onFeedback('⚠️ PORTAL OVERLAP DETECTED', 'amber');
      return;
    }

    targetPortal.active = true;
    targetPortal.position.copy(clampedPos);
    targetPortal.normal.copy(normal);
    targetPortal.up.copy(up);
    targetPortal.right.copy(right);
    targetPortal.quaternion.copy(quat);
    targetPortal.mesh.position.copy(clampedPos);
    targetPortal.mesh.quaternion.copy(quat);
    targetPortal.mesh.visible = true;

    this.sound.playPortalFire(color);
    this.spawnSparks(clampedPos, hex);
    this.pushHud(true);
  }

  public toggleCarryCube(): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    this.sound.unlock();

    if (this.carriedCube) {
      this.carriedCube.held = false;
      this.carriedCube.vel.copy(this.playerVel).multiplyScalar(0.5);
      this.carriedCube = null;
      this.sound.playPickup(false);
      this.pushHud(true);
      return;
    }

    const best = this.findGrabbableCube();
    if (best) {
      best.held = true;
      best.vel.set(0, 0, 0);
      this.carriedCube = best;
      this.sound.playPickup(true);
      this.pushHud(true);
    }
  }

  private findGrabbableCube(): CubeEntity | null {
    _euler.set(this.pitch, this.yaw, 0, 'YXZ');
    _rayDir.set(0, 0, -1).applyEuler(_euler).normalize();
    let best: CubeEntity | null = null;
    let bestDist = 2.85;

    for (const cube of this.cubes) {
      _vecA.copy(cube.pos).sub(this.camera.position);
      const dist = _vecA.length();
      if (dist > bestDist) continue;
      _vecA.normalize();
      if (_vecA.dot(_rayDir) > 0.72) {
        bestDist = dist;
        best = cube;
      }
    }
    return best;
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: number): void {
    const geo = new THREE.BufferGeometry().setFromPoints([start.clone(), end.clone()]);
    const mat = new THREE.LineBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.95,
    });
    const line = new THREE.Line(geo, mat);
    this.scene.add(line);
    this.tracers.push({ line, mat, life: 0.16, maxLife: 0.16 });
  }

  private spawnSparks(origin: THREE.Vector3, colorHex: number): void {
    const count = 14;
    const pos = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = origin.x;
      pos[i * 3 + 1] = origin.y;
      pos[i * 3 + 2] = origin.z;
      velocities[i * 3] = (Math.random() - 0.5) * 4.5;
      velocities[i * 3 + 1] = Math.random() * 3.5 + 0.5;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 4.5;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const mat = new THREE.PointsMaterial({
      color: colorHex,
      size: 0.08,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.sparks.push({ points, velocities, mat, life: 0.35 });
  }

  private handleResize(): void {
    const w = this.container.clientWidth || window.innerWidth;
    const h = this.container.clientHeight || window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (!this.isPlaying || this.isPaused) return;
    if (e.code === 'Space') {
      e.preventDefault();
      if (!e.repeat) this.triggerJump();
    } else if ((e.code === 'KeyE' || e.code === 'KeyF') && !e.repeat) {
      this.toggleCarryCube();
    } else if (e.code === 'KeyR' && !e.repeat) {
      this.resetLevel();
    } else if (e.code === 'KeyQ' && !e.repeat) {
      this.firePortal('amber');
    }
    this.keys.add(e.code);
  }

  private handleKeyUp(e: KeyboardEvent): void {
    this.keys.delete(e.code);
  }

  private handleMouseMove(e: MouseEvent): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    if (document.pointerLockElement !== this.renderer.domElement) return;
    const sens = 0.0022;
    this.yaw -= e.movementX * sens;
    this.pitch = THREE.MathUtils.clamp(this.pitch - e.movementY * sens, -1.48, 1.48);
  }

  private handleMouseDown(e: MouseEvent): void {
    if (!this.isPlaying || this.isPaused || this.levelCompleted) return;
    this.sound.unlock();
    if (!this.isMobileDevice() && document.pointerLockElement !== this.renderer.domElement) {
      this.requestPointerLockSafe();
      return;
    }
    if (e.button === 0) {
      this.firePortal('cyan');
    } else if (e.button === 2) {
      this.firePortal('amber');
    }
  }

  private syncCameraToPlayer(): void {
    this.camera.position.set(
      this.playerPos.x,
      this.playerPos.y + PLAYER_EYE_HEIGHT,
      this.playerPos.z
    );
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }

  private tick = (): void => {
    if (this.disposed) return;

    const rawDt = this.clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const elapsed = this.clock.elapsedTime;

    this.updateAtmosphericRain(dt);
    this.updatePortalsVisual(elapsed);
    this.updateTracersAndSparks(dt);

    if (!this.isPlaying) {
      // Title screen atmospheric orbit pan
      this.titlePanTime += dt * 0.22;
      this.camera.position.set(
        Math.sin(this.titlePanTime) * 4.2,
        2.9 + Math.sin(this.titlePanTime * 0.6) * 0.35,
        6.5 + Math.cos(this.titlePanTime * 0.7) * 2.2
      );
      this.camera.lookAt(0, 1.2, -5.5);
    } else if (!this.isPaused && !this.levelCompleted) {
      this.levelElapsed += dt;
      this.stepSimulation(dt, elapsed);
    }

    this.renderer.render(this.scene, this.camera);

    if (this.isSoftwareGl) {
      this.afterDraw(this.tick);
    } else {
      this.frameId = requestAnimationFrame(this.tick);
    }
  };

  private afterDraw(cb: () => void): void {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.disposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.frameId = window.setTimeout(poll, 5);
      } else {
        if (sync) gl.deleteSync(sync);
        this.frameId = window.setTimeout(cb, 80);
      }
    };
    this.frameId = window.setTimeout(poll, 5);
  }

  private stepSimulation(dt: number, elapsed: number): void {
    // Sub-step physics at <= 1/120s for rock-solid portal crossings & collisions
    const steps = dt > 0.018 ? 2 : 1;
    const subDt = dt / steps;

    for (let s = 0; s < steps; s++) {
      this.stepPlayer(subDt);
      this.stepCubes(subDt);
    }

    this.updateButtonsAndDoor(dt);
    this.updateLasers(dt);
    this.syncCameraToPlayer();
    this.animatePortalGun(dt, elapsed);

    // Check Exit Door Completion
    if (this.doorWasOpen) {
      const distSq =
        (this.playerPos.x - this.doorTriggerPos.x) ** 2 +
        (this.playerPos.z - this.doorTriggerPos.z) ** 2;
      if (distSq < 1.15 && Math.abs(this.playerPos.y + 1.0 - this.doorTriggerPos.y) < 1.6) {
        this.levelCompleted = true;
        if (document.pointerLockElement === this.renderer.domElement) {
          document.exitPointerLock();
        }
        this.sound.playDoorUnlock();
        this.callbacks.onLevelComplete(this.currentLevelIndex, this.levelElapsed);
      }
    }

    // Grab hint check
    this.canGrabCube = !this.carriedCube && this.findGrabbableCube() !== null;

    if (elapsed - this.lastHudPush > 0.1) {
      this.pushHud(false);
    }
  }

  private stepPlayer(dt: number): void {
    if (this.teleportCooldown > 0) this.teleportCooldown -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    // Input direction
    let moveForward = 0;
    let moveRight = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) moveForward += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) moveForward -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) moveRight += 1;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) moveRight -= 1;

    moveRight += this.touchMove.x;
    moveForward += this.touchMove.y;

    const len = Math.hypot(moveForward, moveRight);
    if (len > 1) {
      moveForward /= len;
      moveRight /= len;
    }

    const sinY = Math.sin(this.yaw);
    const cosY = Math.cos(this.yaw);
    const wishX = -sinY * moveForward + cosY * moveRight;
    const wishZ = -cosY * moveForward - sinY * moveRight;

    const maxSpeed = 6.2;
    const accel = this.grounded ? 42.0 : 14.0;
    const friction = this.grounded ? 11.0 : 0.6;

    // Apply friction horizontally
    const speed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (speed > 0.001) {
      const drop = speed * friction * dt;
      const newSpeed = Math.max(0, speed - drop) / speed;
      this.playerVel.x *= newSpeed;
      this.playerVel.z *= newSpeed;
    }

    // Accelerate in wish direction
    this.playerVel.x += wishX * accel * dt;
    this.playerVel.z += wishZ * accel * dt;

    // Cap normal ground walk speed (allow higher speeds from portal flings!)
    const newHoriz = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.grounded && newHoriz > maxSpeed) {
      const clampScale = maxSpeed / newHoriz;
      this.playerVel.x *= clampScale;
      this.playerVel.z *= clampScale;
    }

    // Jump with coyote time & buffering
    if (this.jumpBufferTimer > 0 && this.coyoteTimer > 0) {
      this.playerVel.y = 7.8;
      this.grounded = false;
      this.coyoteTimer = 0;
      this.jumpBufferTimer = 0;
      this.sound.playJump();
    }

    // Gravity
    this.playerVel.y -= GRAVITY * dt;
    this.playerVel.y = Math.max(this.playerVel.y, -26);

    // Integrate
    this.playerPos.addScaledVector(this.playerVel, dt);

    // Portal crossing check
    if (this.teleportCooldown <= 0) {
      const crossing = checkPortalCrossing(
        this.playerPos,
        PLAYER_HEIGHT * 0.5,
        this.playerVel,
        this.cyanPortal,
        this.amberPortal
      );
      if (crossing) {
        const res = transformThroughPortal(
          this.playerPos,
          PLAYER_HEIGHT * 0.5,
          this.playerVel,
          this.yaw,
          this.pitch,
          crossing.entry,
          crossing.exit,
          0.62
        );
        this.playerPos.copy(res.newPos);
        this.playerVel.copy(res.newVel);
        this.yaw = res.newYaw;
        this.pitch = res.newPitch;
        this.teleportCooldown = 0.22;
        this.grounded = false;
        this.sound.playTeleport();
      }
    }

    const skipPortalWall = isNearActivePortal(
      this.playerPos,
      PLAYER_HEIGHT * 0.5,
      this.cyanPortal,
      this.amberPortal
    );

    const doorCollider = this.doorWasOpen ? null : this.doorClosedBlock;
    const col = resolveBoxAabbCollision(
      this.playerPos,
      this.playerVel,
      PLAYER_RADIUS,
      PLAYER_HEIGHT,
      this.blocks,
      doorCollider,
      skipPortalWall
    );

    if (col.grounded) {
      this.grounded = true;
      this.coyoteTimer = 0.12;
    } else {
      this.grounded = false;
    }

    if (col.touchedHazard || this.playerPos.y < -10) {
      this.sound.playHazard();
      this.callbacks.onFeedback('☢️ RADIATION BREACH — RESPAWNING AT CHECKPOINT', 'danger');
      this.playerPos.set(
        this.currentLevel.playerStart[0],
        this.currentLevel.playerStart[1],
        this.currentLevel.playerStart[2]
      );
      this.playerVel.set(0, 0, 0);
      this.yaw = this.currentLevel.playerYaw;
      this.pitch = 0;
    }
  }

  private stepCubes(dt: number): void {
    for (const cube of this.cubes) {
      if (cube.teleportCooldown > 0) cube.teleportCooldown -= dt;

      if (cube.held) {
        _euler.set(this.pitch, this.yaw, 0, 'YXZ');
        _vecA.set(0, 0, -1).applyEuler(_euler).normalize();
        _vecB.copy(this.camera.position).addScaledVector(_vecA, 1.48);

        // Smooth damping to carry target
        cube.pos.x = THREE.MathUtils.damp(cube.pos.x, _vecB.x, 18, dt);
        cube.pos.y = THREE.MathUtils.damp(cube.pos.y, _vecB.y - CUBE_HALF, 18, dt);
        cube.pos.z = THREE.MathUtils.damp(cube.pos.z, _vecB.z, 18, dt);

        // Keep held cube from clipping into walls
        const doorCollider = this.doorWasOpen ? null : this.doorClosedBlock;
        resolveBoxAabbCollision(
          cube.pos,
          _vecC.set(0, 0, 0),
          CUBE_HALF,
          CUBE_HALF * 2,
          this.blocks,
          doorCollider,
          false
        );

        cube.mesh.position.set(cube.pos.x, cube.pos.y + CUBE_HALF, cube.pos.z);
        cube.mesh.rotation.y = this.yaw;
        continue;
      }

      // Free-falling / resting cube
      cube.vel.y -= GRAVITY * dt;
      cube.vel.y = Math.max(cube.vel.y, -24);
      cube.pos.addScaledVector(cube.vel, dt);

      if (cube.teleportCooldown <= 0) {
        const crossing = checkPortalCrossing(
          cube.pos,
          CUBE_HALF,
          cube.vel,
          this.cyanPortal,
          this.amberPortal
        );
        if (crossing) {
          const res = transformThroughPortal(
            cube.pos,
            CUBE_HALF,
            cube.vel,
            0,
            0,
            crossing.entry,
            crossing.exit,
            0.54
          );
          cube.pos.copy(res.newPos);
          cube.vel.copy(res.newVel);
          cube.teleportCooldown = 0.25;
          this.sound.playTeleport();
        }
      }

      const skipPortalWall = isNearActivePortal(
        cube.pos,
        CUBE_HALF,
        this.cyanPortal,
        this.amberPortal
      );

      const doorCollider = this.doorWasOpen ? null : this.doorClosedBlock;
      const col = resolveBoxAabbCollision(
        cube.pos,
        cube.vel,
        CUBE_HALF,
        CUBE_HALF * 2,
        this.blocks,
        doorCollider,
        skipPortalWall
      );

      if (col.grounded) {
        cube.vel.x *= Math.max(0, 1 - 10 * dt);
        cube.vel.z *= Math.max(0, 1 - 10 * dt);
      }

      if (col.touchedHazard || cube.pos.y < -10) {
        cube.pos.set(cube.spawnPos.x, cube.spawnPos.y - CUBE_HALF, cube.spawnPos.z);
        cube.vel.set(0, 0, 0);
        this.callbacks.onFeedback('📦 CUBE RECONSTITUTED AT SPAWN PAD', 'amber');
      }

      cube.mesh.position.set(cube.pos.x, cube.pos.y + CUBE_HALF, cube.pos.z);
    }
  }

  private updateButtonsAndDoor(dt: number): void {
    for (const btn of this.buttons) {
      let active = false;

      // Player standing on button
      const pDist = Math.hypot(this.playerPos.x - btn.pos.x, this.playerPos.z - btn.pos.z);
      if (pDist < 0.92 && Math.abs(this.playerPos.y - btn.pos.y) < 0.55) {
        active = true;
      }

      // Cube resting on button
      for (const cube of this.cubes) {
        const cDist = Math.hypot(cube.pos.x - btn.pos.x, cube.pos.z - btn.pos.z);
        if (cDist < 0.96 && Math.abs(cube.pos.y - btn.pos.y) < 0.6) {
          active = true;
        }
      }

      if (active !== btn.pressed) {
        btn.pressed = active;
        this.sound.playSwitch(active);
        this.pushHud(true);
      }

      const targetY = active ? 0.14 : 0.21;
      btn.plate.position.y = THREE.MathUtils.damp(btn.plate.position.y, targetY, 16, dt);
      const colHex = active ? 0x00f0ff : 0xff2a4b;
      btn.glowMat.color.setHex(colHex);
      btn.glowMat.emissive.setHex(colHex);
    }

    // Check door unlock requirements
    const reqBtns = this.currentLevel.exitDoor.requiresButtons ?? [];
    const reqRecs = this.currentLevel.exitDoor.requiresReceptors ?? [];
    const btnsOk = reqBtns.every((id) => this.buttons.find((b) => b.id === id)?.pressed);
    const recsOk = reqRecs.every((id) => this.laserReceptors.find((r) => r.id === id)?.powered);
    const open = btnsOk && recsOk;

    if (open !== this.doorWasOpen) {
      this.doorWasOpen = open;
      if (open) {
        this.sound.playDoorUnlock();
        this.callbacks.onFeedback('🚪 AIRLOCK UNLOCKED — PROCEED TO EXIT', 'success');
      }
      this.pushHud(true);
    }

    if (this.exitDoor) {
      this.doorOpenAmount = THREE.MathUtils.damp(this.doorOpenAmount, open ? 1 : 0, 7, dt);
      this.exitDoor.leftLeaf.position.x = -0.56 - this.doorOpenAmount * 0.98;
      this.exitDoor.rightLeaf.position.x = 0.56 + this.doorOpenAmount * 0.98;

      const statusHex = open ? 0x00f0ff : 0xff2a4b;
      this.exitDoor.statusMat.color.setHex(statusHex);
      this.exitDoor.statusMat.emissive.setHex(statusHex);
      this.exitDoor.light.color.setHex(statusHex);
      this.exitDoor.portalGlowMat.opacity = open ? 0.42 : 0.1;
    }
  }

  private updateLasers(dt: number): void {
    // Reset receptors & hide pool
    const prevPowered = new Map<string, boolean>();
    for (const r of this.laserReceptors) {
      prevPowered.set(r.id, r.powered);
      r.powered = false;
    }
    for (const m of this.laserMeshes) m.visible = false;

    let segIdx = 0;
    const raycaster = new THREE.Raycaster();

    for (const emitter of this.laserEmitters) {
      const origin = _vecA.copy(emitter.pos).addScaledVector(emitter.dir, 0.42);
      const dir = _vecB.copy(emitter.dir).normalize();

      for (let bounce = 0; bounce < 4 && segIdx < MAX_LASER_SEGMENTS; bounce++) {
        let bestT = 55;
        let hitKind: 'wall' | 'portal' | 'receptor' = 'wall';
        let hitPortal: PortalState | null = null;
        let hitReceptor: LaserReceptorEntity | null = null;

        // 1. Check blocks (ignore glass)
        raycaster.set(origin, dir);
        raycaster.far = bestT;
        const blockHits = raycaster.intersectObjects(this.raycastMeshes, false);
        if (blockHits.length > 0 && blockHits[0].distance < bestT) {
          bestT = blockHits[0].distance;
          hitKind = 'wall';
        }

        // 2. Check receptors
        for (const rec of this.laserReceptors) {
          _vecC.copy(rec.pos).sub(origin);
          const proj = _vecC.dot(dir);
          if (proj > 0.05 && proj < bestT) {
            _vecD.copy(origin).addScaledVector(dir, proj);
            if (_vecD.distanceTo(rec.pos) < 0.46) {
              bestT = proj;
              hitKind = 'receptor';
              hitReceptor = rec;
            }
          }
        }

        // 3. Check active portals (only if both are active)
        if (this.cyanPortal.active && this.amberPortal.active) {
          for (const p of [this.cyanPortal, this.amberPortal]) {
            const denom = dir.dot(p.normal);
            if (denom < -0.05) {
              _vecC.copy(p.position).sub(origin);
              const t = _vecC.dot(p.normal) / denom;
              if (t > 0.08 && t < bestT + 0.08) {
                _vecD.copy(origin).addScaledVector(dir, t);
                const rel = _vecD.sub(p.position);
                const rx = rel.dot(p.right);
                const ry = rel.dot(p.up);
                const normDistSq = (rx / PORTAL_HALF_W) ** 2 + (ry / PORTAL_HALF_H) ** 2;
                if (normDistSq <= 1.05) {
                  bestT = t;
                  hitKind = 'portal';
                  hitPortal = p;
                }
              }
            }
          }
        }

        // Draw beam segment
        const endPt = new THREE.Vector3().copy(origin).addScaledVector(dir, bestT);
        const segMesh = this.laserMeshes[segIdx++];
        segMesh.visible = true;
        segMesh.position.copy(origin).lerp(endPt, 0.5);
        segMesh.scale.set(1, bestT, 1);
        segMesh.quaternion.setFromUnitVectors(_upAxis, dir);

        if (hitKind === 'receptor' && hitReceptor) {
          hitReceptor.powered = true;
          break;
        } else if (hitKind === 'portal' && hitPortal) {
          const exitPortal = hitPortal === this.cyanPortal ? this.amberPortal : this.cyanPortal;
          const relHit = endPt.clone().sub(hitPortal.position);
          const rx = relHit.dot(hitPortal.right);
          const ry = relHit.dot(hitPortal.up);

          const dx = dir.dot(hitPortal.right);
          const dy = dir.dot(hitPortal.up);
          const dz = dir.dot(hitPortal.normal);

          origin
            .copy(exitPortal.position)
            .addScaledVector(exitPortal.right, -rx)
            .addScaledVector(exitPortal.up, ry)
            .addScaledVector(exitPortal.normal, 0.12);

          dir
            .set(0, 0, 0)
            .addScaledVector(exitPortal.right, -dx)
            .addScaledVector(exitPortal.up, dy)
            .addScaledVector(exitPortal.normal, -dz)
            .normalize();
        } else {
          break;
        }
      }
    }

    // Animate receptor visual state
    for (const rec of this.laserReceptors) {
      if (rec.powered && !prevPowered.get(rec.id)) {
        this.sound.playSwitch(true);
        this.callbacks.onFeedback('⚡ OPTIC RECEPTOR CHARGED', 'cyan');
        this.pushHud(true);
      }
      const ringCol = rec.powered ? 0x00f0ff : 0xff3b30;
      rec.ringMat.color.setHex(ringCol);
      rec.ringMat.emissive.setHex(ringCol);
      rec.coreMat.emissive.setHex(rec.powered ? 0x00f0ff : 0xff0055);
      rec.spinner.rotation.z += dt * (rec.powered ? 4.5 : 0.7);
    }
  }

  private animatePortalGun(dt: number, elapsed: number): void {
    this.gunRecoil = THREE.MathUtils.damp(this.gunRecoil, 0, 14, dt);
    const horizSpeed = Math.hypot(this.playerVel.x, this.playerVel.z);
    if (this.grounded && horizSpeed > 0.4) {
      this.gunBobPhase += dt * horizSpeed * 1.9;
    }
    const bobX = Math.cos(this.gunBobPhase * 0.5) * 0.008;
    const bobY = Math.abs(Math.sin(this.gunBobPhase)) * 0.011;

    this.portalGun.group.position.set(
      0.28 + bobX,
      -0.25 - bobY + this.gunRecoil * 0.015,
      -0.46 + this.gunRecoil * 0.075
    );
    this.portalGun.group.rotation.x = 0.03 + this.gunRecoil * 0.14;
    this.portalGun.prongs.rotation.z = elapsed * 0.9;
  }

  private updatePortalsVisual(elapsed: number): void {
    const linked = this.cyanPortal.active && this.amberPortal.active ? 1.0 : 0.0;
    this.cyanVisual.shaderMat.uniforms.uTime.value = elapsed;
    this.cyanVisual.shaderMat.uniforms.uLinked.value = linked;
    this.amberVisual.shaderMat.uniforms.uTime.value = elapsed;
    this.amberVisual.shaderMat.uniforms.uLinked.value = linked;
  }

  private updateAtmosphericRain(dt: number): void {
    const pos = this.rainPositions;
    for (let i = 0; i < pos.length; i += 3) {
      pos[i + 1] -= dt * 4.4;
      if (pos[i + 1] < -1) {
        pos[i + 1] = 11.5;
      }
    }
    this.rainPoints.geometry.attributes.position.needsUpdate = true;
  }

  private updateTracersAndSparks(dt: number): void {
    for (let i = this.tracers.length - 1; i >= 0; i--) {
      const t = this.tracers[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        t.mat.dispose();
        this.tracers.splice(i, 1);
      } else {
        t.mat.opacity = t.life / t.maxLife;
      }
    }

    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const s = this.sparks[i];
      s.life -= dt;
      if (s.life <= 0) {
        this.scene.remove(s.points);
        s.points.geometry.dispose();
        s.mat.dispose();
        this.sparks.splice(i, 1);
      } else {
        const arr = s.points.geometry.attributes.position.array as Float32Array;
        for (let j = 0; j < arr.length; j += 3) {
          s.velocities[j + 1] -= 9.8 * dt;
          arr[j] += s.velocities[j] * dt;
          arr[j + 1] += s.velocities[j + 1] * dt;
          arr[j + 2] += s.velocities[j + 2] * dt;
        }
        s.points.geometry.attributes.position.needsUpdate = true;
        s.mat.opacity = s.life / 0.35;
      }
    }
  }

  private pushHud(force: boolean): void {
    const buttonsActive = this.buttons.filter((b) => b.pressed).length;
    const receptorsActive = this.laserReceptors.filter((r) => r.powered).length;
    const pointerLocked = document.pointerLockElement === this.renderer.domElement;
    const sec = Math.floor(this.levelElapsed);

    const sig = `${this.currentLevelIndex}|${this.cyanPortal.active}|${this.amberPortal.active}|${Boolean(
      this.carriedCube
    )}|${this.canGrabCube}|${buttonsActive}|${receptorsActive}|${this.doorWasOpen}|${pointerLocked}|${sec}`;

    if (!force && sig === this.lastHudSig) return;
    this.lastHudSig = sig;
    this.lastHudPush = this.clock.elapsedTime;

    this.callbacks.onHudUpdate({
      levelIndex: this.currentLevelIndex,
      levelCode: this.currentLevel.code,
      levelTitle: this.currentLevel.title,
      levelHint: this.currentLevel.hint,
      cyanActive: this.cyanPortal.active,
      amberActive: this.amberPortal.active,
      carryingCube: Boolean(this.carriedCube),
      canGrabCube: this.canGrabCube,
      buttonsTotal: this.buttons.length,
      buttonsActive,
      receptorsTotal: this.laserReceptors.length,
      receptorsActive,
      doorOpen: this.doorWasOpen,
      pointerLocked,
      elapsedSeconds: sec,
    });
  }

  public dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frameId);
    clearTimeout(this.frameId);

    window.removeEventListener('resize', this.onResizeBound);
    window.removeEventListener('keydown', this.onKeyDownBound);
    window.removeEventListener('keyup', this.onKeyUpBound);
    window.removeEventListener('blur', this.onBlurBound);
    document.removeEventListener('mousemove', this.onMouseMoveBound);
    this.renderer.domElement.removeEventListener('mousedown', this.onMouseDownBound);
    this.renderer.domElement.removeEventListener('contextmenu', this.onContextMenuBound);
    document.removeEventListener('pointerlockchange', this.onPointerLockChangeBound);

    this.clearGroup(this.levelGroup);
    this.clearGroup(this.dynamicGroup);
    this.textures.dispose();
    this.envRT.dispose();
    this.rainPoints.geometry.dispose();
    (this.rainPoints.material as THREE.Material).dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
