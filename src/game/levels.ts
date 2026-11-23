import { LevelDef } from './types';

export const LEVELS: LevelDef[] = [
  // =========================================================================
  // LEVEL 01 — REACTOR BREACH (Tutorial: Movement & Dual Portals)
  // =========================================================================
  {
    id: 1,
    code: '01',
    title: 'REACTOR BREACH',
    subtitle: 'PORTAL CALIBRATION CHAMBER',
    hint: 'Fire CYAN & AMBER portals onto clean concrete walls to cross the radioactive trench.',
    playerStart: [0, 0, 7.5],
    playerYaw: 0,
    blocks: [
      // South floor (start)
      { pos: [0, -0.5, 5.5], size: [12, 1, 9], kind: 'floor' },
      // Radioactive trench floor (recessed)
      { pos: [0, -1.7, -1.5], size: [12, 1, 5], kind: 'hazard' },
      // Trench lip walls (corroded)
      { pos: [0, -0.6, 1.1], size: [12, 1.2, 0.2], kind: 'corroded' },
      { pos: [0, -0.6, -4.1], size: [12, 1.2, 0.2], kind: 'corroded' },
      // North floor (exit)
      { pos: [0, -0.5, -9], size: [12, 1, 10], kind: 'floor' },
      // Outer shell walls
      { pos: [0, 3, 10.5], size: [13, 7, 1], kind: 'corroded' },
      { pos: [0, 3, -14.5], size: [13, 7, 1], kind: 'corroded' },
      { pos: [6.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [-6.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [0, 6.5, -2], size: [13, 1, 26], kind: 'corroded' },
      // Clean Portalable Concrete Panels (West wall, South & North)
      { pos: [-5.85, 2.3, 5.5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      { pos: [-5.85, 2.3, -8.5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
    ],
    cubes: [],
    buttons: [],
    laserEmitters: [],
    laserReceptors: [],
    exitDoor: {
      pos: [0, 0, -13.75],
      facing: 'S',
    },
    lights: [
      { pos: [0, 4.8, 6], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [0, 4.8, -1.5], color: 0x39ff14, intensity: 10, distance: 14 },
      { pos: [0, 4.8, -9.5], color: 0xff9100, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'barrel', pos: [4.5, 0, 8], color: 0x39ff14 },
      { type: 'barrel', pos: [4.8, 0, 6.9], color: 0x39ff14 },
      { type: 'pillar', pos: [5.5, 0, -5], color: 0xff007f },
      { type: 'pipe', pos: [5.4, 0, 2] },
    ],
  },

  // =========================================================================
  // LEVEL 02 — CONTAINMENT LOCK (Weighted Cube & Pressure Button)
  // =========================================================================
  {
    id: 2,
    code: '02',
    title: 'CONTAINMENT LOCK',
    subtitle: 'WEIGHTED SECURITY INTERLOCK',
    hint: 'Shoot a portal through the reinforced glass to retrieve the Weighted Cube for the floor switch.',
    playerStart: [-3.5, 0, 7.5],
    playerYaw: 0,
    blocks: [
      { pos: [0, -0.5, -2], size: [14, 1, 24], kind: 'floor' },
      // Outer walls
      { pos: [0, 3, 10.5], size: [15, 7, 1], kind: 'corroded' },
      { pos: [0, 3, -14.5], size: [15, 7, 1], kind: 'corroded' },
      { pos: [7.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [-7.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [0, 6.5, -2], size: [15, 1, 26], kind: 'corroded' },
      // Security divider at Z = 0 with central glass window
      { pos: [-5.2, 3, 0], size: [3.6, 6, 0.5], kind: 'corroded' },
      { pos: [5.2, 3, 0], size: [3.6, 6, 0.5], kind: 'corroded' },
      { pos: [0, 0.45, 0], size: [6.8, 0.9, 0.5], kind: 'corroded' },
      { pos: [0, 5.1, 0], size: [6.8, 1.8, 0.5], kind: 'corroded' },
      { pos: [0, 2.55, 0], size: [6.8, 3.3, 0.16], kind: 'glass' },
      // Portalable panels on West wall (South side & North side)
      { pos: [-6.85, 2.3, 5.2], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      { pos: [-6.85, 2.3, -6.5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      // Bonus portalable panel on North-East wall
      { pos: [6.85, 2.3, -6.5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
    ],
    cubes: [{ pos: [0, 0.4, -7.5] }],
    buttons: [{ id: 'btn1', pos: [3.8, 0, 5.2] }],
    laserEmitters: [],
    laserReceptors: [],
    exitDoor: {
      pos: [0, 0, -13.75],
      facing: 'S',
      requiresButtons: ['btn1'],
    },
    lights: [
      { pos: [-3, 4.8, 5.5], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [3.8, 4.2, 5.2], color: 0xff9100, intensity: 11, distance: 12 },
      { pos: [0, 4.8, -7.5], color: 0xff007f, intensity: 15, distance: 16 },
    ],
    props: [
      { type: 'barrel', pos: [5.6, 0, 8.2], color: 0xff9100 },
      { type: 'pillar', pos: [-5.8, 0, -11.5], color: 0x00f0ff },
      { type: 'pillar', pos: [5.8, 0, -11.5], color: 0x00f0ff },
    ],
  },

  // =========================================================================
  // LEVEL 03 — MOMENTUM FLING (Preserving Velocity Across Portals)
  // =========================================================================
  {
    id: 3,
    code: '03',
    title: 'MOMENTUM FLING',
    subtitle: 'KINETIC CONSERVATION SHAFT',
    hint: 'Place one portal on the pit floor and one on the elevated launch wall. Jump into the pit to fling across!',
    playerStart: [-4.2, 5.5, 6.5],
    playerYaw: 0,
    blocks: [
      // West starting balcony (Y = 5.5)
      { pos: [-4.2, 2.75, 5.5], size: [3.6, 5.5, 9], kind: 'corroded' },
      // Pit floor (portalable! Y = 0)
      { pos: [1.5, -0.5, 4.5], size: [8, 1, 7], kind: 'portalable' },
      // Radioactive chasm (Z: -6 to 1)
      { pos: [0, -1.8, -2.5], size: [12, 1, 7], kind: 'hazard' },
      { pos: [0, -0.6, 1.1], size: [12, 1.2, 0.2], kind: 'corroded' },
      { pos: [0, -0.6, -6.1], size: [12, 1.2, 0.2], kind: 'corroded' },
      // North exit platform (Y = 0)
      { pos: [0, -0.5, -10.5], size: [12, 1, 9], kind: 'floor' },
      // South launch wall facing North (-Z)
      { pos: [1.5, 5, 8.2], size: [7.6, 8, 0.5], kind: 'portalable' },
      // Outer shell
      { pos: [0, 5.5, 10.5], size: [13, 12, 1], kind: 'corroded' },
      { pos: [0, 5.5, -15.5], size: [13, 12, 1], kind: 'corroded' },
      { pos: [6.5, 5.5, -2.5], size: [1, 12, 27], kind: 'corroded' },
      { pos: [-6.5, 5.5, -2.5], size: [1, 12, 27], kind: 'corroded' },
      { pos: [0, 11.5, -2.5], size: [13, 1, 27], kind: 'corroded' },
      // Return portalable panel on North-East wall (in case player wants to peek)
      { pos: [5.85, 2.3, -10.5], size: [0.3, 4.4, 4.6], kind: 'portalable' },
    ],
    cubes: [],
    buttons: [],
    laserEmitters: [],
    laserReceptors: [],
    exitDoor: {
      pos: [0, 0, -14.75],
      facing: 'S',
    },
    lights: [
      { pos: [-4, 8.5, 6], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [1.5, 5.5, 4.5], color: 0xff9100, intensity: 16, distance: 18 },
      { pos: [0, 4.5, -10.5], color: 0x00f0ff, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'pipe', pos: [5.2, 0, 5] },
      { type: 'barrel', pos: [-4.5, 0, -12.5], color: 0x00f0ff },
    ],
  },

  // =========================================================================
  // LEVEL 04 — OPTIC RELAY (Laser Beam Redirection Through Portals)
  // =========================================================================
  {
    id: 4,
    code: '04',
    title: 'OPTIC RELAY',
    subtitle: 'HIGH-ENERGY LASER ROUTING',
    hint: 'Route the plasma laser through two portals to strike the Receptor dish and unlock the airlock.',
    playerStart: [0, 0, 7.5],
    playerYaw: 0,
    blocks: [
      { pos: [0, -0.5, -2], size: [14, 1, 24], kind: 'floor' },
      { pos: [0, 3, 10.5], size: [15, 7, 1], kind: 'corroded' },
      { pos: [0, 3, -14.5], size: [15, 7, 1], kind: 'corroded' },
      { pos: [7.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [-7.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [0, 6.5, -2], size: [15, 1, 26], kind: 'corroded' },
      // Central hazard pit so player uses walkways around sides
      { pos: [0, -1.2, -2], size: [4.5, 1, 8], kind: 'hazard' },
      // East portalable wall where laser strikes (at Y=1.6, Z=1)
      { pos: [6.85, 2.3, 1], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      // North portalable wall facing Receptor on South wall
      { pos: [-3.5, 2.3, -13.85], size: [5.2, 4.4, 0.3], kind: 'portalable' },
    ],
    cubes: [],
    buttons: [],
    laserEmitters: [{ id: 'las1', pos: [-6.95, 1.6, 1], dir: [1, 0, 0] }],
    laserReceptors: [{ id: 'rec1', pos: [-3.5, 1.6, 9.95], normal: [0, 0, -1] }],
    exitDoor: {
      pos: [3.5, 0, -13.75],
      facing: 'S',
      requiresReceptors: ['rec1'],
    },
    lights: [
      { pos: [-4, 4.5, 1], color: 0xff007f, intensity: 14, distance: 16 },
      { pos: [4, 4.5, 1], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [0, 4.5, -10], color: 0xff9100, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'pillar', pos: [-5.8, 0, -6], color: 0xff007f },
      { type: 'pillar', pos: [5.8, 0, -6], color: 0x00f0ff },
    ],
  },

  // =========================================================================
  // LEVEL 05 — DUAL CIRCUIT (Cube Button + Laser Receptor)
  // =========================================================================
  {
    id: 5,
    code: '05',
    title: 'DUAL CIRCUIT',
    subtitle: 'AUXILIARY POWER GRID',
    hint: 'Engage BOTH the Pressure Switch (with the Cube) and the Laser Receptor to open the vault.',
    playerStart: [0, 0, 8],
    playerYaw: 0,
    blocks: [
      { pos: [0, -0.5, -2], size: [16, 1, 24], kind: 'floor' },
      { pos: [0, 3, 10.5], size: [17, 7, 1], kind: 'corroded' },
      { pos: [0, 3, -14.5], size: [17, 7, 1], kind: 'corroded' },
      { pos: [8.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [-8.5, 3, -2], size: [1, 7, 26], kind: 'corroded' },
      { pos: [0, 6.5, -2], size: [17, 1, 26], kind: 'corroded' },
      // Elevated cube alcove on West side (Y = 3.2) — reachable via portals
      { pos: [-5.5, 1.6, -4], size: [5, 3.2, 6], kind: 'corroded' },
      // Portalable wall next to cube alcove (at Y = 3.2..6.0)
      { pos: [-7.85, 4.5, -4], size: [0.3, 3.2, 4.5], kind: 'portalable' },
      // Portalable wall on ground floor South-West
      { pos: [-7.85, 2.3, 5.5], size: [0.3, 4.4, 4.5], kind: 'portalable' },
      // Portalable wall where East laser strikes (Z = 0, Y = 1.6)
      { pos: [7.85, 2.3, 0], size: [0.3, 4.4, 5.0], kind: 'portalable' },
      // Portalable wall opposite Receptor (Receptor at (4.5, 1.6, 9.95))
      { pos: [4.5, 2.3, -13.85], size: [4.6, 4.4, 0.3], kind: 'portalable' },
    ],
    cubes: [{ pos: [-5.5, 3.6, -4] }],
    buttons: [{ id: 'btn1', pos: [-4, 0, -10.5] }],
    laserEmitters: [{ id: 'las1', pos: [-2.95, 1.6, 0], dir: [1, 0, 0] }],
    laserReceptors: [{ id: 'rec1', pos: [4.5, 1.6, 9.95], normal: [0, 0, -1] }],
    exitDoor: {
      pos: [0, 0, -13.75],
      facing: 'S',
      requiresButtons: ['btn1'],
      requiresReceptors: ['rec1'],
    },
    lights: [
      { pos: [-5, 5.4, -4], color: 0x00f0ff, intensity: 14, distance: 14 },
      { pos: [4.5, 4.5, 0], color: 0xff007f, intensity: 14, distance: 16 },
      { pos: [0, 4.5, -10.5], color: 0xff9100, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'barrel', pos: [6.4, 0, 7.5], color: 0xff9100 },
      { type: 'pipe', pos: [7.1, 0, -9] },
    ],
  },

  // =========================================================================
  // LEVEL 06 — VERTICAL SHAFT (Multi-Tier Portal Climbing)
  // =========================================================================
  {
    id: 6,
    code: '06',
    title: 'VERTICAL SHAFT',
    subtitle: 'COOLING TOWER ASCENT',
    hint: 'Climb the damaged cooling tower using staggered portal panels to recover the upper Weighted Cube.',
    playerStart: [0, 0, 6.5],
    playerYaw: 0,
    blocks: [
      { pos: [0, -0.5, 0], size: [14, 1, 18], kind: 'floor' },
      // Tall shaft walls (Y: 0 to 13)
      { pos: [0, 6, 9.5], size: [15, 13, 1], kind: 'corroded' },
      { pos: [0, 6, -9.5], size: [15, 13, 1], kind: 'corroded' },
      { pos: [7.5, 6, 0], size: [1, 13, 20], kind: 'corroded' },
      { pos: [-7.5, 6, 0], size: [1, 13, 20], kind: 'corroded' },
      { pos: [0, 12.5, 0], size: [15, 1, 20], kind: 'corroded' },
      // Mid-tier balcony (East, Y = 4.2)
      { pos: [4.2, 4.0, -2], size: [5.5, 0.4, 6], kind: 'corroded' },
      // Top-tier balcony with Cube (West, Y = 8.0)
      { pos: [-4.2, 7.8, -2], size: [5.5, 0.4, 6], kind: 'corroded' },
      // Ground portalable wall (South-West)
      { pos: [-6.85, 2.3, 4], size: [0.3, 4.2, 4.5], kind: 'portalable' },
      // Mid-tier portalable wall (East, at Y=4.2..8.2)
      { pos: [6.85, 6.2, -2], size: [0.3, 4.0, 4.5], kind: 'portalable' },
      // Top-tier portalable wall (West, at Y=8.0..11.8)
      { pos: [-6.85, 9.9, -2], size: [0.3, 3.8, 4.5], kind: 'portalable' },
    ],
    cubes: [{ pos: [-4.2, 8.4, -2] }],
    buttons: [{ id: 'btn1', pos: [-3.5, 0, -6] }],
    laserEmitters: [],
    laserReceptors: [],
    exitDoor: {
      pos: [0, 0, -8.75],
      facing: 'S',
      requiresButtons: ['btn1'],
    },
    lights: [
      { pos: [0, 3.5, 4], color: 0x00f0ff, intensity: 14, distance: 14 },
      { pos: [4, 7.2, -2], color: 0xff9100, intensity: 14, distance: 14 },
      { pos: [-4, 10.8, -2], color: 0xff007f, intensity: 15, distance: 14 },
    ],
    props: [
      { type: 'pillar', pos: [4.5, 0, 6], color: 0x00f0ff },
      { type: 'barrel', pos: [-5.5, 0, 7], color: 0x39ff14 },
    ],
  },

  // =========================================================================
  // LEVEL 07 — LASER BRIDGE (Combined Traversal & Beam Alignment)
  // =========================================================================
  {
    id: 7,
    code: '07',
    title: 'LASER BRIDGE',
    subtitle: 'FLOODED SUMP CONDUIT',
    hint: 'Cross the flooded reactor sump via portals, bring the Cube across, and align the laser beam.',
    playerStart: [-4, 0, 8],
    playerYaw: 0,
    blocks: [
      // South platform
      { pos: [0, -0.5, 6.5], size: [14, 1, 7], kind: 'floor' },
      // Wide radioactive sump
      { pos: [0, -1.8, -1], size: [14, 1, 8], kind: 'hazard' },
      { pos: [0, -0.6, 2.9], size: [14, 1.2, 0.2], kind: 'corroded' },
      { pos: [0, -0.6, -5.1], size: [14, 1.2, 0.2], kind: 'corroded' },
      // North platform
      { pos: [0, -0.5, -9.5], size: [14, 1, 9], kind: 'floor' },
      // Outer shell
      { pos: [0, 3.2, 10.5], size: [15, 7.5, 1], kind: 'corroded' },
      { pos: [0, 3.2, -14.5], size: [15, 7.5, 1], kind: 'corroded' },
      { pos: [7.5, 3.2, -2], size: [1, 7.5, 26], kind: 'corroded' },
      { pos: [-7.5, 3.2, -2], size: [1, 7.5, 26], kind: 'corroded' },
      { pos: [0, 7, -2], size: [15, 1, 26], kind: 'corroded' },
      // Portalable walls on West (South & North)
      { pos: [-6.85, 2.3, 6.5], size: [0.3, 4.4, 4.8], kind: 'portalable' },
      { pos: [-6.85, 2.3, -9], size: [0.3, 4.4, 4.8], kind: 'portalable' },
      // East portalable wall for laser bounce (at Z = 6.5)
      { pos: [6.85, 2.3, 6.5], size: [0.3, 4.4, 4.8], kind: 'portalable' },
      // North-East portalable wall facing Receptor on North-West? Wait: Receptor is on South-East!
      { pos: [3.5, 2.3, -13.85], size: [4.6, 4.4, 0.3], kind: 'portalable' },
    ],
    cubes: [{ pos: [4.2, 0.4, 7.5] }],
    buttons: [{ id: 'btn1', pos: [-4, 0, -10.5] }],
    laserEmitters: [{ id: 'las1', pos: [-6.95, 1.6, 6.5], dir: [1, 0, 0] }],
    laserReceptors: [{ id: 'rec1', pos: [3.5, 1.6, 9.95], normal: [0, 0, -1] }],
    exitDoor: {
      pos: [0, 0, -13.75],
      facing: 'S',
      requiresButtons: ['btn1'],
      requiresReceptors: ['rec1'],
    },
    lights: [
      { pos: [0, 4.8, 6.5], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [0, 4.8, -1], color: 0x39ff14, intensity: 11, distance: 15 },
      { pos: [0, 4.8, -9.5], color: 0xff9100, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'barrel', pos: [5.5, 0, -11.5], color: 0x39ff14 },
      { type: 'pillar', pos: [5.8, 0, -6.5], color: 0xff007f },
    ],
  },

  // =========================================================================
  // LEVEL 08 — CROSSFIRE CHAMBER (Glass Partition Portal Threading)
  // =========================================================================
  {
    id: 8,
    code: '08',
    title: 'CROSSFIRE CHAMBER',
    subtitle: 'ISOLATION WING B',
    hint: 'Portals and lasers pass through observation glass. Thread across the center partition!',
    playerStart: [-4, 0, 7.5],
    playerYaw: 0,
    blocks: [
      { pos: [0, -0.5, -1], size: [16, 1, 22], kind: 'floor' },
      { pos: [0, 3, 10.5], size: [17, 7, 1], kind: 'corroded' },
      { pos: [0, 3, -12.5], size: [17, 7, 1], kind: 'corroded' },
      { pos: [8.5, 3, -1], size: [1, 7, 24], kind: 'corroded' },
      { pos: [-8.5, 3, -1], size: [1, 7, 24], kind: 'corroded' },
      { pos: [0, 6.5, -1], size: [17, 1, 24], kind: 'corroded' },
      // Full-length center Glass Partition along X = 0
      { pos: [0, 0.35, -1], size: [0.3, 0.7, 22], kind: 'corroded' },
      { pos: [0, 5.2, -1], size: [0.3, 1.6, 22], kind: 'corroded' },
      { pos: [0, 2.55, -1], size: [0.15, 3.7, 22], kind: 'glass' },
      // West portalable wall (South) & East portalable wall (North)
      { pos: [-7.85, 2.3, 5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      { pos: [7.85, 2.3, -5], size: [0.3, 4.4, 5.2], kind: 'portalable' },
      // East portalable wall (South) where laser hits (at Z = 4)
      { pos: [7.85, 2.3, 4], size: [0.3, 4.4, 4.6], kind: 'portalable' },
      // West portalable wall (North) facing Receptor? No, Receptor is on West wall at (-7.95, 1.6, -6)
      // Wait: if Receptor is on East-North wall or North-West wall (-4, 1.6, -11.95), then portal on South-West (-4, 2.3, 9.85)!
      { pos: [-4, 2.3, 9.85], size: [4.6, 4.4, 0.3], kind: 'portalable' },
    ],
    cubes: [{ pos: [4.5, 0.4, 6.5] }],
    buttons: [{ id: 'btn1', pos: [4.5, 0, -9.5] }],
    laserEmitters: [{ id: 'las1', pos: [-7.95, 1.6, 4], dir: [1, 0, 0] }],
    laserReceptors: [{ id: 'rec1', pos: [-4, 1.6, -11.95], normal: [0, 0, 1] }],
    exitDoor: {
      pos: [4.5, 0, -11.75],
      facing: 'S',
      requiresButtons: ['btn1'],
      requiresReceptors: ['rec1'],
    },
    lights: [
      { pos: [-4.5, 4.8, 3], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [4.5, 4.8, 3], color: 0xff9100, intensity: 14, distance: 16 },
      { pos: [4.5, 4.8, -8], color: 0xff007f, intensity: 14, distance: 16 },
    ],
    props: [
      { type: 'barrel', pos: [-6.5, 0, -10], color: 0x00f0ff },
      { type: 'pipe', pos: [7.1, 0, 8] },
    ],
  },

  // =========================================================================
  // LEVEL 09 — CORE FLING (High-Velocity Cube Retrieval)
  // =========================================================================
  {
    id: 9,
    code: '09',
    title: 'CORE FLING',
    subtitle: 'AUXILIARY REACTOR WELL',
    hint: 'Fling across the chasm to the East platform, claim the Cube, and unlock the high bulkhead.',
    playerStart: [-4.5, 5.5, 7],
    playerYaw: 0,
    blocks: [
      // West starting ledge (Y = 5.5)
      { pos: [-4.5, 2.75, 6.5], size: [4, 5.5, 8], kind: 'corroded' },
      // Portalable pit floor (Y = 0)
      { pos: [1.5, -0.5, 5.5], size: [8, 1, 7], kind: 'portalable' },
      // Radioactive chasm
      { pos: [0, -1.8, -2], size: [14, 1, 8], kind: 'hazard' },
      { pos: [0, -0.6, 1.9], size: [14, 1.2, 0.2], kind: 'corroded' },
      { pos: [0, -0.6, -6.1], size: [14, 1.2, 0.2], kind: 'corroded' },
      // North landing platform (Y = 0)
      { pos: [0, -0.5, -10.5], size: [14, 1, 9], kind: 'floor' },
      // South launch wall facing North (-Z)
      { pos: [1.5, 5.2, 9.2], size: [8, 8.5, 0.5], kind: 'portalable' },
      // Outer shell
      { pos: [0, 5.5, 11.5], size: [15, 12, 1], kind: 'corroded' },
      { pos: [0, 5.5, -15.5], size: [15, 12, 1], kind: 'corroded' },
      { pos: [7.5, 5.5, -2], size: [1, 12, 28], kind: 'corroded' },
      { pos: [-7.5, 5.5, -2], size: [1, 12, 28], kind: 'corroded' },
      { pos: [0, 11.5, -2], size: [15, 1, 28], kind: 'corroded' },
      // Elevated North-East ledge holding Cube (Y = 3.6)
      { pos: [4.8, 1.8, -11.5], size: [4.4, 3.6, 5], kind: 'corroded' },
      // Portalable panels on North side to climb up to Cube ledge
      { pos: [6.85, 5.4, -11.5], size: [0.3, 3.8, 4.2], kind: 'portalable' },
      { pos: [-6.85, 2.3, -10.5], size: [0.3, 4.4, 4.8], kind: 'portalable' },
    ],
    cubes: [{ pos: [4.8, 4.0, -11.5] }],
    buttons: [{ id: 'btn1', pos: [-4, 0, -12] }],
    laserEmitters: [],
    laserReceptors: [],
    exitDoor: {
      pos: [0, 0, -14.75],
      facing: 'S',
      requiresButtons: ['btn1'],
    },
    lights: [
      { pos: [-4, 8.5, 6.5], color: 0x00f0ff, intensity: 14, distance: 16 },
      { pos: [1.5, 5.8, 5.5], color: 0xff9100, intensity: 16, distance: 18 },
      { pos: [0, 5.5, -11], color: 0xff007f, intensity: 15, distance: 16 },
    ],
    props: [
      { type: 'pillar', pos: [-5.8, 0, -7.5], color: 0x00f0ff },
      { type: 'barrel', pos: [1.5, 0, -8], color: 0x39ff14 },
    ],
  },

  // =========================================================================
  // LEVEL 10 — SECTOR 09 ESCAPE (Grand Finale Chamber)
  // =========================================================================
  {
    id: 10,
    code: '10',
    title: 'SECTOR 09 ESCAPE',
    subtitle: 'PRIMARY CONTAINMENT CORE',
    hint: 'Fling across the breached core, unlock the switch with the Cube, and route the final laser to escape!',
    playerStart: [-4.5, 5.5, 7.5],
    playerYaw: 0,
    blocks: [
      // Starting West balcony (Y = 5.5)
      { pos: [-4.5, 2.75, 7], size: [4.5, 5.5, 8], kind: 'corroded' },
      // Portalable pit floor (Y = 0)
      { pos: [1.5, -0.5, 5.5], size: [8.5, 1, 7], kind: 'portalable' },
      // Core radioactive chasm
      { pos: [0, -1.8, -2], size: [15, 1, 8], kind: 'hazard' },
      { pos: [0, -0.6, 1.9], size: [15, 1.2, 0.2], kind: 'corroded' },
      { pos: [0, -0.6, -6.1], size: [15, 1.2, 0.2], kind: 'corroded' },
      // North Extraction Platform (Y = 0)
      { pos: [0, -0.5, -11], size: [15, 1, 10], kind: 'floor' },
      // South launch wall facing North (-Z)
      { pos: [1.5, 5.4, 9.2], size: [8.5, 8.8, 0.5], kind: 'portalable' },
      // Outer shell
      { pos: [0, 5.8, 12], size: [16, 13, 1], kind: 'corroded' },
      { pos: [0, 5.8, -16.5], size: [16, 13, 1], kind: 'corroded' },
      { pos: [8, 5.8, -2.25], size: [1, 13, 29], kind: 'corroded' },
      { pos: [-8, 5.8, -2.25], size: [1, 13, 29], kind: 'corroded' },
      { pos: [0, 12.2, -2.25], size: [16, 1, 29], kind: 'corroded' },
      // Portalable wall on East-North where Laser strikes (Z = -9.5, Y = 1.6)
      { pos: [7.35, 2.3, -9.5], size: [0.3, 4.4, 3.2], kind: 'portalable' },
      // Portalable wall opposite Receptor (-7.45, 1.6, -13.5)
      { pos: [7.35, 2.3, -13.5], size: [0.3, 4.4, 3.2], kind: 'portalable' },
      // Also a portalable panel on West-North for quick cube access
      { pos: [-7.35, 2.3, -7.5], size: [0.3, 4.4, 3.2], kind: 'portalable' },
    ],
    cubes: [{ pos: [4.5, 0.4, -7.5] }],
    buttons: [{ id: 'btn1', pos: [-4, 0, -13] }],
    laserEmitters: [{ id: 'las1', pos: [-7.45, 1.6, -9.5], dir: [1, 0, 0] }],
    laserReceptors: [{ id: 'rec1', pos: [-7.45, 1.6, -13.5], normal: [1, 0, 0] }],
    exitDoor: {
      pos: [0, 0, -15.75],
      facing: 'S',
      requiresButtons: ['btn1'],
      requiresReceptors: ['rec1'],
    },
    lights: [
      { pos: [-4.5, 8.8, 7], color: 0x00f0ff, intensity: 15, distance: 18 },
      { pos: [1.5, 5.8, 5.5], color: 0xff9100, intensity: 16, distance: 18 },
      { pos: [0, 5.8, -11.5], color: 0xff007f, intensity: 16, distance: 20 },
    ],
    props: [
      { type: 'pillar', pos: [-5.5, 0, -14.8], color: 0x00f0ff },
      { type: 'pillar', pos: [5.5, 0, -14.8], color: 0x00f0ff },
      { type: 'barrel', pos: [5.6, 0, -11.8], color: 0x39ff14 },
      { type: 'pipe', pos: [-6.8, 0, 2] },
    ],
  },
];
