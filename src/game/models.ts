import * as THREE from 'three';
import { PortalColor } from './types';

export interface PortalGunHandle {
  group: THREE.Group;
  coreMat: THREE.MeshStandardMaterial;
  tipLight: THREE.PointLight;
  prongs: THREE.Group;
}

export function createPortalGun(): PortalGunHandle {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x1a2029,
    roughness: 0.45,
    metalness: 0.72,
  });
  const shroudMat = new THREE.MeshStandardMaterial({
    color: 0x8d99ae,
    roughness: 0.25,
    metalness: 0.85,
  });
  const darkTrimMat = new THREE.MeshStandardMaterial({
    color: 0x0b0f14,
    roughness: 0.75,
    metalness: 0.3,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 2.2,
    roughness: 0.15,
    metalness: 0.1,
  });

  // 1. Primary Chassis
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.12, 0.36), bodyMat);
  chassis.position.set(0, 0, 0);
  group.add(chassis);

  // 2. Curved Upper Shroud
  const shroud = new THREE.Mesh(
    new THREE.CylinderGeometry(0.062, 0.068, 0.28, 12),
    shroudMat
  );
  shroud.rotation.x = Math.PI / 2;
  shroud.position.set(0, 0.03, -0.02);
  group.add(shroud);

  // 3. Exposed Glowing Quantum Core Chamber
  const coreTube = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.18, 12),
    coreMat
  );
  coreTube.rotation.x = Math.PI / 2;
  coreTube.position.set(0, 0.045, -0.14);
  group.add(coreTube);

  // 4. Outer containment ribs around core
  for (let i = 0; i < 3; i++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(0.048, 0.007, 8, 16),
      darkTrimMat
    );
    rib.position.set(0, 0.045, -0.08 - i * 0.055);
    group.add(rib);
  }

  // 5. Front Nozzle Ring
  const muzzle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.052, 0.045, 0.06, 14),
    darkTrimMat
  );
  muzzle.rotation.x = Math.PI / 2;
  muzzle.position.set(0, 0.02, -0.25);
  group.add(muzzle);

  // 6. Three Articulated Emitter Prongs
  const prongs = new THREE.Group();
  prongs.position.set(0, 0.02, -0.26);
  for (let i = 0; i < 3; i++) {
    const angle = (i * Math.PI * 2) / 3 - Math.PI / 2;
    const prongPivot = new THREE.Group();
    prongPivot.rotation.z = angle;

    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.016, 0.095), shroudMat);
    arm.position.set(0, 0.058, -0.04);
    arm.rotation.x = 0.18;
    prongPivot.add(arm);

    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.01, 0.022), coreMat);
    tip.position.set(0, 0.05, -0.088);
    prongPivot.add(tip);

    prongs.add(prongPivot);
  }
  group.add(prongs);

  // 7. Rear Grip & Side Handle
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.12, 0.065), darkTrimMat);
  grip.position.set(0, -0.095, 0.11);
  grip.rotation.x = 0.25;
  group.add(grip);

  // 8. Top Sight Rail
  const rail = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.022, 0.18), darkTrimMat);
  rail.position.set(0, 0.098, 0.02);
  group.add(rail);

  const tipLight = new THREE.PointLight(0x00f0ff, 0.85, 2.2);
  tipLight.position.set(0, 0.03, -0.34);
  group.add(tipLight);

  return { group, coreMat, tipLight, prongs };
}

export interface PortalVisualHandle {
  group: THREE.Group;
  shaderMat: THREE.ShaderMaterial;
  rimMat: THREE.MeshStandardMaterial;
  light: THREE.PointLight;
}

