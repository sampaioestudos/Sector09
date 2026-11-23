import * as THREE from 'three';

export interface FacilityTextures {
  portalableMap: THREE.CanvasTexture;
  portalableRoughness: THREE.CanvasTexture;
  corrodedMap: THREE.CanvasTexture;
  corrodedRoughness: THREE.CanvasTexture;
  wetFloorMap: THREE.CanvasTexture;
  wetFloorRoughness: THREE.CanvasTexture;
  hazardMap: THREE.CanvasTexture;
  dispose: () => void;
}

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

function configureTexture(
  canvas: HTMLCanvasElement,
  isColor: boolean,
  anisotropy: number,
  repeat = 1
): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = anisotropy;
  if (isColor) {
    tex.colorSpace = THREE.SRGBColorSpace;
  }
  tex.needsUpdate = true;
  return tex;
}

export function createFacilityTextures(maxAnisotropy: number): FacilityTextures {
  const aniso = Math.min(8, Math.max(1, maxAnisotropy));
  const size = 256;

  // 1. Portalable Clean Concrete Panel (bright cool slate with recessed seams & subtle cyan micro-markers)
  const [pCanvas, pCtx] = makeCanvas(size);
  pCtx.fillStyle = '#8b9bb0';
  pCtx.fillRect(0, 0, size, size);

  // Subtle concrete grain
  for (let i = 0; i < 1800; i++) {
    const x = (i * 73) % size;
    const y = (i * 137) % size;
    const v = 128 + ((i * 29) % 36);
    pCtx.fillStyle = `rgba(${v},${v + 8},${v + 18},0.22)`;
    pCtx.fillRect(x, y, 2, 2);
  }

  // Architectural panel grid
  pCtx.strokeStyle = '#3d4a5c';
  pCtx.lineWidth = 4;
  pCtx.strokeRect(2, 2, size - 4, size - 4);
  pCtx.lineWidth = 2;
  pCtx.beginPath();
  pCtx.moveTo(size / 2, 0);
  pCtx.lineTo(size / 2, size);
  pCtx.moveTo(0, size / 2);
  pCtx.lineTo(size, size / 2);
  pCtx.stroke();

  // Subtle corner bolts
  pCtx.fillStyle = '#4e5f75';
  const offsets = [14, size / 2 - 14, size / 2 + 14, size - 14];
  for (const ox of offsets) {
    for (const oy of offsets) {
      pCtx.fillRect(ox - 2, oy - 2, 4, 4);
    }
  }

  const [prCanvas, prCtx] = makeCanvas(size);
  prCtx.fillStyle = '#a8a8a8';
  prCtx.fillRect(0, 0, size, size);
  prCtx.strokeStyle = '#444444';
  prCtx.lineWidth = 4;
  prCtx.strokeRect(2, 2, size - 4, size - 4);

  // 2. Corroded / Nuclear-Damaged Surface (dark charcoal, rust stains, cracks, radiation grime)
  const [cCanvas, cCtx] = makeCanvas(size);
  cCtx.fillStyle = '#171c22';
  cCtx.fillRect(0, 0, size, size);

  // Rust & scorch blotches
  for (let i = 0; i < 65; i++) {
    const rx = ((i * 89) % size);
    const ry = ((i * 53) % size);
    const rw = 14 + ((i * 19) % 36);
    const rh = 12 + ((i * 31) % 34);
    cCtx.fillStyle = i % 3 === 0 ? 'rgba(92, 44, 24, 0.35)' : 'rgba(12, 15, 19, 0.55)';
    cCtx.fillRect(rx, ry, rw, rh);
  }
  // Ribbed dark industrial steel bars
  cCtx.strokeStyle = '#0c0f13';
  cCtx.lineWidth = 6;
  for (let y = 0; y < size; y += 32) {
    cCtx.beginPath();
    cCtx.moveTo(0, y);
    cCtx.lineTo(size, y);
    cCtx.stroke();
  }
  // Diagonal warning scratch marks
  cCtx.strokeStyle = '#5a2d18';
  cCtx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    cCtx.beginPath();
    cCtx.moveTo((i * 41) % size, (i * 23) % size);
    cCtx.lineTo(((i * 41) % size) + 28, ((i * 23) % size) + 18);
    cCtx.stroke();
  }

  const [crCanvas, crCtx] = makeCanvas(size);
  crCtx.fillStyle = '#d4d4d4';
  crCtx.fillRect(0, 0, size, size);
  crCtx.fillStyle = '#707070';
  for (let i = 0; i < 40; i++) {
    crCtx.fillRect((i * 61) % size, (i * 97) % size, 24, 24);
  }

  // 3. Wet Neo-Noir Reflective Floor (dark tiles + specular water puddles)
  const [fCanvas, fCtx] = makeCanvas(size);
  fCtx.fillStyle = '#121821';
  fCtx.fillRect(0, 0, size, size);
  fCtx.strokeStyle = '#090c11';
  fCtx.lineWidth = 3;
  for (let i = 0; i <= size; i += 64) {
    fCtx.beginPath();
    fCtx.moveTo(i, 0);
    fCtx.lineTo(i, size);
    fCtx.moveTo(0, i);
    fCtx.lineTo(size, i);
    fCtx.stroke();
  }
  // Grime patches
  for (let i = 0; i < 45; i++) {
    fCtx.fillStyle = 'rgba(20, 32, 46, 0.35)';
    fCtx.fillRect((i * 47) % size, (i * 83) % size, 22, 18);
  }

  const [frCanvas, frCtx] = makeCanvas(size);
  // High roughness default, low roughness puddles (dark in roughnessMap = glossy wet puddle!)
  frCtx.fillStyle = '#b0b0b0';
  frCtx.fillRect(0, 0, size, size);
  frCtx.fillStyle = '#1c1c1c';
  frCtx.beginPath();
  frCtx.ellipse(90, 110, 56, 38, 0.3, 0, Math.PI * 2);
  frCtx.fill();
  frCtx.beginPath();
  frCtx.ellipse(195, 190, 44, 30, -0.4, 0, Math.PI * 2);
  frCtx.fill();

  // 4. Hazard Radioactive Acid / Warning Pattern
  const [hCanvas, hCtx] = makeCanvas(size);
  hCtx.fillStyle = '#193b1a';
  hCtx.fillRect(0, 0, size, size);
  hCtx.fillStyle = '#39ff14';
  for (let i = 0; i < 50; i++) {
    hCtx.globalAlpha = 0.25;
    hCtx.beginPath();
    hCtx.arc((i * 59) % size, (i * 101) % size, 6 + (i % 12), 0, Math.PI * 2);
    hCtx.fill();
  }
  hCtx.globalAlpha = 1;

  const portalableMap = configureTexture(pCanvas, true, aniso);
  const portalableRoughness = configureTexture(prCanvas, false, aniso);
  const corrodedMap = configureTexture(cCanvas, true, aniso);
  const corrodedRoughness = configureTexture(crCanvas, false, aniso);
  const wetFloorMap = configureTexture(fCanvas, true, aniso);
  const wetFloorRoughness = configureTexture(frCanvas, false, aniso);
  const hazardMap = configureTexture(hCanvas, true, aniso);

  return {
    portalableMap,
    portalableRoughness,
    corrodedMap,
    corrodedRoughness,
    wetFloorMap,
    wetFloorRoughness,
    hazardMap,
    dispose: () => {
      portalableMap.dispose();
      portalableRoughness.dispose();
      corrodedMap.dispose();
      corrodedRoughness.dispose();
      wetFloorMap.dispose();
      wetFloorRoughness.dispose();
      hazardMap.dispose();
    },
  };
}