export function createPortalVisual(color: PortalColor): PortalVisualHandle {
  const group = new THREE.Group();
  const hex = color === 'cyan' ? 0x00f0ff : 0xff9100;
  const secondaryHex = color === 'cyan' ? 0x004cff : 0xff2a6d;

  // Oval geometry scaled 0.62 x 1.08 -> 1.24m wide x 2.16m tall
  const discGeo = new THREE.CircleGeometry(1, 40);
  discGeo.scale(0.58, 1.02, 1);

  const shaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColorA: { value: new THREE.Color(hex) },
      uColorB: { value: new THREE.Color(secondaryHex) },
      uLinked: { value: 0.0 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform vec3 uColorA;
      uniform vec3 uColorB;
      uniform float uLinked;
      varying vec2 vUv;

      void main() {
        vec2 p = vUv * 2.0 - 1.0;
        float r = length(p);
        float a = atan(p.y, p.x);

        float swirl = sin(a * 5.0 - uTime * 4.5 + r * 9.0) * 0.5 + 0.5;
        float ripple = sin(r * 18.0 - uTime * 6.0) * 0.5 + 0.5;
        float rim = smoothstep(0.68, 0.99, r);
        float core = 1.0 - smoothstep(0.0, 0.72, r);

        vec3 voidCol = mix(vec3(0.01, 0.03, 0.06), uColorB * 0.45, uLinked);
        vec3 energyCol = mix(uColorB, uColorA, swirl * 0.7 + ripple * 0.3);
        vec3 col = mix(voidCol, energyCol, clamp(rim * 1.15 + swirl * 0.35 * (1.0 - core * 0.7), 0.0, 1.0));
        col += uColorA * pow(rim, 2.2) * 1.35;

        float alpha = smoothstep(1.0, 0.92, r);
        gl_FragColor = vec4(col, alpha * 0.95);
      }
    `,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

  const vortex = new THREE.Mesh(discGeo, shaderMat);
  vortex.position.z = 0.018;
  group.add(vortex);

  // Outer Neon Frame Ring
  const ringGeo = new THREE.TorusGeometry(1, 0.055, 10, 44);
  ringGeo.scale(0.61, 1.05, 0.55);
  const rimMat = new THREE.MeshStandardMaterial({
    color: hex,
    emissive: hex,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.5,
  });
  const ring = new THREE.Mesh(ringGeo, rimMat);
  ring.position.z = 0.02;
  group.add(ring);

  // Dark metallic collar behind ring
  const collarGeo = new THREE.TorusGeometry(1, 0.075, 8, 44);
  collarGeo.scale(0.64, 1.08, 0.35);
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0x0f151e,
    roughness: 0.65,
    metalness: 0.8,
  });
  const collar = new THREE.Mesh(collarGeo, collarMat);
  collar.position.z = 0.008;
  group.add(collar);

  const light = new THREE.PointLight(hex, 2.2, 7.5, 1.6);
  light.position.z = 0.45;
  group.add(light);

  group.visible = false;
  return { group, shaderMat, rimMat, light };
}

export interface CubeVisualHandle {
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
}

export function createWeightedCube(): CubeVisualHandle {
  const group = new THREE.Group();
  const size = 0.74;

  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x3b4656,
    roughness: 0.5,
    metalness: 0.65,
  });
  const bumperMat = new THREE.MeshStandardMaterial({
    color: 0x181f28,
    roughness: 0.3,
    metalness: 0.85,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 1.5,
    roughness: 0.2,
    metalness: 0.2,
  });

  // 1. Primary chassis
  const core = new THREE.Mesh(new THREE.BoxGeometry(size, size, size), hullMat);
  core.castShadow = true;
  core.receiveShadow = true;
  group.add(core);

  // 2-9. 8 Corner armor bumpers
  const bSize = 0.22;
  const offset = size * 0.5 - bSize * 0.38;
  const bumperGeo = new THREE.BoxGeometry(bSize, bSize, bSize);
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const bumper = new THREE.Mesh(bumperGeo, bumperMat);
        bumper.position.set(sx * offset, sy * offset, sz * offset);
        bumper.castShadow = true;
        group.add(bumper);
      }
    }
  }

  // 10-15. Face neon emblem rings
  const emblemGeo = new THREE.TorusGeometry(0.16, 0.022, 8, 24);
  const faces: Array<[number, number, number, number, number]> = [
    [0, 0, size * 0.51, 0, 0],
    [0, 0, -size * 0.51, 0, Math.PI],
    [size * 0.51, 0, 0, 0, Math.PI / 2],
    [-size * 0.51, 0, 0, 0, -Math.PI / 2],
    [0, size * 0.51, 0, Math.PI / 2, 0],
    [0, -size * 0.51, 0, -Math.PI / 2, 0],
  ];
  for (const [fx, fy, fz, rx, ry] of faces) {
    const emblem = new THREE.Mesh(emblemGeo, ringMat);
    emblem.position.set(fx, fy, fz);
    emblem.rotation.set(rx, ry, 0);
    group.add(emblem);
  }

  return { group, ringMat };
}

export interface ButtonVisualHandle {
  group: THREE.Group;
  plate: THREE.Mesh;
  glowMat: THREE.MeshStandardMaterial;
}

export function createPressureButton(): ButtonVisualHandle {
  const group = new THREE.Group();

  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x1b222c,
    roughness: 0.65,
    metalness: 0.7,
  });
  const collarMat = new THREE.MeshStandardMaterial({
    color: 0xd98200,
    roughness: 0.45,
    metalness: 0.35,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2a4b,
    emissiveIntensity: 1.5,
    roughness: 0.25,
    metalness: 0.2,
  });

  // Base plinth (bottom at y=0)
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.92, 1.04, 0.14, 8), baseMat);
  base.position.y = 0.07;
  base.receiveShadow = true;
  group.add(base);

  // Hazard collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.76, 0.86, 0.08, 8), collarMat);
  collar.position.y = 0.15;
  group.add(collar);

  // Depressible center plate
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.68, 0.68, 0.09, 16), glowMat);
  plate.position.y = 0.21;
  group.add(plate);

  return { group, plate, glowMat };
}

export interface LaserEmitterHandle {
  group: THREE.Group;
  lensMat: THREE.MeshStandardMaterial;
}

export function createLaserEmitter(dir: THREE.Vector3): LaserEmitterHandle {
  const group = new THREE.Group();

  const housingMat = new THREE.MeshStandardMaterial({
    color: 0x1d2530,
    roughness: 0.5,
    metalness: 0.78,
  });
  const brassMat = new THREE.MeshStandardMaterial({
    color: 0xb08944,
    roughness: 0.3,
    metalness: 0.85,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0xff007f,
    emissive: 0xff007f,
    emissiveIntensity: 2.5,
    roughness: 0.1,
    metalness: 0.1,
  });

  // 1. Mount block
  const mount = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.28), housingMat);
  mount.position.z = -0.14;
  group.add(mount);

  // 2. Barrel barrel
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.21, 0.42, 12), brassMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.z = 0.16;
  group.add(barrel);

  // 3. Focusing coil
  const coil = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.032, 8, 20), housingMat);
  coil.position.z = 0.28;
  group.add(coil);

  // 4. Emitter lens
  const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.06, 16), lensMat);
  lens.rotation.x = Math.PI / 2;
  lens.position.z = 0.37;
  group.add(lens);

  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
  group.quaternion.copy(q);

  return { group, lensMat };
}

export interface LaserReceptorHandle {
  group: THREE.Group;
  ringMat: THREE.MeshStandardMaterial;
  coreMat: THREE.MeshStandardMaterial;
  spinner: THREE.Mesh;
}

export function createLaserReceptor(normal: THREE.Vector3): LaserReceptorHandle {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1c232d,
    roughness: 0.55,
    metalness: 0.75,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xff4500,
    emissive: 0xff2a00,
    emissiveIntensity: 1.4,
    roughness: 0.25,
    metalness: 0.4,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x2a0f18,
    emissive: 0xff0055,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.2,
  });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.52, 0.18, 12), frameMat);
  base.rotation.x = Math.PI / 2;
  base.position.z = 0.09;
  group.add(base);

  const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.2, 0.14, 16), coreMat);
  dish.rotation.x = Math.PI / 2;
  dish.position.z = 0.2;
  group.add(dish);

  const spinner = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.04, 8, 6), ringMat);
  spinner.position.z = 0.22;
  group.add(spinner);

  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal.clone().normalize());
  group.quaternion.copy(q);

  return { group, ringMat, coreMat, spinner };
}

export interface ExitDoorHandle {
  group: THREE.Group;
  leftLeaf: THREE.Mesh;
  rightLeaf: THREE.Mesh;
  statusMat: THREE.MeshStandardMaterial;
  portalGlowMat: THREE.MeshBasicMaterial;
  light: THREE.PointLight;
}

export function createExitDoor(): ExitDoorHandle {
  const group = new THREE.Group();

  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x161c24,
    roughness: 0.6,
    metalness: 0.78,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x2b3645,
    roughness: 0.4,
    metalness: 0.7,
  });
  const statusMat = new THREE.MeshStandardMaterial({
    color: 0xff3b30,
    emissive: 0xff2a4b,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.2,
  });

  // Left & Right Pillars + Header (Door opening: 2.2m wide x 2.7m tall)
  const leftPillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 0.5), frameMat);
  leftPillar.position.set(-1.275, 1.5, 0);
  group.add(leftPillar);

  const rightPillar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 3.0, 0.5), frameMat);
  rightPillar.position.set(1.275, 1.5, 0);
  group.add(rightPillar);

  const header = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.42, 0.54), frameMat);
  header.position.set(0, 2.95, 0);
  group.add(header);

  // Status Neon Light Bar on Header
  const statusBar = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.14, 0.12), statusMat);
  statusBar.position.set(0, 2.95, 0.26);
  group.add(statusBar);

  // Twin Sliding Blast Leaves
  const leftLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.72, 0.2), leafMat);
  leftLeaf.position.set(-0.56, 1.36, 0);
  group.add(leftLeaf);

  const rightLeaf = new THREE.Mesh(new THREE.BoxGeometry(1.12, 2.72, 0.2), leafMat);
  rightLeaf.position.set(0.56, 1.36, 0);
  group.add(rightLeaf);

  // Exit extraction glow field behind doors
  const portalGlowMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    transparent: true,
    opacity: 0.15,
    side: THREE.DoubleSide,
  });
  const field = new THREE.Mesh(new THREE.PlaneGeometry(2.15, 2.7), portalGlowMat);
  field.position.set(0, 1.35, -0.15);
  group.add(field);

  const light = new THREE.PointLight(0xff2a4b, 1.6, 6);
  light.position.set(0, 2.6, 0.8);
  group.add(light);

  return { group, leftLeaf, rightLeaf, statusMat, portalGlowMat, light };
}

export function createFacilityProp(
  type: 'pillar' | 'barrel' | 'pipe' | 'sconce',
  accentColor = 0x00f0ff
): THREE.Group {
  const group = new THREE.Group();

  const rustMat = new THREE.MeshStandardMaterial({
    color: 0x3b261d,
    roughness: 0.82,
    metalness: 0.55,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x202731,
    roughness: 0.55,
    metalness: 0.78,
  });
  const glowMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 2.0,
    roughness: 0.2,
    metalness: 0.1,
  });

  if (type === 'barrel') {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.96, 14), rustMat);
    body.position.y = 0.48;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    const bandTop = new THREE.Mesh(new THREE.TorusGeometry(0.365, 0.025, 6, 16), steelMat);
    bandTop.rotation.x = Math.PI / 2;
    bandTop.position.y = 0.72;
    group.add(bandTop);

    const bandBot = bandTop.clone();
    bandBot.position.y = 0.26;
    group.add(bandBot);

    const radRing = new THREE.Mesh(new THREE.CylinderGeometry(0.372, 0.372, 0.09, 14), glowMat);
    radRing.position.y = 0.5;
    group.add(radRing);
  } else if (type === 'pillar') {
    const col = new THREE.Mesh(new THREE.BoxGeometry(0.55, 5.2, 0.55), steelMat);
    col.position.y = 2.6;
    col.castShadow = true;
    col.receiveShadow = true;
    group.add(col);

    const base = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.35, 0.85), rustMat);
    base.position.y = 0.175;
    group.add(base);

    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, 3.6, 0.58), glowMat);
    strip.position.y = 2.6;
    group.add(strip);
  } else if (type === 'sconce') {
    const bracket = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.4, 0.18), steelMat);
    group.add(bracket);
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.25, 8), glowMat);
    tube.position.z = 0.1;
    group.add(tube);
  } else {
    // pipe cluster
    const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 4.8, 10), rustMat);
    p1.position.set(-0.18, 2.4, 0);
    group.add(p1);
    const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 4.8, 10), steelMat);
    p2.position.set(0.15, 2.4, 0.05);
    group.add(p2);
    const flange = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.16, 0.4), steelMat);
    flange.position.y = 1.6;
    group.add(flange);
  }

  return group;
}
